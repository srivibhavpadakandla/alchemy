import { afterEach, expect, it, vi } from "vitest";
import { Webhook } from "svix";
import {
  applyEmailWebhook,
  emailReceiptMatches,
  emailReceiptTransition,
  emailWebhookBody,
  emailWebhookConfigured,
  verifyEmailWebhook,
  EMAIL_WEBHOOK_MAX_BYTES,
  type EmailReceiptRecord,
  type EmailWebhookReceipt,
} from "../src/lib/trial-email-webhook";

const secret = `whsec_${Buffer.alloc(32, 7).toString("base64")}`;
const id = "11111111-1111-4111-8111-111111111111";
const key = `alchemy-email-${"a".repeat(48)}`;
function receipt(
  type: EmailWebhookReceipt["type"] = "email.delivered",
): EmailWebhookReceipt {
  return {
    type,
    created_at: new Date().toISOString(),
    data: {
      email_id: id,
      from: "Alchemy <sender@example.test>",
      to: ["owner@example.test"],
      tags: { alchemy_delivery: key },
    },
  };
}
function record(status = "accepted"): EmailReceiptRecord {
  return {
    key,
    provider_id: id,
    sender: "Alchemy <sender@example.test>",
    recipient: "owner@example.test",
    status,
    updated_at: new Date(0).toISOString(),
  };
}
function signed(raw = JSON.stringify(receipt()), timestamp = new Date()) {
  const headers = new Headers({
    "svix-id": "msg_fixture",
    "svix-timestamp": String(Math.floor(timestamp.getTime() / 1000)),
    "svix-signature": new Webhook(secret).sign("msg_fixture", timestamp, raw),
  });
  return { raw, headers };
}
afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});
it("validates a signed exact raw body before reading a delivery event", () => {
  const { raw, headers } = signed();
  expect(verifyEmailWebhook(raw, headers, secret)?.data.email_id).toBe(id);
  expect(() => verifyEmailWebhook(raw + " ", headers, secret)).toThrow(
    "signature",
  );
});
it("rejects missing, forged, wrong-secret and altered-message-ID signatures", () => {
  const { raw, headers } = signed();
  expect(() => verifyEmailWebhook(raw, new Headers(), secret)).toThrow(
    "signature",
  );
  const forged = new Headers(headers);
  forged.set("svix-signature", "v1,AAAAAAAA");
  expect(() => verifyEmailWebhook(raw, forged, secret)).toThrow("signature");
  expect(() =>
    verifyEmailWebhook(
      raw,
      headers,
      `whsec_${Buffer.alloc(32, 8).toString("base64")}`,
    ),
  ).toThrow("signature");
  const otherId = new Headers(headers);
  otherId.set("svix-id", "msg_other");
  expect(() => verifyEmailWebhook(raw, otherId, secret)).toThrow("signature");
});
it.each([-301, 301])(
  "rejects an otherwise genuine signature %s seconds outside the freshness window",
  (offset) => {
    const { raw, headers } = signed(
      undefined,
      new Date(Date.now() + offset * 1000),
    );
    expect(() => verifyEmailWebhook(raw, headers, secret)).toThrow("signature");
  },
);
it("requires a canonical numeric timestamp even when the SDK could parse its prefix", () => {
  const { raw, headers } = signed();
  headers.set("svix-timestamp", headers.get("svix-timestamp") + "junk");
  expect(() => verifyEmailWebhook(raw, headers, secret)).toThrow("signature");
});
it("ignores signed unrelated event types, but rejects malformed delivery envelopes", () => {
  const unsupported = signed(JSON.stringify({ type: "domain.created" }));
  expect(
    verifyEmailWebhook(unsupported.raw, unsupported.headers, secret),
  ).toBeNull();
  const malformed = signed(
    JSON.stringify({
      ...receipt(),
      data: {
        ...receipt().data,
        email_id: "not-a-provider-id",
      },
    }),
  );
  expect(() =>
    verifyEmailWebhook(malformed.raw, malformed.headers, secret),
  ).toThrow("event");
});
it("checks actual streamed body size, without trusting Content-Length", async () => {
  const req = new Request("https://alchemy.example/api/email-delivery", {
    method: "POST",
    body: "x".repeat(EMAIL_WEBHOOK_MAX_BYTES + 1),
  });
  await expect(emailWebhookBody(req)).rejects.toThrow("too large");
  const small = new Request("https://alchemy.example/api/email-delivery", {
    method: "POST",
    body: ' {"a": 1}\n',
  });
  expect(await emailWebhookBody(small)).toBe(' {"a": 1}\n');
});
it("requires provider ID, stored sender and exact single recipient to match", () => {
  expect(emailReceiptMatches(record(), receipt())).toBe(true);
  expect(
    emailReceiptMatches(record(), {
      ...receipt(),
      data: {
        ...receipt().data,
        to: ["owner@example.test", "other@example.test"],
      },
    }),
  ).toBe(false);
  for (const mismatch of [
    { provider_id: "22222222-2222-4222-8222-222222222222" },
    { sender: "different@example.test" },
    { recipient: "other@example.test" },
  ]) {
    expect(emailReceiptMatches({ ...record(), ...mismatch }, receipt())).toBe(
      false,
    );
    expect(() =>
      emailReceiptTransition({ ...record(), ...mismatch }, receipt()),
    ).toThrow("match");
  }
});
it("treats repeated and delayed delivery events idempotently and never regresses a terminal receipt", () => {
  expect(emailReceiptTransition(record(), receipt())?.status).toBe("delivered");
  expect(emailReceiptTransition(record("delivered"), receipt())).toBeNull();
  expect(
    emailReceiptTransition(record("delivered"), receipt("email.sent")),
  ).toBeNull();
  expect(emailReceiptTransition(record("failed"), receipt())).toBeNull();
  expect(emailReceiptTransition(record("cancelled"), receipt())).toBeNull();
  expect(
    emailReceiptTransition(record(), receipt("email.delivery_delayed")),
  ).toBeNull();
  expect(
    emailReceiptTransition(record("uncertain"), receipt("email.sent"))?.status,
  ).toBe("accepted");
});
it.each([
  "email.failed",
  "email.bounced",
  "email.complained",
  "email.suppressed",
] as const)(
  "preserves negative terminal evidence from %s even after a delivered event",
  (type) => {
    expect(
      emailReceiptTransition(record("delivered"), receipt(type)),
    ).toMatchObject({ status: "failed", retry_closed: true });
  },
);

function database(responses: Array<{ data: unknown; error: unknown }>) {
  const updates: unknown[] = [];
  const filters: Array<[string, unknown]> = [];
  const db = {
    from: vi.fn(() => {
      let updating = false;
      const query = {
        select: vi.fn(() =>
          updating ? Promise.resolve(responses.shift()) : query,
        ),
        eq: vi.fn((name: string, value: unknown) => {
          filters.push([name, value]);
          return query;
        }),
        limit: vi.fn(() => Promise.resolve(responses.shift())),
        maybeSingle: vi.fn(() => Promise.resolve(responses.shift())),
        update: vi.fn((change: unknown) => {
          updating = true;
          updates.push(change);
          return query;
        }),
      };
      return query;
    }),
  } as unknown as NonNullable<Parameters<typeof applyEmailWebhook>[1]>;
  return { db, updates, filters };
}
it("acknowledges foreign signed account messages without retrying or updating Alchemy", async () => {
  const foreign = receipt();
  delete foreign.data.tags;
  const { db, updates } = database([{ data: [], error: null }]);
  expect(await applyEmailWebhook(foreign, db)).toEqual({
    received: true,
    changed: false,
  });
  expect(updates).toEqual([]);
});
it("retries an early tagged Alchemy event without binding a provider ID from its tag", async () => {
  const { db, updates } = database([
    { data: [], error: null },
    {
      data: { ...record("pending"), provider_id: null, attempts: 1 },
      error: null,
    },
  ]);
  await expect(applyEmailWebhook(receipt(), db)).rejects.toThrow("not ready");
  expect(updates).toEqual([]);
});
it("ignores an unmatched tag that has no submitted matching candidate", async () => {
  const { db, updates } = database([
    { data: [], error: null },
    {
      data: { ...record("pending"), provider_id: null, attempts: 0 },
      error: null,
    },
  ]);
  expect((await applyEmailWebhook(receipt(), db)).changed).toBe(false);
  expect(updates).toEqual([]);
});
it("uses compare-and-swap so a concurrent delivered receipt remains terminal", async () => {
  const { db, updates, filters } = database([
    { data: [record()], error: null },
    { data: [], error: null },
    { data: [record("delivered")], error: null },
  ]);
  expect((await applyEmailWebhook(receipt(), db)).changed).toBe(false);
  expect(updates).toHaveLength(1);
  expect(filters).toContainEqual(["status", "accepted"]);
  expect(filters).toContainEqual(["provider_id", id]);
  expect(filters).toContainEqual(["updated_at", record().updated_at]);
});
it("returns retryable failures for database errors without exposing their diagnostics", async () => {
  const { db } = database([
    { data: null, error: { message: "private database details" } },
  ]);
  await expect(applyEmailWebhook(receipt(), db)).rejects.toThrow(
    "could not be stored",
  );
});
it("webhook mode depends only on the signing secret, not an account-read key", () => {
  vi.stubEnv("RESEND_API_KEY", "");
  vi.stubEnv("RESEND_WEBHOOK_SECRET", secret);
  expect(emailWebhookConfigured()).toBe(true);
  vi.stubEnv("RESEND_WEBHOOK_SECRET", "");
  expect(emailWebhookConfigured()).toBe(false);
});
