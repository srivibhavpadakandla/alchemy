import { z } from "zod";
const id = z.string().min(1).max(100);
const text = z.string().max(20000);
const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
export const TrialPlanSchema = z.object({
  evaluationKind: z
    .enum(["pilot", "design partnership", "discovery"])
    .default("pilot"),
  workingProduct: z.enum(["yes", "no", "unknown"]).default("unknown"),
  buyer: z
    .object({
      champion: z.string().max(160),
      decisionOwner: z.string().max(160),
      decisionDate: z.string(),
      approvalBlockers: z.string().max(4000),
    })
    .default({
      champion: "Unknown",
      decisionOwner: "Unknown",
      decisionDate: "",
      approvalBlockers: "Unknown",
    }),
  id,
  trialId: id,
  partnerId: id,
  version: z.number().int().positive(),
  previousId: z.string(),
  needsSourceId: id,
  start: date,
  end: date,
  startupDeliverables: text.min(5),
  customerResponsibilities: text.min(5),
  metric: z.object({
    baselineStart: date.or(z.literal("")).default(""),
    baselineEnd: date.or(z.literal("")).default(""),
    name: text.min(1),
    baseline: z.number().finite().nullable(),
    target: z.number().finite(),
    unit: z.string().min(1).max(160),
    direction: z.enum(["higher", "lower"]),
    comparison: z.enum(["absolute", "relative change"]),
    periodDays: z.number().int().positive().max(366),
    exposure: z.string().min(1).max(300),
    method: text.min(5),
    baselineSourceId: z.string(),
  }),
  paidOffer: z.object({
    description: text.min(5),
    amountCents: z.number().int().nonnegative().max(1e12),
    currency: z.enum(["USD", "EUR", "GBP"]),
    cadence: z.enum(["monthly", "annual", "one-time"]),
    conditions: text.min(5),
  }),
  founderApprovalSourceId: z.string(),
  customerApprovalSourceId: z.string(),
  createdAt: z.string(),
});
export const TrialTaskSchema = z.object({
  id,
  trialId: id,
  partnerId: id,
  planVersion: z.number().int().positive(),
  version: z.number().int().positive(),
  title: text.min(1),
  owner: z.enum(["startup", "customer"]),
  assignee: z.string().min(1),
  due: date,
  status: z.enum(["planned", "working", "blocked", "done"]),
  blocker: text,
  completionSourceId: z.string(),
});
export const TrialMeasurementSchema = z.object({
  id,
  trialId: id,
  partnerId: id,
  planVersion: z.number().int().positive(),
  sourceId: id,
  value: z.number().finite(),
  unit: z.string().min(1),
  periodDays: z.number().int().positive(),
  exposure: z.string().min(1),
  measuredStart: date,
  measuredEnd: date,
  validUntil: date,
  health: z.enum(["reported", "stale", "uncertain"]),
  recordedAt: z.string(),
});
export const TrialDecisionSchema = z.object({
  id,
  trialId: id,
  partnerId: id,
  planVersion: z.number().int().positive(),
  sourceId: id,
  decision: z.enum([
    "continue paid",
    "extend trial",
    "decline",
    "undecided",
    "pause",
    "stop",
    "inconclusive",
  ]),
  reason: text.min(5),
  recordedAt: z.string(),
});
export const TrialEventSchema = z.object({
  id,
  trialId: id,
  partnerId: id,
  trigger: z.enum(["measurement.recorded", "plan.reviewed", "trial.ended"]),
  status: z.literal("succeeded"),
  actor: z.string(),
  at: z.string(),
  taskId: id,
  reportId: z.string(),
  summary: text,
});
export const TrialReportSchema = z.object({
  id,
  trialId: id,
  partnerId: id,
  planId: id,
  planVersion: z.number().int().positive(),
  inputHash: z.string(),
  sourceIds: z.array(id),
  status: z.string(),
  baseline: z.number().nullable(),
  value: z.number().nullable(),
  change: z.number().nullable(),
  targetMet: z.boolean(),
  gaps: z.array(z.string()),
  createdAt: z.string(),
  limits: text,
});
export type TrialPlan = z.infer<typeof TrialPlanSchema>;
export type TrialTask = z.infer<typeof TrialTaskSchema>;
export type TrialMeasurement = z.infer<typeof TrialMeasurementSchema>;
export type TrialDecision = z.infer<typeof TrialDecisionSchema>;
export function trialResult(
  plan: TrialPlan,
  measurements: TrialMeasurement[],
  now = new Date().toISOString().slice(0, 10),
) {
  const observation = measurements
    .filter((m) => m.trialId === plan.trialId && m.planVersion === plan.version)
    .sort((a, b) => b.recordedAt.localeCompare(a.recordedAt))
    .at(0);
  const reasons: string[] = [];
  if (!plan.founderApprovalSourceId || !plan.customerApprovalSourceId)
    reasons.push("Both sides have not reviewed this plan version.");
  if (plan.metric.baseline === null || !plan.metric.baselineSourceId)
    reasons.push("Baseline evidence is missing.");
  const baselineDays =
    (Date.parse(plan.metric.baselineEnd) -
      Date.parse(plan.metric.baselineStart)) /
      86400000 +
    1;
  if (
    !plan.metric.baselineStart ||
    !plan.metric.baselineEnd ||
    baselineDays !== plan.metric.periodDays
  )
    reasons.push("Baseline period is missing or not comparable.");
  if (plan.metric.baselineEnd >= plan.start)
    reasons.push("Baseline must precede the trial.");
  if (!observation) reasons.push("No measurement for this plan version.");
  else {
    if (observation.health !== "reported")
      reasons.push(`Measurement is ${observation.health}.`);
    if (observation.validUntil < now) reasons.push("Measurement is stale.");
    if (
      observation.unit !== plan.metric.unit ||
      observation.periodDays !== plan.metric.periodDays ||
      observation.exposure !== plan.metric.exposure
    )
      reasons.push("Units, period or exposure are not comparable.");
    if (
      observation.measuredStart < plan.start ||
      observation.measuredEnd > plan.end
    )
      reasons.push("Measurement lies outside the agreed trial.");
  }
  const baseline = plan.metric.baseline;
  const change =
    baseline !== null && baseline !== 0 && observation
      ? ((observation.value - baseline) / Math.abs(baseline)) * 100
      : null;
  if (plan.metric.comparison === "relative change" && change === null)
    reasons.push("A nonzero baseline is required for percentage change.");
  const comparisonValue =
    plan.metric.comparison === "relative change"
      ? change === null
        ? null
        : plan.metric.direction === "lower"
          ? -change
          : change
      : (observation?.value ?? null);
  const targetMet =
    !reasons.length &&
    comparisonValue !== null &&
    (plan.metric.comparison === "relative change" ||
    plan.metric.direction === "higher"
      ? comparisonValue >= plan.metric.target
      : comparisonValue <= plan.metric.target);
  return {
    observation,
    change: reasons.length ? null : change,
    comparisonValue: reasons.length ? null : comparisonValue,
    targetMet,
    reasons,
    status: reasons.length
      ? "Evidence incomplete"
      : targetMet
        ? "Reported target met"
        : "Reported target not met",
  };
}
