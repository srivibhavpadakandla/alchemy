import { Webhook } from "svix";
import { z } from "zod";
import { DomainError } from "./commands";
import { adminClient } from "./supabase/admin";

export const EMAIL_WEBHOOK_MAX_BYTES = 65536;
const envelope = z.object({ type: z.string().max(100) });
const receiptSchema = z.object({
  type: z.enum([
    "email.sent",
    "email.delivered",
    "email.bounced",
    "email.complained",
    "email.failed",
    "email.suppressed",
    "email.delivery_delayed",
  ]),
  created_at: z.iso.datetime({ offset: true }),
  data: z.object({
    email_id: z.string().uuid(),
    from: z.string().min(1).max(500),
    to: z.array(z.string().email().max(254)).min(1).max(50),
    tags: z.record(z.string(), z.string()).optional(),
  }),
});
export type EmailWebhookReceipt = z.infer<typeof receiptSchema>;
export type EmailReceiptRecord = {
  key: string;
  provider_id: string | null;
  sender: string;
  recipient: string;
  status: string;
  updated_at: string;
};

export function emailWebhookConfigured() {
  return !!process.env.RESEND_WEBHOOK_SECRET?.trim();
}

export async function emailWebhookBody(req: Request) {
  if (Number(req.headers.get("content-length")) > EMAIL_WEBHOOK_MAX_BYTES)
    throw new DomainError("Webhook body is too large.", 413);
  const reader = req.body?.getReader();
  if (!reader) throw new DomainError("Invalid webhook.", 400);
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > EMAIL_WEBHOOK_MAX_BYTES) {
        await reader.cancel();
        throw new DomainError("Webhook body is too large.", 413);
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(
      Buffer.concat(chunks),
    );
  } catch {
    throw new DomainError("Invalid webhook.", 400);
  }
}

export function verifyEmailWebhook(
  raw: string,
  headers: Headers,
  secret = process.env.RESEND_WEBHOOK_SECRET,
) {
  if (!secret || !/^whsec_[A-Za-z0-9+/=]+$/.test(secret))
    throw new DomainError("Webhook verification is not configured.", 503);
  if (Buffer.byteLength(raw) > EMAIL_WEBHOOK_MAX_BYTES)
    throw new DomainError("Webhook body is too large.", 413);
  if (
    !/^\d{1,12}$/.test(headers.get("svix-timestamp") || "") ||
    !(headers.get("svix-id") || "").length ||
    (headers.get("svix-id") || "").length > 200 ||
    (headers.get("svix-signature") || "").length > 2000
  )
    throw new DomainError("Invalid webhook signature.", 400);
  let verifier: Webhook;
  try {
    verifier = new Webhook(secret);
  } catch {
    throw new DomainError("Webhook verification is not configured.", 503);
  }
  let verified: unknown;
  try {
    // The SDK verifies the exact body and rejects timestamps outside its five-minute window.
    verifier.verify(raw, {
      "svix-id": headers.get("svix-id") || "",
      "svix-timestamp": headers.get("svix-timestamp") || "",
      "svix-signature": headers.get("svix-signature") || "",
    });
    verified = JSON.parse(raw);
  } catch {
    throw new DomainError("Invalid webhook signature.", 400);
  }
  const kind = envelope.safeParse(verified);
  if (!kind.success) throw new DomainError("Invalid webhook event.", 400);
  if (
    !receiptSchema.shape.type.options.includes(
      kind.data.type as EmailWebhookReceipt["type"],
    )
  )
    return null;
  const parsed = receiptSchema.safeParse(verified);
  if (!parsed.success) throw new DomainError("Invalid webhook event.", 400);
  return parsed.data;
}

function senderAddress(value: string) {
  const match = value.trim().match(/^(?:[^<>\r\n]*<)?([^<>\s]+@[^<>\s]+)>?$/);
  return match && z.string().email().safeParse(match[1]).success
    ? match[1].toLowerCase()
    : null;
}
export function emailReceiptMatches(
  record: EmailReceiptRecord,
  receipt: EmailWebhookReceipt,
) {
  const sender = senderAddress(record.sender);
  return (
    record.provider_id === receipt.data.email_id &&
    !!sender &&
    sender === senderAddress(receipt.data.from) &&
    receipt.data.to.length === 1 &&
    record.recipient.toLowerCase() === receipt.data.to[0].toLowerCase()
  );
}

export function emailReceiptTransition(
  record: EmailReceiptRecord,
  receipt: EmailWebhookReceipt,
) {
  if (!emailReceiptMatches(record, receipt))
    throw new DomainError("Webhook does not match the saved delivery.", 400);
  if (record.status === "cancelled" || record.status === "failed") return null;
  const failed = [
    "email.bounced",
    "email.complained",
    "email.failed",
    "email.suppressed",
  ].includes(receipt.type);
  // Negative terminal evidence wins, even if a delayed delivered/sent event arrives later.
  if (failed)
    return {
      status: "failed",
      error: `Provider receipt: ${receipt.type}.`,
      retry_closed: true,
    };
  if (receipt.type === "email.delivered" && record.status !== "delivered")
    return { status: "delivered", error: null, retry_closed: true };
  if (
    receipt.type === "email.sent" &&
    ["pending", "uncertain"].includes(record.status)
  )
    return { status: "accepted", error: null, retry_closed: true };
  return null;
}

export async function applyEmailWebhook(
  receipt: EmailWebhookReceipt,
  db = adminClient(),
) {
  for (let attempt = 0; attempt < 4; attempt++) {
    const { data, error } = await db
      .from("trial_email_deliveries")
      .select("key,provider_id,sender,recipient,status,updated_at")
      .eq("provider_id", receipt.data.email_id)
      .limit(2);
    if (error)
      throw new DomainError("Delivery receipt could not be stored.", 503);
    if (!data?.length) {
      const key = receipt.data.tags?.alchemy_delivery;
      if (!key || !/^alchemy-email-[a-f0-9]{48}$/.test(key))
        return { received: true, changed: false };
      const { data: candidate, error: lookup } = await db
        .from("trial_email_deliveries")
        .select("key,provider_id,sender,recipient,status,updated_at,attempts")
        .eq("key", key)
        .maybeSingle();
      if (lookup)
        throw new DomainError("Delivery receipt could not be stored.", 503);
      // Retry only a tagged, submitted Alchemy row whose send response has not yet been saved.
      // A tag alone never binds a provider ID or proves delivery.
      if (
        candidate &&
        !candidate.provider_id &&
        candidate.attempts > 0 &&
        ["pending", "uncertain"].includes(candidate.status) &&
        receipt.data.to.length === 1 &&
        senderAddress(candidate.sender) === senderAddress(receipt.data.from) &&
        senderAddress(candidate.sender) !== null &&
        candidate.recipient.toLowerCase() === receipt.data.to[0].toLowerCase()
      )
        throw new DomainError("Delivery receipt is not ready.", 503);
      return { received: true, changed: false };
    }
    if (data.length !== 1)
      throw new DomainError("Delivery receipt is ambiguous.", 503);
    const record = data[0] as EmailReceiptRecord;
    const transition = emailReceiptTransition(record, receipt);
    if (!transition) return { received: true, changed: false };
    const { data: changed, error: save } = await db
      .from("trial_email_deliveries")
      .update({ ...transition, updated_at: new Date().toISOString() })
      .eq("key", record.key)
      .eq("provider_id", receipt.data.email_id)
      .eq("sender", record.sender)
      .eq("recipient", record.recipient)
      .eq("status", record.status)
      .eq("updated_at", record.updated_at)
      .select("key");
    if (save)
      throw new DomainError("Delivery receipt could not be stored.", 503);
    if (changed?.length === 1) return { received: true, changed: true };
  }
  throw new DomainError("Delivery receipt changed concurrently; retry.", 503);
}
