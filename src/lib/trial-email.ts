import { z } from "zod";
import { hash, State } from "./domain";
import { DomainError } from "./commands";
export const EmailRuleSchema = z.object({
  programId: z.string().min(1),
  partnerId: z.string().min(1),
  expectedVersion: z.number().int().positive(),
  enabled: z.boolean(),
  reviewed: z.literal(true),
  reviewDigest: z.string().max(100).optional(),
  recipients: z
    .array(z.string().email().max(254))
    .min(1)
    .max(5)
    .transform((a) => [...new Set(a.map((e) => e.toLowerCase()))]),
  triggers: z
    .array(
      z.enum([
        "kickoff",
        "task assignment",
        "due reminder",
        "missing measurement",
        "trial end",
      ]),
    )
    .min(1)
    .max(5),
  timeZone: z
    .string()
    .min(1)
    .max(100)
    .refine((zone) => {
      try {
        new Intl.DateTimeFormat("en-US", { timeZone: zone });
        return true;
      } catch {
        return false;
      }
    }, "Use a valid IANA time zone"),
  time: z.string().regex(/^(?:[01]\d|2[0-3]):[0-5]\d$/),
  subject: z
    .string()
    .min(1)
    .max(180)
    .refine((s) => !/[\r\n]/.test(s), "Subject must be one line"),
  template: z.string().min(10).max(4000),
});
export type EmailRule = z.infer<typeof EmailRuleSchema> & {
  id: string;
  plan_id: string;
  actor_id: string;
  version: number;
};
export type EmailCandidate = {
  event: string;
  recipient: string;
  subject: string;
  text: string;
  key: string;
  from?: string;
};
export function emailReviewDigest(
  state: State,
  rule: z.infer<typeof EmailRuleSchema>,
  planId: string,
) {
  const { reviewDigest: _digest, enabled: _enabled, ...settings } = rule;
  return hash({ settings, planId, programVersion: state.version });
}
export function emailTemplatePreviews(
  state: State,
  rule: z.infer<typeof EmailRuleSchema>,
) {
  const plan = state.trialPlans
    .filter((p) => p.partnerId === rule.partnerId)
    .at(-1);
  const customer = state.partners.find((p) => p.id === rule.partnerId);
  if (!plan || !customer) return [];
  const tasks = state.trialTasks.filter(
    (t) =>
      t.partnerId === rule.partnerId &&
      t.trialId === plan.trialId &&
      t.planVersion === plan.version &&
      t.owner === "customer" &&
      t.status !== "done",
  );
  const url = `${(process.env.APP_ORIGIN || "http://localhost:3210").replace(/\/$/, "")}/customer/${encodeURIComponent(state.id)}/${encodeURIComponent(customer.id)}`;
  return rule.triggers.map((trigger) => {
    const task =
      trigger === "kickoff"
        ? "Review the shared trial plan and arrange kickoff."
        : trigger === "trial end"
          ? "Review the sourced trial results together. Buying and payment decisions remain explicit."
          : trigger === "missing measurement"
            ? `Record the agreed ${plan.metric.name} measurement with its source.`
            : trigger === "due reminder"
              ? tasks.map((t) => `${t.title} (due ${t.due})`).join("\n")
              : tasks[0]?.title;
    const due =
      trigger === "kickoff"
        ? plan.start
        : trigger === "trial end"
          ? plan.end
          : tasks[0]?.due || plan.start;
    const render = (s: string) =>
      s
        .replaceAll("{{customer}}", customer.name)
        .replaceAll("{{trigger}}", trigger)
        .replaceAll(
          "{{task}}",
          task || "No open customer-owned task; this trigger is suppressed.",
        )
        .replaceAll("{{due}}", due)
        .replaceAll("{{reportUrl}}", url);
    return {
      trigger,
      subject: render(rule.subject)
        .replace(/[\r\n]+/g, " ")
        .slice(0, 180),
      text: render(rule.template),
    };
  });
}
export function emailConfigured() {
  return !!(process.env.RESEND_API_KEY && process.env.EMAIL_FROM);
}
export function emailRetryEligible(
  record: {
    status: string;
    attempts: number;
    created_at: string;
    updated_at: string;
    provider_id?: string | null;
    retry_closed?: boolean;
  },
  now = Date.now(),
) {
  return (
    ["pending", "uncertain"].includes(record.status) &&
    !record.retry_closed &&
    !record.provider_id &&
    record.attempts < 3 &&
    now - Date.parse(record.created_at) < 3600000 &&
    now - Date.parse(record.updated_at) >= 60000
  );
}
export function localSchedule(now: Date, zone: string) {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-CA", {
      timeZone: zone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    })
      .formatToParts(now)
      .map((p) => [p.type, p.value]),
  );
  return {
    day: `${parts.year}-${parts.month}-${parts.day}`,
    time: `${parts.hour}:${parts.minute}`,
  };
}
export function emailCandidates(
  state: State,
  rule: EmailRule,
  now = new Date(),
): EmailCandidate[] {
  const date = localSchedule(now, rule.timeZone),
    p = state.trialPlans.filter((p) => p.partnerId === rule.partnerId).at(-1),
    customer = state.partners.find((p) => p.id === rule.partnerId);
  if (
    !rule.enabled ||
    !p ||
    !customer ||
    p.id !== rule.plan_id ||
    !p.founderApprovalSourceId ||
    !p.customerApprovalSourceId ||
    date.time < rule.time
  )
    return [];
  const decision = state.trialDecisions
    .filter((d) => d.trialId === p.trialId && d.planVersion === p.version)
    .toSorted((a, b) => a.recordedAt.localeCompare(b.recordedAt))
    .at(-1);
  if (
    decision &&
    ["pause", "stop", "decline", "continue paid"].includes(decision.decision)
  )
    return [];
  const tasks = state.trialTasks.filter(
    (t) =>
      t.trialId === p.trialId &&
      t.planVersion === p.version &&
      t.partnerId === rule.partnerId &&
      t.owner === "customer" &&
      t.status !== "done",
  );
  const events: { id: string; task: string; due: string; trigger: string }[] =
    [];
  if (
    rule.triggers.includes("kickoff") &&
    p.start <= date.day &&
    date.day <= p.end
  )
    events.push({
      id: "kickoff",
      task: "Review the shared trial plan and arrange kickoff.",
      due: p.start,
      trigger: "kickoff",
    });
  if (rule.triggers.includes("task assignment") && date.day <= p.end)
    for (const t of tasks)
      events.push({
        id: `assignment-${t.id}`,
        task: t.title,
        due: t.due,
        trigger: "task assignment",
      });
  if (rule.triggers.includes("due reminder") && date.day <= p.end) {
    const due = tasks.filter((t) => t.due <= date.day);
    if (due.length)
      events.push({
        id: `due-${date.day}`,
        task: due.map((t) => `${t.title} (due ${t.due})`).join("\n"),
        due: date.day,
        trigger: "due reminder",
      });
  }
  const last = state.trialMeasurements
    .filter((m) => m.trialId === p.trialId && m.planVersion === p.version)
    .toSorted((a, b) => a.recordedAt.localeCompare(b.recordedAt))
    .at(-1);
  const daysSince =
    (Date.parse(date.day) -
      Date.parse(last?.recordedAt.slice(0, 10) || p.start)) /
    86400000;
  if (
    rule.triggers.includes("missing measurement") &&
    date.day <= p.end &&
    daysSince >= 7
  )
    events.push({
      id: `measurement-${Math.floor((Date.parse(date.day) - Date.parse(p.start)) / 604800000)}`,
      task: `Record the agreed ${p.metric.name} measurement with its source.`,
      due: date.day,
      trigger: "missing measurement",
    });
  if (rule.triggers.includes("trial end") && p.end <= date.day)
    events.push({
      id: "trial-end",
      task: "Review the sourced trial results together. Buying and payment decisions remain explicit.",
      due: p.end,
      trigger: "trial end",
    });
  const origin = process.env.APP_ORIGIN || "http://localhost:3210";
  const reportUrl = `${origin.replace(/\/$/, "")}/customer/${encodeURIComponent(state.id)}/${encodeURIComponent(customer.id)}`;
  const render = (s: string, e: (typeof events)[number]) =>
    s
      .replaceAll("{{customer}}", customer.name)
      .replaceAll("{{task}}", e.task)
      .replaceAll("{{due}}", e.due)
      .replaceAll("{{reportUrl}}", reportUrl)
      .replaceAll("{{trigger}}", e.trigger);
  return events.flatMap((e) =>
    rule.recipients.map((recipient) => ({
      event: e.id,
      recipient,
      subject: render(rule.subject, e)
        .replace(/[\r\n]+/g, " ")
        .slice(0, 180),
      text: render(rule.template, e),
      key: `alchemy-email-${hash([rule.id, p.id, e.id, recipient]).slice(0, 48)}`,
      from: process.env.EMAIL_FROM,
    })),
  );
}
export async function sendTrialEmail(c: EmailCandidate) {
  if (!emailConfigured())
    throw new DomainError("Email setup required. No message was sent.", 503);
  const r = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.RESEND_API_KEY!}`,
      "Content-Type": "application/json",
      "Idempotency-Key": c.key,
    },
    body: JSON.stringify({
      from: c.from ?? process.env.EMAIL_FROM!,
      to: [c.recipient],
      subject: c.subject,
      text: c.text,
      tags: [{ name: "alchemy_delivery", value: c.key }],
    }),
    signal: AbortSignal.timeout(15000),
    cache: "no-store",
  });
  if (!r.ok)
    throw new DomainError(
      `Email provider rejected request (${r.status}).`,
      r.status === 429 || r.status >= 500 ? 503 : 400,
    );
  const d = await r.json();
  if (typeof d.id !== "string" || !z.string().uuid().safeParse(d.id).success)
    throw Error(
      "Provider returned no valid email receipt. Outcome is uncertain.",
    );
  return { providerId: d.id, status: "accepted" };
}
export async function trialEmailDelivery(providerId: string) {
  z.string().uuid().parse(providerId);
  if (!emailConfigured()) throw new DomainError("Email setup required.", 503);
  const r = await fetch(`https://api.resend.com/emails/${providerId}`, {
    headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY!}` },
    signal: AbortSignal.timeout(15000),
    cache: "no-store",
  });
  if (!r.ok)
    throw new DomainError(`Email delivery lookup failed (${r.status}).`, 503);
  const b = await r.json();
  if (b.id !== providerId || typeof b.last_event !== "string")
    throw Error("Email delivery receipt could not be validated.");
  if (b.last_event === "delivered") return "delivered" as const;
  if (
    ["failed", "bounced", "complained", "suppressed", "canceled"].includes(
      b.last_event,
    )
  )
    return "failed" as const;
  return "accepted" as const;
}
