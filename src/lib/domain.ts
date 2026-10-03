import { z } from "zod";
import { sha256 } from "@noble/hashes/sha2.js";
import { bytesToHex } from "@noble/hashes/utils.js";

export const roles = [
  "Scout",
  "Diplomat",
  "Quartermaster",
  "Smith",
  "Treasurer",
] as const;
export const classes = [
  "unclassified",
  "core product",
  "reusable configuration",
  "one-customer customization",
  "integration",
  "support issue",
  "distraction",
] as const;
export const stages = [
  "prospect",
  "conversation",
  "proposal",
  "active pilot",
  "outcome achieved",
  "commercial decision",
  "customer",
  "stalled",
  "declined",
  "archived",
] as const;
const id = z.string().min(1).max(100);
const text = z.string().max(20000);
const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
export const SourceSchema = z.object({
  id,
  partnerId: id,
  version: z.number().int().positive(),
  kind: z.enum([
    "fixture",
    "reported note",
    "direct acknowledgment",
    "observed event",
    "billing receipt",
  ]),
  title: z.string().min(1).max(200),
  content: text,
  author: z.string().max(200),
  occurredAt: date,
  recordedAt: z.string(),
  hash: z.string(),
  scope: z.literal("program members"),
  quoteStart: z.number().int().nonnegative(),
  quoteEnd: z.number().int().nonnegative(),
});
export const CheckSchema = z.object({
  id,
  label: z.string(),
  group: z.enum(["product", "commercial"]),
  status: z.enum(["met", "blocked", "unknown", "stale", "not applicable"]),
  reason: text,
  sourceId: z.string(),
  reviewer: z.string(),
  reviewedAt: z.string(),
  version: z.number().int().positive(),
  critical: z.boolean(),
});
export const PartnerSchema = z.object({
  id,
  version: z.number().int().positive(),
  name: z.string().min(1).max(160),
  segment: z.string().max(300),
  origin: z.enum(["fixture", "manual", "import"]),
  owner: z.string().max(160),
  problem: text,
  workaround: text,
  fit: text,
  stage: z.enum(stages),
  opportunityCents: z.number().int().nonnegative().max(1e12),
  currency: z.enum(["USD", "EUR", "GBP"]),
  basis: z.enum(["annual", "monthly", "one-time"]),
  currentArrCents: z.number().int().nonnegative(),
  currentArrSourceId: z.string().default(""),
  requiredWork: z.array(id),
  optionalWork: z.array(id),
  people: z.array(
    z.object({ name: z.string(), role: z.string(), sourceId: z.string() }),
  ),
  checks: z.array(CheckSchema),
  nextAction: z.object({
    action: text,
    owner: z.string(),
    date,
    blockerId: z.string(),
  }),
  outcomeSourceId: z.string(),
  paymentSourceId: z.string(),
  customerSourceId: z.string().default(""),
  lockedFields: z.array(z.string()),
});
export const WorkSchema = z.object({
  id,
  version: z.number().int().positive(),
  title: z.string().min(1),
  classification: z.enum(classes),
  classificationState: z.enum(["proposed", "approved", "overridden"]),
  classificationReason: text,
  effort: z.number().nonnegative().nullable(),
  low: z.number().nonnegative().nullable(),
  high: z.number().nonnegative().nullable(),
  estimator: z.string(),
  estimateDate: date,
  scope: text,
  dependencies: z.array(id),
  excludes: z.array(id),
  partnerIds: z.array(id),
  sourceIds: z.array(id),
  acceptance: text,
  status: z.enum(["proposed", "queued", "delivered"]),
  deliverySourceId: z.string(),
});
export const RequestSchema = z.object({
  id,
  partnerId: id,
  sourceId: id,
  quote: text,
  workId: id,
  linkState: z.enum(["proposed", "confirmed"]),
  mustHave: z.boolean(),
  assertedBy: z.string(),
  version: z.number().int().positive(),
});
export const PromiseSchema = z.object({
  id,
  partnerId: id,
  wording: text,
  sourceId: id,
  actor: z.string(),
  recipient: z.string(),
  state: z.enum([
    "draft",
    "internally approved",
    "sent",
    "partner acknowledged",
    "mutually agreed",
    "reported agreement",
  ]),
  workId: z.string(),
  conditions: text,
  owner: z.string(),
  deadline: date,
  version: z.number().int().positive(),
});
export const AgreementSchema = z.object({
  id,
  partnerId: id,
  version: z.number().int().positive(),
  previousId: z.string(),
  state: z.enum([
    "draft",
    "internally approved",
    "sent",
    "partner acknowledged",
    "mutually agreed",
    "reported agreement",
  ]),
  scope: text,
  exclusions: text,
  start: date,
  end: date,
  reviewDate: date,
  startupDeliverables: text,
  partnerDeliverables: text,
  cadence: text,
  metric: text,
  baseline: z.number().nullable(),
  target: z.number().nullable(),
  unit: z.string(),
  method: text,
  window: text,
  priceTerms: text,
  conversionConditions: text,
  access: text,
  exit: text,
  sourceId: z.string(),
  effectiveAt: date,
});
export const ObservationSchema = z.object({
  id,
  partnerId: id,
  agreementId: id,
  sourceId: id,
  numerator: z.number(),
  denominator: z.number().positive(),
  period: z.string(),
  health: z.enum(["healthy", "stale", "unavailable"]),
  origin: z.enum(["fixture", "reported"]),
  recordedAt: z.string(),
});
export const CapacitySchema = z.object({
  period: z.string().min(1),
  total: z.number().nonnegative(),
  core: z.number().nonnegative(),
  support: z.number().nonnegative(),
  unit: z.literal("engineering points"),
  version: z.number().int().positive(),
});
export const ScenarioSchema = z.object({
  id,
  name: z.string().min(1),
  selected: z.array(id),
  inputHash: z.string(),
  createdAt: z.string(),
  assumptions: text,
  version: z.number().int().positive(),
});
export const DecisionSchema = z.object({
  id,
  key: id,
  selected: z.array(id),
  inputHash: z.string(),
  formula: z.string(),
  reason: text,
  exception: text,
  actor: z.string(),
  createdAt: z.string(),
  stale: z.boolean(),
  result: z.record(z.string(), z.unknown()),
  inputs: z.record(z.string(), z.unknown()),
});
export const RunSchema = z.object({
  id,
  role: z.enum(roles),
  status: z.enum([
    "queued",
    "working",
    "waiting",
    "needs-review",
    "complete",
    "failed",
    "cancelled",
    "quarantined",
  ]),
  inputVersion: z.number(),
  inputHash: z.string(),
  promptVersion: z.string(),
  model: z.string(),
  provider: z.string(),
  attempt: z.number(),
  createdAt: z.string(),
  updatedAt: z.string(),
  requestId: z.string(),
  output: z.unknown().nullable(),
  error: z.string(),
  receipts: z.array(
    z.object({
      tool: z.string(),
      sourceIds: z.array(z.string()),
      summary: z.string(),
      at: z.string(),
    }),
  ),
  tokens: z.number().nullable(),
});
export const ProposalSchema = z.object({
  id,
  entity: z.enum(["partner", "work"]),
  entityId: id,
  field: z.string(),
  before: z.unknown(),
  after: z.unknown(),
  expectedVersion: z.number(),
  reason: text,
  sourceIds: z.array(id),
  state: z.enum(["pending", "accepted", "declined", "conflict", "undone"]),
  createdAt: z.string(),
  version: z.number(),
});
export const ReviewSchema = z.object({
  id,
  claim: text,
  inputHash: z.string(),
  model: z.string(),
  requestId: z.string(),
  status: z.enum([
    "supported",
    "contradicted",
    "insufficient",
    "explicit assumption",
  ]),
  sourceIds: z.array(id),
  justification: text,
  createdAt: z.string(),
});
export const StateSchema = z.object({
  schema: z.literal("launchguild-v1"),
  id,
  mode: z.enum(["demo", "live"]),
  version: z.number().int().positive(),
  name: z.string(),
  demoStart: date,
  strategy: z.object({
    segment: text,
    boundary: text,
    deployment: text,
    version: z.number(),
  }),
  capacity: CapacitySchema,
  partners: z.array(PartnerSchema),
  work: z.array(WorkSchema),
  sources: z.array(SourceSchema),
  requests: z.array(RequestSchema),
  promises: z.array(PromiseSchema),
  agreements: z.array(AgreementSchema),
  observations: z.array(ObservationSchema),
  scenarios: z.array(ScenarioSchema),
  decisions: z.array(DecisionSchema),
  runs: z.array(RunSchema),
  proposals: z.array(ProposalSchema),
  reviews: z.array(ReviewSchema),
  history: z.array(
    z.object({
      id,
      at: z.string(),
      actor: z.string(),
      action: text,
      version: z.number(),
    }),
  ),
  appliedKeys: z.array(id),
});
export type State = z.infer<typeof StateSchema>;
export type Partner = z.infer<typeof PartnerSchema>;
export type Work = z.infer<typeof WorkSchema>;
export type Source = z.infer<typeof SourceSchema>;
export type Run = z.infer<typeof RunSchema>;
export type Role = (typeof roles)[number];
export const checkLabels = [
  "Target problem and partner fit",
  "Pilot scope, owners and dates",
  "Data, access and onboarding",
  "Baseline and success measure",
  "Observed agreed product outcome",
  "Champion and participation",
  "Economic buyer involved",
  "Price and paid terms acknowledged",
  "Security and procurement cleared",
  "Purchase decision and next action",
];
export function hash(value: unknown) {
  return (
    "sha256-" +
    bytesToHex(sha256(new TextEncoder().encode(JSON.stringify(value))))
  );
}
export function inputHash(s: State) {
  return hash({
    strategy: s.strategy,
    capacity: s.capacity,
    partners: s.partners,
    work: s.work,
    requests: s.requests,
    agreements: s.agreements,
    sources: s.sources,
    observations: s.observations,
  });
}
export const money = (cents: number | null, currency = "USD") =>
  cents === null
    ? "Unavailable"
    : new Intl.NumberFormat("en-US", {
        style: "currency",
        currency,
        maximumFractionDigits: 0,
      }).format(cents / 100);
export function readiness(p: Partner) {
  const applicable = p.checks.filter((c) => c.status !== "not applicable");
  const met = applicable.filter((c) => c.status === "met").length;
  const critical = applicable.filter((c) => c.critical && c.status !== "met");
  return {
    met,
    total: applicable.length,
    percent: applicable.length ? (met / applicable.length) * 100 : null,
    blocked: applicable.filter((c) => c.status === "blocked").length,
    unknown: applicable.filter(
      (c) => c.status === "unknown" || c.status === "stale",
    ).length,
    critical,
    ready:
      applicable.length > 0 &&
      met === applicable.length &&
      critical.length === 0,
  };
}
export function calculate(s: State, selected: string[]) {
  const closure = new Set<string>();
  const visiting = new Set<string>();
  const errors: string[] = [];
  function visit(id: string) {
    if (visiting.has(id)) {
      errors.push(`Dependency cycle at ${id}`);
      return;
    }
    if (closure.has(id)) return;
    const w = s.work.find((w) => w.id === id);
    if (!w) {
      errors.push(`Missing work: ${id}`);
      return;
    }
    visiting.add(id);
    w.dependencies.forEach(visit);
    visiting.delete(id);
    closure.add(id);
  }
  selected.forEach(visit);
  const items = s.work.filter((w) => closure.has(w.id));
  items.forEach((w) =>
    w.excludes.forEach((x) => {
      if (closure.has(x)) errors.push(`${w.title} conflicts with ${x}`);
    }),
  );
  const unknown = items.some((w) => w.effort === null);
  const effort = unknown
    ? null
    : items.reduce((n, w) => n + (w.effort ?? 0), 0);
  const range = (field: "low" | "high") =>
    items.some((w) => w[field] === null)
      ? null
      : items.reduce((n, w) => n + (w[field] ?? 0), 0);
  const partners = s.partners.filter((p) =>
    items.some((w) => w.partnerIds.includes(p.id)),
  );
  const compatible = partners.every(
    (p) => p.currency === "USD" && p.basis === "annual",
  );
  if (!compatible)
    errors.push(
      "Mixed currency or value basis: associated totals unavailable.",
    );
  const value = compatible
    ? partners.reduce((n, p) => n + p.opportunityCents, 0)
    : null;
  const reserved = s.capacity.core + s.capacity.support;
  const discretionary = s.capacity.total - reserved;
  const productGates = partners.map((p) => ({
    partnerId: p.id,
    addressed: p.requiredWork.filter((w) => closure.has(w)),
    missing: p.requiredWork.filter((w) => !closure.has(w)),
    commercial: p.checks
      .filter(
        (c) =>
          c.group === "commercial" &&
          c.status !== "met" &&
          c.status !== "not applicable",
      )
      .map((c) => c.label),
  }));
  // Delivery and acceptance are deliberately not assumed by a selection.
  const unblocked = partners.filter(
    (p) =>
      p.requiredWork.every((id) => {
        const w = s.work.find((w) => w.id === id);
        return w?.status === "delivered";
      }) && readiness(p).ready,
  );
  const current = s.partners.filter((p) => p.currentArrCents > 0);
  const currentCompatible = current.every((p) => p.currency === "USD");
  const arr = currentCompatible
    ? current.reduce((n, p) => n + p.currentArrCents, 0)
    : null;
  const projected =
    compatible && arr !== null
      ? arr +
        partners
          .filter((p) => !p.currentArrCents)
          .reduce((n, p) => n + p.opportunityCents, 0)
      : null;
  const projectedAmounts = [
    ...current.map((p) => p.currentArrCents),
    ...partners
      .filter((p) => !p.currentArrCents)
      .map((p) => p.opportunityCents),
  ];
  return {
    formula: "capacity-v1.0",
    selected: [...closure],
    effort,
    low: range("low"),
    high: range("high"),
    reserved,
    discretionary,
    total: effort === null ? null : effort + reserved,
    remaining: effort === null ? null : s.capacity.total - reserved - effort,
    partnerIds: partners.map((p) => p.id),
    value,
    unblockedValue: compatible
      ? unblocked.reduce((n, p) => n + p.opportunityCents, 0)
      : null,
    productGates,
    totalShare:
      effort !== null && s.capacity.total > 0
        ? effort / s.capacity.total
        : null,
    discretionaryShare:
      effort !== null && discretionary > 0 ? effort / discretionary : null,
    currentArr: arr,
    currentConcentration: arr
      ? Math.max(...current.map((p) => p.currentArrCents)) / arr
      : null,
    projectedTotal: projected,
    projectedConcentration: projected
      ? Math.max(...projectedAmounts) / projected
      : null,
    errors,
    unknown,
  };
}
export function emptyState(
  mode: "demo" | "live" = "live",
  id = "program",
): State {
  return {
    schema: "launchguild-v1",
    id,
    mode,
    version: 1,
    name: mode === "demo" ? "RelayOps" : "My partner program",
    demoStart: "2026-10-03",
    strategy: {
      segment: "Small and mid-sized operations teams",
      boundary: "One-off enterprise workflows require founder review",
      deployment: "Managed cloud; no on-premises support",
      version: 1,
    },
    capacity: {
      period: "October 2026",
      total: 100,
      core: 35,
      support: 15,
      unit: "engineering points",
      version: 1,
    },
    partners: [],
    work: [],
    sources: [],
    requests: [],
    promises: [],
    agreements: [],
    observations: [],
    scenarios: [],
    decisions: [],
    runs: [],
    proposals: [],
    reviews: [],
    history: [],
    appliedKeys: [],
  };
}
export function newPartner(
  id: string,
  name: string,
  origin: Partner["origin"] = "manual",
): Partner {
  return {
    id,
    version: 1,
    name,
    origin,
    segment: "",
    owner: "Founder",
    problem: "",
    workaround: "",
    fit: "Unconfirmed",
    stage: "prospect",
    opportunityCents: 0,
    currency: "USD",
    basis: "annual",
    currentArrCents: 0,
    currentArrSourceId: "",
    requiredWork: [],
    optionalWork: [],
    people: [],
    checks: checkLabels.map((label, i) => ({
      id: `check-${i}`,
      label,
      group: i < 6 ? "product" : "commercial",
      status: "unknown",
      reason: "Evidence not yet recorded",
      sourceId: "",
      reviewer: "",
      reviewedAt: "",
      version: 1,
      critical: [1, 4, 6, 7, 8, 9].includes(i),
    })),
    nextAction: {
      action: "Confirm target problem and pilot scope",
      owner: "Founder",
      date: "2026-10-10",
      blockerId: "check-0",
    },
    outcomeSourceId: "",
    paymentSourceId: "",
    customerSourceId: "",
    lockedFields: [],
  };
}
export function seed(): State {
  const s = emptyState("demo", "demo");
  const names = [
    "Northstar Logistics",
    "Juniper Operations",
    "Kite Enterprise",
  ];
  const ids = ["northstar", "juniper", "kite"];
  const notes = [
    "Our pilot's required product capability is the scoped Salesforce integration. The USD 30,000 annual opportunity remains hypothetical and the buyer, pricing and security conditions are unconfirmed.",
    "We require the same scoped Salesforce integration. Bulk CSV import is a requested optional improvement, not a separate purchase. Our hypothetical annual opportunity is USD 8,000; commercial conditions are unconfirmed.",
    "The pilot requests a one-off approval workflow specific to our operations. The hypothetical annual opportunity is USD 50,000. Wider reuse, commercial conditions and long-term support requirements remain unconfirmed.",
  ];
  s.sources = notes.map((content, i) => ({
    id: `${ids[i]}-note-1`,
    partnerId: ids[i],
    version: 1,
    kind: "fixture",
    title: "Discovery notes · fictional",
    content,
    author: "Fictional partner team",
    occurredAt: "2026-10-03",
    recordedAt: "2026-10-03T12:00:00Z",
    hash: hash(content),
    scope: "program members",
    quoteStart: 0,
    quoteEnd: content.length,
  }));
  const content =
    "We will evaluate your custom approval request and return a scoped plan. No delivery date or feature commitment has been agreed.";
  s.sources.push({
    ...s.sources[2],
    id: "kite-conversation-2",
    title: "Scope conversation · fictional",
    content,
    hash: hash(content),
    quoteEnd: content.length,
  });
  s.partners = ids.map((id, i) => ({
    ...newPartner(id, names[i], "fixture"),
    stage: "active pilot",
    segment: i === 2 ? "Enterprise operations" : "Mid-market operations",
    problem:
      i === 2
        ? "Rigid global approval process needs a dedicated workflow."
        : "Customer operations must stay in sync with Salesforce.",
    workaround: "Manual handoffs and spreadsheets",
    fit:
      i === 2
        ? "Adjacent segment; custom support burden remains unknown"
        : "Aligned with the current target segment",
    opportunityCents: [3000000, 800000, 5000000][i],
    requiredWork: [i === 2 ? "custom_approval" : "salesforce"],
    optionalWork: i === 1 ? ["csv"] : [],
    people: [
      {
        name: ["Alex · fictional", "Sam · fictional", "Morgan · fictional"][i],
        role: "Champion",
        sourceId: `${id}-note-1`,
      },
    ],
    nextAction: {
      action:
        i === 2
          ? "Clarify scope; identify economic buyer"
          : "Introduce the economic buyer and confirm paid terms",
      owner: "Founder",
      date: "2026-11-02",
      blockerId: "check-6",
    },
  }));
  s.work = [
    {
      id: "salesforce",
      title: "Shared Salesforce integration",
      classification: "integration",
      effort: 20,
      low: 16,
      high: 26,
      partnerIds: ["northstar", "juniper"],
      sourceIds: ["northstar-note-1", "juniper-note-1"],
      scope:
        "One shared implementation; includes the two known fixture account setups.",
    },
    {
      id: "csv",
      title: "Bulk CSV import",
      classification: "core product",
      effort: 8,
      low: 6,
      high: 12,
      partnerIds: ["juniper"],
      sourceIds: ["juniper-note-1"],
      scope:
        "Optional import improvement. Does not create another Juniper deal.",
    },
    {
      id: "custom_approval",
      title: "Custom approval workflow",
      classification: "one-customer customization",
      effort: 46,
      low: 40,
      high: 60,
      partnerIds: ["kite"],
      sourceIds: ["kite-note-1"],
      scope:
        "Dedicated approval flow. Portability and ongoing support are unconfirmed.",
    },
  ].map((w) => ({
    ...w,
    classification: w.classification as Work["classification"],
    version: 1,
    classificationState: "proposed",
    classificationReason:
      "Seed assessment; awaiting founder review. No AI run has occurred.",
    estimator: "Fictional team estimate",
    estimateDate: "2026-10-03",
    dependencies: [],
    excludes: [],
    acceptance:
      "Scoped capability delivered and explicitly accepted; commercial gates remain separate.",
    status: "proposed",
    deliverySourceId: "",
  }));
  s.requests = s.work.flatMap((w) =>
    w.partnerIds.map((pid) => ({
      id: `${pid}-${w.id}`,
      partnerId: pid,
      sourceId: `${pid}-note-1`,
      quote: s.sources.find((x) => x.id === `${pid}-note-1`)!.content,
      workId: w.id,
      linkState: "confirmed",
      mustHave: w.id !== "csv",
      assertedBy: "Fictional supplied note; seeded confirmed link",
      version: 1,
    })),
  );
  s.agreements.push({
    id: "northstar-pilot-v1",
    partnerId: "northstar",
    version: 1,
    previousId: "",
    state: "reported agreement",
    scope:
      "Evaluate RelayOps workflow completion with the scoped Salesforce requirement separate.",
    exclusions: "No on-premises deployment or custom approval engine.",
    start: "2026-10-03",
    end: "2026-11-02",
    reviewDate: "2026-11-02",
    startupDeliverables: "Pilot support and review of scoped integration",
    partnerDeliverables:
      "Supply synthetic test data and attend weekly feedback",
    cadence: "Weekly, 30 minutes",
    metric: "Workflow completion rate",
    baseline: 0.7,
    target: 0.95,
    unit: "fraction",
    method: "Completed workflows / attempted workflows",
    window: "Demo days 14–20",
    priceTerms: "USD 30,000 annual opportunity; not acknowledged",
    conversionConditions:
      "Buyer, price, security and purchase date unconfirmed",
    access: "Synthetic data only",
    exit: "Review at end; extension requires a reason and new goal/date",
    sourceId: "northstar-note-1",
    effectiveAt: "2026-10-03",
  });
  const pilotContent =
    "Fictional pilot agreement: Northstar confirms the target workflow problem, the founder and Alex as owners, synthetic data access and weekly participation. Pilot October 3 to November 2, review November 2. Baseline 70 percent, target at least 95 percent completed workflows, measured over demo days 14–20. Buyer, paid terms, security and purchase decision remain unconfirmed.";
  const metricContent =
    "Fictional measurement receipt for Northstar pilot v1: 98 of 100 workflows completed in demo days 14–20, collection healthy. This synthetic observation is not real product performance.";
  s.sources.push({
    ...s.sources[0],
    id: "northstar-pilot-source",
    title: "Pilot agreement · fictional",
    content: pilotContent,
    hash: hash(pilotContent),
    quoteEnd: pilotContent.length,
  });
  s.sources.push({
    ...s.sources[0],
    id: "northstar-metric-source",
    title: "98 / 100 workflow observation · fictional",
    content: metricContent,
    hash: hash(metricContent),
    quoteEnd: metricContent.length,
    occurredAt: "2026-10-23",
    recordedAt: "2026-10-24T12:00:00Z",
  });
  s.agreements[0].sourceId = "northstar-pilot-source";
  s.observations.push({
    id: "northstar-observation-v1",
    partnerId: "northstar",
    agreementId: "northstar-pilot-v1",
    sourceId: "northstar-metric-source",
    numerator: 98,
    denominator: 100,
    period: "Demo days 14–20",
    health: "healthy",
    origin: "fixture",
    recordedAt: "2026-10-24T12:00:00Z",
  });
  s.partners[0].checks = s.partners[0].checks.map((c, i) => ({
    ...c,
    status: i < 6 ? "met" : i < 8 ? "blocked" : "unknown",
    reason:
      i < 6
        ? "Explicit synthetic pilot evidence; inspect source"
        : i < 8
          ? "Customer confirmation is absent"
          : "Not established in supplied fixture",
    sourceId:
      i < 6
        ? i === 4
          ? "northstar-metric-source"
          : "northstar-pilot-source"
        : "",
    reviewer: i < 6 ? "Fixture author" : "",
    reviewedAt: i < 6 ? "2026-10-24T12:00:00Z" : "",
  }));
  return StateSchema.parse(s);
}
