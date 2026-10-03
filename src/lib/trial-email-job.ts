import { inngest } from "./jobs";
import { adminClient } from "./supabase/admin";
import { readAsActor } from "./job-store";
import { DomainError } from "./commands";
import { emailWebhookConfigured } from "./trial-email-webhook";
import {
  EmailRule,
  EmailRuleSchema,
  emailCandidates,
  emailConfigured,
  sendTrialEmail,
  trialEmailDelivery,
  emailRetryEligible,
} from "./trial-email";
async function stopRevokedRule(ruleId: string) {
  const db = adminClient();
  const message =
    "Automation stopped because its author no longer has founder/editor access.";
  const { error } = await db
    .from("trial_email_rules")
    .update({ enabled: false, last_error: message })
    .eq("id", ruleId);
  if (error) throw error;
  const { error: cancel } = await db
    .from("trial_email_deliveries")
    .update({ status: "cancelled", error: message })
    .eq("rule_id", ruleId)
    .eq("attempts", 0)
    .eq("status", "pending");
  if (cancel) throw cancel;
}
export async function reconcileExpiredEmailRetries(now = Date.now()) {
  const db = adminClient();
  const { data: stalled, error: staleError } = await db
    .from("trial_email_deliveries")
    .select("*")
    .in("status", ["pending", "uncertain"])
    .eq("retry_closed", false)
    .order("created_at")
    .limit(100);
  if (staleError) throw staleError;
  let closed = 0;
  for (const record of stalled ?? []) {
    if (now - Date.parse(record.updated_at) < 60000) continue;
    if (record.attempts < 3 && now - Date.parse(record.created_at) < 3600000)
      continue;
    const { error } = await db
      .from("trial_email_deliveries")
      .update({
        status: record.attempts === 0 ? "cancelled" : "uncertain",
        retry_closed: true,
        error:
          record.attempts === 0
            ? "Unsubmitted queue expired; no email was sent."
            : "Retry window exhausted. Verify the provider outcome before any manual resend.",
        updated_at: new Date(now).toISOString(),
      })
      .eq("key", record.key)
      .in("status", ["pending", "uncertain"])
      .eq("retry_closed", false);
    if (error) throw error;
    closed++;
  }
  return closed;
}

export const trialEmailJob = inngest.createFunction(
  {
    id: "alchemy-trial-email",
    concurrency: 1,
    retries: 2,
    triggers: [{ cron: "*/15 * * * *" }],
  },
  async ({ step }) => {
    const rules = await step.run("review-active-email-rules", async () => {
      const { data, error } = await adminClient()
        .from("trial_email_rules")
        .select("*")
        .eq("enabled", true);
      if (error) throw error;
      return data ?? [];
    });
    await step.run("reconcile-provider-delivery-receipts", async () => {
      const db = adminClient();
      // Closed uncertain outcomes leave this queue; provider receipt reconciliation still runs separately.
      await reconcileExpiredEmailRetries();
      if (!emailConfigured() || emailWebhookConfigured()) return;
      const { data, error } = await db
        .from("trial_email_deliveries")
        .select("key,provider_id")
        .in("status", ["accepted", "uncertain"])
        .not("provider_id", "is", null)
        .order("updated_at")
        .limit(50);
      if (error) throw error;
      for (const record of data ?? []) {
        let status: "accepted" | "delivered" | "failed";
        try {
          status = await trialEmailDelivery(record.provider_id);
        } catch (e) {
          const { error: save } = await db
            .from("trial_email_deliveries")
            .update({
              error:
                e instanceof Error
                  ? e.message
                  : "Delivery could not be checked.",
              updated_at: new Date().toISOString(),
            })
            .eq("key", record.key);
          if (save) throw save;
          continue;
        }
        const { error: save } = await db
          .from("trial_email_deliveries")
          .update({ status, error: null, updated_at: new Date().toISOString() })
          .eq("key", record.key);
        if (save) throw save;
      }
    });
    let accepted = 0;
    for (const row of rules) {
      accepted += await step.run(`rule-${row.id}-${row.version}`, async () => {
        const db = adminClient();
        const rule = {
          ...EmailRuleSchema.parse(row.payload),
          id: row.id,
          plan_id: row.plan_id,
          actor_id: row.actor_id,
          version: row.version,
          enabled: row.enabled,
        } as EmailRule;
        let state;
        try {
          state = await readAsActor(row.program_id, row.actor_id);
        } catch (e) {
          if (!(e instanceof DomainError && e.status === 403)) throw e;
          await stopRevokedRule(row.id);
          return 0;
        }
        let submissions = 0,
          savedReceipts = 0;
        for (const c of emailCandidates(state, rule)) {
          if (submissions >= 25) break;
          const { data: old, error: read } = await db
            .from("trial_email_deliveries")
            .select("*")
            .eq("key", c.key)
            .maybeSingle();
          if (read) throw read;
          if (old && !emailRetryEligible(old)) continue;
          if (old && (old.body !== c.text || old.subject !== c.subject)) {
            const { error } = await db
              .from("trial_email_deliveries")
              .update({
                status: old.attempts ? "uncertain" : "cancelled",
                error:
                  "Reviewed message changed. Previous payload will not be replaced or resent.",
              })
              .eq("key", c.key)
              .in("status", ["pending", "uncertain"]);
            if (error) throw error;
            continue;
          }
          if (!old) {
            const { error } = await db.from("trial_email_deliveries").insert({
              key: c.key,
              rule_id: row.id,
              program_id: row.program_id,
              partner_id: row.partner_id,
              recipient: c.recipient,
              sender: c.from || "",
              subject: c.subject,
              body: c.text,
              event: c.event,
              status: "pending",
            });
            if (error?.code === "23505") continue;
            if (error) throw error;
          }
          const { data: current, error: currentError } = await db
            .from("trial_email_rules")
            .select("enabled,version")
            .eq("id", row.id)
            .single();
          if (currentError) throw currentError;
          let fresh;
          try {
            fresh = await readAsActor(row.program_id, row.actor_id);
          } catch (e) {
            if (!(e instanceof DomainError && e.status === 403)) throw e;
            await stopRevokedRule(row.id);
            return savedReceipts;
          }
          const stillDue =
            current.enabled &&
            current.version === row.version &&
            emailCandidates(fresh, rule).some(
              (n) =>
                n.key === c.key && n.text === c.text && n.subject === c.subject,
            );
          if (!stillDue || !emailConfigured()) {
            const { error } = await db
              .from("trial_email_deliveries")
              .update({
                status: old?.attempts ? "uncertain" : "cancelled",
                error: !stillDue
                  ? "Current trial state no longer requires this email."
                  : "Email provider configuration is missing; no new submission was made.",
              })
              .eq("key", c.key);
            if (error) throw error;
            continue;
          }
          const { data: claimed, error: claim } = await db
            .from("trial_email_deliveries")
            .update({
              status: "pending",
              attempts: (old?.attempts ?? 0) + 1,
              updated_at: new Date().toISOString(),
            })
            .eq("key", c.key)
            .eq("attempts", old?.attempts ?? 0)
            .in("status", ["pending", "uncertain"])
            .select("key");
          if (claim) throw claim;
          if (!claimed?.length) continue;
          submissions++;
          let result: Awaited<ReturnType<typeof sendTrialEmail>> | undefined;
          try {
            // Sender, recipient, subject and body stay fixed for the same provider key.
            result = await sendTrialEmail({
              ...c,
              from: old?.sender ?? c.from,
              text: old?.body ?? c.text,
              subject: old?.subject ?? c.subject,
            });
            const { error } = await db
              .from("trial_email_deliveries")
              .update({
                status: result.status,
                provider_id: result.providerId,
                error: null,
                updated_at: new Date().toISOString(),
              })
              .eq("key", c.key)
              .in("status", ["pending", "uncertain"]);
            if (error)
              throw Error(
                "Email was accepted but its receipt could not be saved. Reconcile before resending.",
              );
            savedReceipts++;
          } catch (e) {
            const { error } = await db
              .from("trial_email_deliveries")
              .update({
                status:
                  e instanceof DomainError && e.status === 400
                    ? "failed"
                    : "uncertain",
                ...(result ? { provider_id: result.providerId } : {}),
                error:
                  e instanceof Error ? e.message : "Email outcome uncertain.",
                updated_at: new Date().toISOString(),
              })
              .eq("key", c.key)
              .in("status", ["pending", "uncertain"]);
            if (error) throw error;
          }
        }
        return savedReceipts;
      });
    }
    return { accepted, deliveryVerified: false };
  },
);
