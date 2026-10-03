import { EventEmitter } from "node:events";
import { afterEach, beforeEach, expect, test, vi } from "vitest";

const network = vi.hoisted(() => ({
  lookup: vi.fn(),
  resolve4: vi.fn(),
  request: vi.fn(),
}));
vi.mock("node:dns/promises", () => ({
  lookup: network.lookup,
  resolve4: network.resolve4,
}));
vi.mock("node:https", () => ({ request: network.request }));
import {
  publicIPv4,
  readWebsite,
  websiteUrl,
} from "../src/lib/frontdesk-website";

beforeEach(() => {
  vi.stubEnv("ALCHEMY_RUNTIME", "cloudflare");
  network.resolve4.mockResolvedValue(["8.8.8.8"]);
  vi.stubGlobal("fetch", vi.fn());
});
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.resetAllMocks();
});

test.each([
  "http://example.com",
  "https://user:pass@example.com",
  "https://example.com:444/",
  "https://localhost",
  "https://company.local",
  "https://company.local./",
  "https://127.0.0.1",
  "https://0x7f000001/",
  "https://2130706433/",
  "https://[::1]/",
  "https://[::ffff:192.168.1.1]/",
])("rejects restricted website %s before DNS or fetch", async (url) => {
  expect(() => websiteUrl(url)).toThrow();
  await expect(readWebsite(url)).rejects.toThrow();
  expect(network.resolve4).not.toHaveBeenCalled();
  expect(fetch).not.toHaveBeenCalled();
});

test.each([
  "0.1.2.3",
  "10.1.2.3",
  "127.0.0.1",
  "100.64.0.1",
  "169.254.169.254",
  "172.16.0.1",
  "192.168.0.1",
  "198.18.0.1",
  "198.51.100.1",
  "203.0.113.1",
  "224.0.0.1",
  "255.255.255.255",
  "1..2.3",
  "0x8.8.8.8",
  "-1.2.3.4",
])("rejects restricted or malformed IPv4 %s", (address) => {
  expect(publicIPv4(address)).toBe(false);
});

test.each(
  [[], ["8.8.8.8", "127.0.0.1"], ["192.168.0.1"], ["::1"]].map((addresses) => ({
    addresses,
  })),
)(
  "rejects unsafe DNS answers $addresses without sending HTTP",
  async ({ addresses }) => {
    network.resolve4.mockResolvedValue(addresses);
    await expect(readWebsite("https://business.example/")).rejects.toThrow(
      "restricted network address",
    );
    expect(fetch).not.toHaveBeenCalled();
    expect(network.lookup).not.toHaveBeenCalled();
  },
);

test("uses Workers DNS and native fetch with no redirect or ambient credentials", async () => {
  vi.mocked(fetch).mockResolvedValue(
    new Response(
      "<h1>Cedar &amp; sons</h1><script>secret()</script><p>Open weekdays.</p>",
      { headers: { "Content-Type": "text/html; charset=utf-8" } },
    ),
  );
  const result = await readWebsite("https://business.example/about");
  expect(result.text).toBe("Cedar & sons Open weekdays.");
  expect(result.url).toBe("https://business.example/about");
  expect(result.excerpt).toBe(false);
  expect(network.resolve4).toHaveBeenCalledWith("business.example");
  expect(network.lookup).not.toHaveBeenCalled();
  expect(network.request).not.toHaveBeenCalled();
  expect(fetch).toHaveBeenCalledWith("https://business.example/about", {
    method: "GET",
    headers: {
      Accept: "text/html,text/plain",
      "User-Agent": "AlchemyWebsiteContext/1.0",
    },
    credentials: "omit",
    redirect: "error",
    signal: expect.any(AbortSignal),
  });
});

test("does not follow a redirect response", async () => {
  vi.mocked(fetch).mockResolvedValue(
    new Response(null, {
      status: 302,
      headers: { Location: "https://127.0.0.1/", "Content-Type": "text/html" },
    }),
  );
  await expect(readWebsite("https://business.example/")).rejects.toThrow(
    "Redirects are not followed",
  );
  expect(fetch).toHaveBeenCalledTimes(1);
});

test("rejects binary content", async () => {
  vi.mocked(fetch).mockResolvedValue(
    new Response("binary", {
      headers: { "Content-Type": "application/pdf" },
    }),
  );
  await expect(readWebsite("https://business.example/")).rejects.toThrow(
    "HTML or plain text",
  );
});

test("caps actual streamed bytes and cancels oversized body", async () => {
  const cancel = vi.fn();
  const body = new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(new Uint8Array(250_001));
    },
    cancel,
  });
  vi.mocked(fetch).mockResolvedValue(
    new Response(body, {
      headers: { "Content-Type": "text/plain", "Content-Length": "1" },
    }),
  );
  await expect(readWebsite("https://business.example/")).rejects.toThrow(
    "250 KB",
  );
  expect(cancel).toHaveBeenCalled();
});

test("accepts the limit and explicitly marks a 6000-character excerpt", async () => {
  vi.mocked(fetch).mockResolvedValue(
    new Response("a".repeat(250_000), {
      headers: { "Content-Type": "text/plain" },
    }),
  );
  const result = await readWebsite("https://business.example/");
  expect(result.text).toHaveLength(6000);
  expect(result.excerpt).toBe(true);
});

test("rejects pages with no readable content", async () => {
  vi.mocked(fetch).mockResolvedValue(
    new Response("<script>onlyJS()</script>", {
      headers: { "Content-Type": "text/html" },
    }),
  );
  await expect(readWebsite("https://business.example/")).rejects.toThrow(
    "No readable page text",
  );
});

test("includes unresolved DNS in the 10-second overall deadline", async () => {
  vi.useFakeTimers();
  let resolveDns!: (value: string[]) => void;
  network.resolve4.mockImplementation(
    () =>
      new Promise<string[]>((resolve) => {
        resolveDns = resolve;
      }),
  );
  const pending = readWebsite("https://business.example/");
  const rejected = expect(pending).rejects.toThrow("timed out");
  await vi.advanceTimersByTimeAsync(10000);
  await rejected;
  resolveDns(["8.8.8.8"]);
  await Promise.resolve();
  expect(fetch).not.toHaveBeenCalled();
});

test("aborts a stalled fetch at the overall deadline", async () => {
  vi.useFakeTimers();
  let signal: AbortSignal | undefined;
  vi.mocked(fetch).mockImplementation((_url, options) => {
    signal = options?.signal as AbortSignal;
    return new Promise(() => {});
  });
  const pending = readWebsite("https://business.example/");
  const rejected = expect(pending).rejects.toThrow("timed out");
  await vi.advanceTimersByTimeAsync(10000);
  await rejected;
  expect(signal?.aborted).toBe(true);
});

test("body streaming cannot extend the overall deadline", async () => {
  vi.useFakeTimers();
  const cancel = vi.fn();
  const body = new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(new TextEncoder().encode("First chunk"));
    },
    cancel,
  });
  vi.mocked(fetch).mockResolvedValue(
    new Response(body, {
      headers: { "Content-Type": "text/html" },
    }),
  );
  const pending = readWebsite("https://business.example/");
  const rejected = expect(pending).rejects.toThrow("timed out");
  await vi.advanceTimersByTimeAsync(10000);
  await rejected;
  expect(cancel).toHaveBeenCalled();
});

test("Node keeps the validated DNS address pinned to its HTTPS socket", async () => {
  vi.stubEnv("ALCHEMY_RUNTIME", "node");
  network.lookup.mockResolvedValue([{ address: "8.8.4.4", family: 4 }]);
  const req = Object.assign(new EventEmitter(), {
    end: vi.fn(),
    destroy: vi.fn(),
  });
  network.request.mockImplementation((_url, options, callback) => {
    const pinned = vi.fn();
    options.lookup("business.example", {}, pinned);
    expect(pinned).toHaveBeenCalledWith(null, "8.8.4.4", 4);
    const all = vi.fn();
    options.lookup("business.example", { all: true }, all);
    expect(all).toHaveBeenCalledWith(null, [{ address: "8.8.4.4", family: 4 }]);
    queueMicrotask(() => {
      const response = Object.assign(new EventEmitter(), {
        statusCode: 200,
        headers: { "content-type": "text/html" },
        destroy: vi.fn(),
      });
      callback(response);
      response.emit("data", Buffer.from("<p>Node website</p>"));
      response.emit("end");
    });
    return req;
  });
  expect((await readWebsite("https://business.example/")).text).toBe(
    "Node website",
  );
  expect(network.lookup).toHaveBeenCalledWith("business.example", {
    all: true,
    family: 4,
  });
  expect(network.resolve4).not.toHaveBeenCalled();
  expect(fetch).not.toHaveBeenCalled();
});

test("Node refuses mixed public/private DNS answers before opening a socket", async () => {
  vi.stubEnv("ALCHEMY_RUNTIME", "node");
  network.lookup.mockResolvedValue([
    { address: "8.8.4.4", family: 4 },
    { address: "169.254.169.254", family: 4 },
  ]);
  await expect(readWebsite("https://business.example/")).rejects.toThrow(
    "restricted network",
  );
  expect(network.request).not.toHaveBeenCalled();
});
