import { afterEach, expect, it, vi } from "vitest";
import { extractFacts, validateFacts } from "../src/lib/frontdesk-onboarding";
import { publicIPv4, websiteUrl } from "../src/lib/frontdesk-website";
import {
  blankBrief,
  readDraft,
  readBrief,
  usableOperationalFact,
} from "../src/components/video-inspired/brief";
const sources = [
  {
    id: "source-a",
    title: "Fictional service guide",
    content:
      "Example plumbing company. Business hours: Monday–Friday, 09:00–17:00. Do not book emergencies; escalate to the owner.",
  },
];
const output = {
  facts: [
    {
      field: "businessHours",
      value: "Monday–Friday, 09:00–17:00",
      sourceId: "source-a",
      quote: "Business hours: Monday–Friday, 09:00–17:00.",
    },
  ],
};
afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});
it("accepts exact scoped facts as drafts and preserves extracted value provenance", () => {
  const facts = validateFacts(output, sources);
  expect(facts[0]).toMatchObject({
    status: "draft",
    originalValue: output.facts[0].value,
  });
});
it("rejects a quote paraphrase, unknown source, duplicate field and injected action", () => {
  for (const fact of [
    { ...output.facts[0], quote: "Open Monday to Friday" },
    { ...output.facts[0], sourceId: "other-customer" },
    { ...output.facts[0], value: "Unsupported claimed fact", quote: "a" },
    { ...output.facts[0], value: "Unsupported claimed fact", quote: "company" },
  ])
    expect(() => validateFacts({ facts: [fact] }, sources)).toThrow(
      "No facts were accepted",
    );
  expect(() =>
    validateFacts({ facts: [output.facts[0], output.facts[0]] }, sources),
  ).toThrow("duplicate");
  expect(() =>
    validateFacts({ ...output, execute: "book a caller" }, sources),
  ).toThrow();
});
it("empty, non-JSON and malformed successful mock provider output fail readably", async () => {
  vi.stubEnv("OPENAI_API_KEY", "test-only");
  vi.stubEnv("OPENAI_MODEL_REASONING", "test-model");
  for (const text of ["", "not JSON"]) {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValue(
          Response.json({
            status: "completed",
            output: [{ content: [{ type: "output_text", text }] }],
          }),
        ),
    );
    await expect(
      extractFacts(sources, false, `invalid-output-${text}`),
    ).rejects.toThrow("empty or unreadable JSON");
  }
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("not JSON")));
  await expect(
    extractFacts(sources, false, "invalid-response"),
  ).rejects.toThrow("unreadable response");
});
it("mock-provider daily admissions are isolated per owner and program", async () => {
  vi.stubEnv("OPENAI_API_KEY", "test-only");
  vi.stubEnv("OPENAI_MODEL_REASONING", "test-model");
  vi.stubGlobal(
    "fetch",
    vi
      .fn()
      .mockImplementation(async () =>
        Response.json({
          status: "completed",
          output: [
            {
              content: [{ type: "output_text", text: JSON.stringify(output) }],
            },
          ],
        }),
      ),
  );
  for (let index = 0; index < 20; index++)
    await extractFacts(sources, false, "quota-owner:program-a");
  await expect(
    extractFacts(sources, false, "quota-owner:program-a"),
  ).rejects.toThrow("Daily extraction limit");
  await expect(
    extractFacts(sources, false, "other-owner:program-a"),
  ).resolves.toHaveProperty("facts");
  await expect(
    extractFacts(sources, false, "quota-owner:program-b"),
  ).resolves.toHaveProperty("facts");
});
it("missing hosted provider fails instead of producing mock business facts", async () => {
  vi.stubEnv("OPENAI_API_KEY", "");
  vi.stubEnv("OPENAI_MODEL_REASONING", "");
  vi.stubEnv("LOCAL_CODEX_ENABLED", "0");
  await expect(extractFacts(sources, false, "test-owner")).rejects.toThrow(
    "No model task ran",
  );
});
it("a mocked provider receives untrusted bounded input and returns validated draft receipt", async () => {
  vi.stubEnv("OPENAI_API_KEY", "test-only");
  vi.stubEnv("OPENAI_MODEL_REASONING", "test-model");
  const fetcher = vi.fn().mockResolvedValue(
    Response.json({
      status: "completed",
      id: "mock-request",
      usage: { total_tokens: 42 },
      output: [
        { content: [{ type: "output_text", text: JSON.stringify(output) }] },
      ],
    }),
  );
  vi.stubGlobal("fetch", fetcher);
  const result = await extractFacts(sources, false, "test-provider-owner");
  expect(result.facts[0].status).toBe("draft");
  expect(result.receipt.requestId).toBe("mock-request");
  const request = JSON.parse(fetcher.mock.calls[0][1].body);
  expect(request.instructions).toContain("untrusted data");
  expect(request.store).toBe(false);
  expect(request.tools).toBeUndefined();
});
it("draft knowledge retains missing fields while an operating brief needs verification details", () => {
  const draft = {
    ...blankBrief,
    trade: "Plumbing",
    facts: validateFacts(output, sources),
  };
  expect(readDraft(JSON.stringify(draft))?.facts[0].status).toBe("draft");
  expect(readBrief(JSON.stringify(draft))).toBeNull();
});
it("general booking purposes are preserved and descriptive durations require owner correction", () => {
  const value = {
    ...blankBrief,
    trade: "Plumbing",
    businessHours: "Monday–Friday",
    timeZone: "America/Los_Angeles",
    bookingPurpose: "Plumbing consultation",
  };
  expect(readBrief(JSON.stringify(value))?.bookingPurpose).toBe(
    "Plumbing consultation",
  );
  expect(
    usableOperationalFact({
      field: "bookingPurpose",
      value: "Plumbing consultation",
    }),
  ).toBe(true);
  expect(
    usableOperationalFact({
      field: "appointmentMinutes",
      value: "30 minutes for new customer consultations",
    }),
  ).toBe(false);
  for (const invalid of ["14", "121", "30.5", "", "not specified"])
    expect(
      usableOperationalFact({ field: "appointmentMinutes", value: invalid }),
    ).toBe(false);
  expect(
    usableOperationalFact({ field: "appointmentMinutes", value: "30" }),
  ).toBe(true);
  expect(
    usableOperationalFact({ field: "timeZone", value: "Local time" }),
  ).toBe(false);
});
it("website intake rejects private networks, credentials, insecure URLs and custom ports", () => {
  for (const ip of [
    "127.0.0.1",
    "10.1.2.3",
    "172.16.0.1",
    "192.168.1.1",
    "169.254.169.254",
    "100.64.0.1",
    "0.0.0.0",
    "224.0.0.1",
  ])
    expect(publicIPv4(ip)).toBe(false);
  expect(publicIPv4("8.8.8.8")).toBe(true);
  for (const url of [
    "http://example.com",
    "https://localhost",
    "https://127.0.0.1",
    "https://u:p@example.com",
    "https://example.com:8443",
    "https://server.internal",
  ])
    expect(() => websiteUrl(url)).toThrow();
});
