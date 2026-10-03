import { z } from "zod";
import { identity } from "@/lib/supabase/server";
import { adminClient } from "@/lib/supabase/admin";
import { apiError, checkOrigin, readBody, loadProgram } from "@/lib/repository";
import { DomainError } from "@/lib/commands";
import { hash } from "@/lib/domain";
import {
  EmailRuleSchema,
  emailConfigured,
  emailCandidates,
  EmailRule,
  emailReviewDigest,
  emailTemplatePreviews,
} from "@/lib/trial-email";
async function access(programId: string) {
  const { user, client } = await identity();
  const { data, error } = await client
    .from("memberships")
    .select("role")
    .eq("program_id", programId)
    .eq("user_id", user.id)
    .single();
  if (error || !data || !["owner", "editor"].includes(data.role))
    throw new DomainError("Founder/editor access required.", 403);
  return { user, client };
}
export async function GET(req: Request) {
  try {
    const p = new URL(req.url).searchParams,
      programId = p.get("programId") || "",
      partnerId = p.get("partnerId") || "";
    const { client } = await access(programId);
    const { data: rule, error } = await client
      .from("trial_email_rules")
      .select("*")
      .eq("program_id", programId)
      .eq("partner_id", partnerId)
      .maybeSingle();
    if (error) throw error;
    const { data: deliveries, error: history } = await client
      .from("trial_email_deliveries")
      .select(
        "key,recipient,subject,body,sender,event,status,attempts,provider_id,error,created_at,updated_at",
      )
      .eq("program_id", programId)
      .eq("partner_id", partnerId)
      .order("created_at", { ascending: false })
      .limit(50);
    if (history) throw history;
    return Response.json(
      {
        rule,
        deliveries,
        configured: emailConfigured(),
        schedulerConfigured: !!(
          process.env.INNGEST_EVENT_KEY && process.env.INNGEST_SIGNING_KEY
        ),
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (e) {
    return apiError(e);
  }
}
export async function POST(req: Request) {
  try {
    checkOrigin(req);
    const body = await readBody(req);
    const scope = z
      .object({ programId: z.string().min(1), partnerId: z.string().min(1) })
      .parse(body);
    const { user } = await access(scope.programId),
      db = adminClient();
    const id = `email-rule-${hash([scope.programId, scope.partnerId]).slice(0, 40)}`;
    if (body.action === "pause" || body.action === "cancel") {
      const { error } = await db
        .from("trial_email_rules")
        .update({ enabled: false })
        .eq("id", id);
      if (error) throw error;
      const { error: cancel } = await db
        .from("trial_email_deliveries")
        .update({
          status: "cancelled",
          error: "Automation paused before submission.",
        })
        .eq("rule_id", id)
        .eq("status", "pending")
        .eq("attempts", 0);
      if (cancel) throw cancel;
      return Response.json(
        { paused: true, enabled: false },
        { headers: { "Cache-Control": "no-store" } },
      );
    }
    const b = EmailRuleSchema.parse(body);
    new Intl.DateTimeFormat("en-US", { timeZone: b.timeZone });
    const { state } = await loadProgram(b.programId);
    if (state.mode !== "live")
      throw new DomainError(
        "Email automation requires real authenticated customer records.",
        403,
      );
    if (state.version !== b.expectedVersion)
      throw new DomainError(
        "Program changed; review the current email configuration again.",
        409,
      );
    const plan = state.trialPlans
      .filter((p) => p.partnerId === b.partnerId)
      .at(-1);
    if (
      !plan ||
      !plan.founderApprovalSourceId ||
      !plan.customerApprovalSourceId
    )
      throw new DomainError(
        "Both sides must review the current trial plan before automating emails.",
      );
    const reviewDigest = emailReviewDigest(state, b, plan.id);
    if (body.action === "preview")
      return Response.json(
        { reviewDigest, previews: emailTemplatePreviews(state, b) },
        { headers: { "Cache-Control": "no-store" } },
      );
    if (b.reviewDigest !== reviewDigest)
      throw new DomainError(
        "Review the current recipients and message previews before saving or enabling.",
        409,
      );
    if (
      b.enabled &&
      (!emailConfigured() ||
        !process.env.INNGEST_EVENT_KEY ||
        !process.env.INNGEST_SIGNING_KEY)
    )
      throw new DomainError(
        "Connect the email provider, verified sender and durable scheduler before enabling automation.",
        503,
      );
    const { data: old, error: oldError } = await db
      .from("trial_email_rules")
      .select("version")
      .eq("id", id)
      .maybeSingle();
    if (oldError) throw oldError;
    const record = {
      id,
      program_id: b.programId,
      partner_id: b.partnerId,
      plan_id: plan.id,
      actor_id: user.id,
      version: (old?.version ?? 0) + 1,
      enabled: b.enabled,
      last_error: null,
      payload: b,
      reviewed_at: new Date().toISOString(),
    };
    if (old) {
      const { data: updated, error } = await db
        .from("trial_email_rules")
        .update(record)
        .eq("id", id)
        .eq("version", old.version)
        .select("id");
      if (error) throw error;
      if (!updated?.length)
        throw new DomainError(
          "Email rule changed concurrently; reload and review it again.",
          409,
        );
    } else {
      const { error } = await db.from("trial_email_rules").insert(record);
      if (error?.code === "23505")
        throw new DomainError(
          "Email rule was created concurrently; reload and review it again.",
          409,
        );
      if (error) throw error;
    }
    const preview = emailCandidates(state, {
      ...b,
      id,
      plan_id: plan.id,
      actor_id: user.id,
      version: record.version,
      enabled: true,
    } as EmailRule);
    return Response.json(
      { saved: true, preview, enabled: b.enabled },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (e) {
    return apiError(e);
  }
}
