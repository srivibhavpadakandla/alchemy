import { lookup } from "node:dns/promises";
import { isIP } from "node:net";
import { request } from "node:https";
import { DomainError } from "./commands";

export function publicIPv4(address: string) {
  const p = address.split(".").map(Number);
  if (p.length !== 4 || p.some((n) => !Number.isInteger(n) || n < 0 || n > 255))
    return false;
  const [a, b] = p;
  return !(
    a === 0 ||
    a === 10 ||
    a === 127 ||
    a >= 224 ||
    (a === 100 && b >= 64 && b <= 127) ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && (b === 0 || b === 168)) ||
    (a === 198 && (b === 18 || b === 19 || b === 51)) ||
    (a === 203 && b === 0)
  );
}
export function websiteUrl(value: string) {
  const url = new URL(value);
  if (
    url.protocol !== "https:" ||
    url.username ||
    url.password ||
    (url.port && url.port !== "443") ||
    isIP(url.hostname) ||
    !url.hostname.includes(".") ||
    /\.(local|localhost|internal)$/i.test(url.hostname)
  )
    throw new DomainError(
      "Use a public HTTPS website without credentials or a custom port.",
    );
  return url;
}
export async function readWebsite(value: string) {
  const url = websiteUrl(value);
  const addresses = await lookup(url.hostname, { all: true, family: 4 });
  if (
    !addresses.length ||
    addresses.some((entry) => !publicIPv4(entry.address))
  )
    throw new DomainError(
      "This website resolves to a restricted network address.",
      403,
    );
  const address = addresses[0].address;
  const html = await new Promise<string>((resolve, reject) => {
    let deadline: ReturnType<typeof setTimeout> | undefined;
    const fail = (error: unknown) => {
      clearTimeout(deadline);
      reject(error);
    };
    const req = request(
      url,
      {
        method: "GET",
        headers: {
          Accept: "text/html,text/plain",
          "User-Agent": "AlchemyWebsiteContext/1.0",
        },
        lookup: ((
          _hostname: unknown,
          options: { all?: boolean },
          callback: (...args: unknown[]) => void,
        ) =>
          options.all
            ? callback(null, [{ address, family: 4 }])
            : callback(null, address, 4)) as never,
      },
      (res) => {
        if (res.statusCode !== 200) {
          res.destroy();
          fail(
            new DomainError(
              `Website returned ${res.statusCode}. Redirects are not followed; enter the final URL.`,
            ),
          );
          return;
        }
        if (
          !/^(text\/html|text\/plain)\b/i.test(
            String(res.headers["content-type"]),
          )
        ) {
          res.destroy();
          fail(new DomainError("Website must return HTML or plain text."));
          return;
        }
        const chunks: Buffer[] = [];
        let length = 0;
        res.on("data", (chunk: Buffer) => {
          length += chunk.length;
          if (length > 250_000) {
            res.destroy(
              new DomainError("Page exceeds the 250 KB context intake limit."),
            );
            return;
          }
          chunks.push(chunk);
        });
        res.on("error", fail);
        res.on("end", () => {
          clearTimeout(deadline);
          resolve(Buffer.concat(chunks).toString("utf8"));
        });
      },
    );
    deadline = setTimeout(
      () => req.destroy(new DomainError("Website request timed out.")),
      10000,
    );
    req.on("error", fail);
    req.end();
  });
  const text = html
    .replace(/<(script|style|noscript)\b[^>]*>[\s\S]*?<\/\1>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, " ")
    .trim();
  if (!text)
    throw new DomainError(
      "No readable page text found. Paste the business context instead.",
    );
  return {
    url: url.href,
    text: text.slice(0, 6000),
    excerpt: text.length > 6000,
    fetchedAt: new Date().toISOString(),
  };
}
