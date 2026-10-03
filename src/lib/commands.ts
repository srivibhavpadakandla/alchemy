import { z } from "zod";
import {
  State,
  StateSchema,
  PartnerSchema,
  SourceSchema,
  AgreementSchema,
  ObservationSchema,
  PromiseSchema,
  ProposalSchema,
  RunSchema,
  ReviewSchema,
  WorkSchema,
  CapacitySchema,
  RequestSchema,
  calculate,
  inputHash,
  hash,
} from "./domain";
const base = {
  key: z.string().min(1).max(100),
  expectedVersion: z.number().int().positive(),
};
export const CommandSchema = z.discriminatedUnion("type", [
  z.object({
    ...base,
    type: z.literal("partner.save"),
    partner: PartnerSchema,
  }),
  z.object({
    ...base,
    type: z.literal("partners.import"),
    partners: z.array(PartnerSchema).max(100),
    sources: z.array(SourceSchema).max(200),
  }),
  z.object({ ...base, type: z.literal("source.add"), source: SourceSchema }),
  z.object({ ...base, type: z.literal("work.save"), work: WorkSchema }),
  z.object({
    ...base,
    type: z.literal("promise.save"),
    promise: PromiseSchema,
  }),
  z.object({
    ...base,
    type: z.literal("agreement.add"),
    agreement: AgreementSchema,
  }),
  z.object({
    ...base,
    type: z.literal("observation.add"),
    observation: ObservationSchema,
  }),
  z.object({
    ...base,
    type: z.literal("capacity.save"),
    capacity: CapacitySchema,
  }),
  z.object({
    ...base,
    type: z.literal("strategy.save"),
    segment: z.string().min(1),
    boundary: z.string().min(1),
    deployment: z.string().min(1),
  }),
  z.object({
    ...base,
    type: z.literal("scenario.save"),
    name: z.string().min(1),
    selected: z.array(z.string()),
    assumptions: z.string(),
  }),
  z.object({
    ...base,
    type: z.literal("plan.commit"),
    selected: z.array(z.string()),
    inputHash: z.string(),
    reason: z.string().min(5),
    exception: z.string(),
  }),
  z.object({
    ...base,
    type: z.literal("revenue.record"),
    partnerId: z.string(),
    sourceId: z.string(),
    annualCents: z.number().int().nonnegative().max(1e12),
  }),
  z.object({
    ...base,
    type: z.literal("agreement.review"),
    agreementId: z.string(),
    state: AgreementSchema.shape.state,
    sourceId: z.string(),
  }),
  z.object({
    ...base,
    type: z.literal("milestone.record"),
    partnerId: z.string(),
    sourceId: z.string(),
    kind: z.enum(["outcome", "payment", "customer"]),
    agreementId: z.string().optional(),
  }),
  z.object({
    ...base,
    type: z.literal("proposal.create"),
    proposal: ProposalSchema,
  }),
  z.object({
    ...base,
    type: z.literal("proposal.resolve"),
    proposalId: z.string(),
    disposition: z.enum(["accept", "decline", "undo"]),
  }),
  z.object({ ...base, type: z.literal("run.save"), run: RunSchema }),
  z.object({ ...base, type: z.literal("review.add"), review: ReviewSchema }),
  z.object({ ...base, type: z.literal("request.add"), request: RequestSchema }),
  z.object({
    ...base,
    type: z.literal("request.link"),
    requestId: z.string(),
    workId: z.string(),
    reason: z.string().min(5),
  }),
]);
export type Command = z.infer<typeof CommandSchema>;
export class DomainError extends Error {
  constructor(
    message: string,
    public status = 400,
  ) {
    super(message);
  }
}
function assert(ok: unknown, message: string, status = 400): asserts ok {
  if (!ok) throw new DomainError(message, status);
}
export function applyCommand(
  current: State,
  raw: unknown,
  actor = "Founder",
  now = new Date().toISOString(),
): State {
  const c = CommandSchema.parse(raw);
  if (current.appliedKeys.includes(c.key)) return current;
  assert(
    c.expectedVersion === current.version,
    "Record changed since you opened it. Refresh and review the current version before applying.",
    409,
  );
  const s = structuredClone(current);
  const before = inputHash(s);
  const partner = (id: string) => {
    const p = s.partners.find((p) => p.id === id);
    assert(p, "Partner not found in this program", 404);
    return p;
  };
  const source = (id: string, pid?: string) => {
    const src = s.sources.find((x) => x.id === id);
    assert(
      src && (!pid || src.partnerId === pid),
      "Evidence is missing or belongs to another partner",
    );
    return src;
  };
  const upsert = <T extends { id: string }>(list: T[], value: T) => {
    const i = list.findIndex((x) => x.id === value.id);
    if (i < 0) list.push(value);
    else list[i] = value;
  };
  switch (c.type) {
    case "partner.save": {
      const old = s.partners.find((p) => p.id === c.partner.id);
      assert(
        !old || old.version === c.partner.version,
        "Partner version conflict",
        409,
      );
      assert(
        (old?.paymentSourceId ?? "") === c.partner.paymentSourceId,
        "Record payment through the evidence action",
      );
      assert(
        (old?.outcomeSourceId ?? "") === c.partner.outcomeSourceId,
        "Record outcome through the evidence action",
      );
      assert(
        c.partner.customerSourceId === (old?.customerSourceId ?? ""),
        "Record customer agreement through the evidence action",
      );
      assert(
        c.partner.stage !== "customer" ||
          !!old?.paymentSourceId ||
          !!old?.customerSourceId,
        "Customer status requires agreement evidence or a paid receipt",
      );
      assert(
        c.partner.stage !== "outcome achieved" || !!old?.outcomeSourceId,
        "Outcome requires a valid observation",
      );
      assert(
        c.partner.origin !== "fixture" || s.mode === "demo",
        "Fictional partners cannot enter live records",
      );
      c.partner.checks.forEach((ch) => {
        if (ch.status === "met") {
          source(ch.sourceId, c.partner.id);
          if (ch.id === "check-4") {
            const a = s.agreements
              .filter((a) => a.partnerId === c.partner.id)
              .at(-1);
            assert(
              a &&
                a.target !== null &&
                ["mutually agreed", "reported agreement"].includes(a.state) &&
                s.observations.some(
                  (o) =>
                    o.agreementId === a.id &&
                    o.sourceId === ch.sourceId &&
                    o.health === "healthy" &&
                    o.period === a.window &&
                    o.numerator / o.denominator >= (a.target ?? Infinity),
                ),
              "Observed outcome check requires a healthy matching observation and current agreed metric",
            );
          }
        }
        if (ch.status === "not applicable")
          assert(
            ch.reason.trim().length >= 5,
            "Not-applicable checks require a reason",
          );
      });
      assert(
        c.partner.currentArrCents === (old?.currentArrCents ?? 0),
        "ARR requires separate verified commercial records; cannot infer ARR from an opportunity",
      );
      assert(
        c.partner.currentArrSourceId === (old?.currentArrSourceId ?? ""),
        "Record ARR source through the commercial evidence action",
      );
      upsert(s.partners, { ...c.partner, version: (old?.version ?? 0) + 1 });
      break;
    }
    case "partners.import": {
      assert(
        s.mode === "live",
        "Import your records into a live program, not the fictional demo",
      );
      assert(
        new Set(c.partners.map((p) => p.id)).size === c.partners.length,
        "Duplicate IDs in import",
      );
      for (const p of c.partners) {
        assert(p.origin !== "fixture", "Fixture data is not a live import");
        assert(
          !s.partners.some((x) => x.id === p.id),
          `ID conflict: ${p.id}. Review as an amendment; existing records were preserved.`,
          409,
        );
        assert(
          p.stage === "prospect" &&
            p.currentArrCents === 0 &&
            !p.paymentSourceId &&
            !p.customerSourceId &&
            !p.outcomeSourceId &&
            !p.currentArrSourceId &&
            p.checks.every((ch) => ch.status === "unknown"),
          "Imports begin as unverified prospects",
        );
      }
      const knownSourceIds = new Set(s.sources.map((src) => src.id));
      for (const src of c.sources) {
        assert(!knownSourceIds.has(src.id), "Duplicate import source ID");
        knownSourceIds.add(src.id);
        assert(
          c.partners.some((p) => p.id === src.partnerId),
          "Import source belongs outside imported partners",
        );
        assert(src.kind !== "fixture", "Fixture source denied in live import");
        assert(
          src.hash === hash(src.content) &&
            src.quoteStart <= src.quoteEnd &&
            src.quoteEnd <= src.content.length,
          "Invalid imported source hash or quote span",
        );
      }
      s.partners.push(...c.partners);
      s.sources.push(...c.sources);
      break;
    }
    case "source.add": {
      partner(c.source.partnerId);
      assert(
        !s.sources.some((x) => x.id === c.source.id),
        "Source ID already exists",
        409,
      );
      assert(
        c.source.kind !== "fixture" || s.mode === "demo",
        "Fixture source denied in live program",
      );
      assert(
        c.source.quoteEnd <= c.source.content.length &&
          c.source.quoteStart <= c.source.quoteEnd,
        "Invalid quote span",
      );
      assert(
        c.source.hash === hash(c.source.content),
        "Source content hash mismatch",
      );
      s.sources.push(c.source);
      break;
    }
    case "work.save": {
      const old = s.work.find((x) => x.id === c.work.id);
      assert(
        !old || old.version === c.work.version,
        "Work version conflict",
        409,
      );
      assert(
        c.work.status !== "delivered" || !!c.work.deliverySourceId,
        "Delivery requires evidence",
      );
      c.work.partnerIds.forEach(partner);
      c.work.sourceIds.forEach((id) => source(id));
      assert(
        c.work.low === null ||
          c.work.high === null ||
          c.work.low <= c.work.high,
        "Estimate range is reversed",
      );
      if (c.work.effort !== null && c.work.low !== null && c.work.high !== null)
        assert(
          c.work.effort >= c.work.low && c.work.effort <= c.work.high,
          "Central estimate must be in range",
        );
      upsert(s.work, { ...c.work, version: (old?.version ?? 0) + 1 });
      const result = calculate(s, [c.work.id]);
      assert(!result.errors.length, result.errors.join(" "));
      break;
    }
    case "promise.save": {
      partner(c.promise.partnerId);
      const src = source(c.promise.sourceId, c.promise.partnerId);
      if (["mutually agreed", "partner acknowledged"].includes(c.promise.state))
        assert(
          src.kind === "direct acknowledgment" ||
            (s.mode === "demo" && src.kind === "fixture"),
          "Acknowledgment needs direct customer evidence",
        );
      const old = s.promises.find((x) => x.id === c.promise.id);
      assert(
        !old || old.version === c.promise.version,
        "Promise version conflict",
        409,
      );
      upsert(s.promises, { ...c.promise, version: (old?.version ?? 0) + 1 });
      break;
    }
    case "agreement.add": {
      partner(c.agreement.partnerId);
      const agreementSource = source(
        c.agreement.sourceId,
        c.agreement.partnerId,
      );
      if (
        ["mutually agreed", "partner acknowledged"].includes(c.agreement.state)
      )
        assert(
          agreementSource.kind === "direct acknowledgment" ||
            (s.mode === "demo" && agreementSource.kind === "fixture"),
          "Customer agreement requires direct acknowledgment",
        );
      assert(
        !s.agreements.some((a) => a.id === c.agreement.id),
        "Agreement versions are immutable",
      );
      assert(c.agreement.end >= c.agreement.start, "End date precedes start");
      if (c.agreement.previousId) {
        const prev = s.agreements.find((a) => a.id === c.agreement.previousId);
        assert(
          prev && prev.partnerId === c.agreement.partnerId,
          "Previous agreement missing",
        );
        assert(
          c.agreement.effectiveAt >= now.slice(0, 10),
          "Amendments cannot retroactively lower the metric",
        );
      }
      s.agreements.push(c.agreement);
      partner(c.agreement.partnerId).checks = partner(
        c.agreement.partnerId,
      ).checks.map((ch) =>
        ["check-1", "check-3", "check-4"].includes(ch.id)
          ? {
              ...ch,
              status: "stale",
              reason: "Agreement changed; reevaluate against this version",
              version: ch.version + 1,
            }
          : ch,
      );
      break;
    }
    case "observation.add": {
      partner(c.observation.partnerId);
      source(c.observation.sourceId, c.observation.partnerId);
      assert(
        s.agreements.some(
          (a) =>
            a.id === c.observation.agreementId &&
            a.partnerId === c.observation.partnerId,
        ),
        "Metric agreement not found",
      );
      assert(
        !s.observations.some((o) => o.id === c.observation.id),
        "Duplicate observation",
      );
      s.observations.push(c.observation);
      break;
    }
    case "capacity.save": {
      assert(
        c.capacity.core + c.capacity.support <= c.capacity.total,
        "Reserves exceed capacity",
      );
      assert(
        c.capacity.version === s.capacity.version,
        "Capacity changed",
        409,
      );
      s.capacity = { ...c.capacity, version: s.capacity.version + 1 };
      break;
    }
    case "strategy.save":
      s.strategy = {
        segment: c.segment,
        boundary: c.boundary,
        deployment: c.deployment,
        version: s.strategy.version + 1,
      };
      break;
    case "scenario.save": {
      assert(c.selected.length, "Select work first");
      s.scenarios.push({
        id: c.key,
        name: c.name,
        selected: calculate(s, c.selected).selected,
        inputHash: before,
        createdAt: now,
        assumptions: c.assumptions,
        version: 1,
      });
      break;
    }
    case "plan.commit": {
      assert(
        c.inputHash === before,
        "Plan inputs changed; recompute and review the fresh comparison.",
        409,
      );
      assert(c.selected.length, "Select at least one work item");
      const r = calculate(s, c.selected);
      assert(!r.unknown, "Estimate unknown effort before committing");
      assert(!r.errors.length, r.errors.join(" "));
      assert(
        r.remaining !== null &&
          (r.remaining >= 0 || c.exception.trim().length >= 12),
        "Over-capacity plans need an explicit exception reason",
      );
      assert(
        !s.decisions.some(
          (d) => !d.stale && d.inputs.period === s.capacity.period,
        ),
        "A plan is already committed for this period. Revise inputs and review a replacement, rather than spending capacity twice.",
        409,
      );
      s.decisions.forEach((d) => {
        if (d.inputs.period === s.capacity.period) d.stale = true;
      });
      s.decisions.push({
        id: c.key,
        key: c.key,
        selected: r.selected,
        inputHash: before,
        formula: r.formula,
        reason: c.reason,
        exception: c.exception,
        actor,
        createdAt: now,
        stale: false,
        result: r,
        inputs: {
          period: s.capacity.period,
          capacity: structuredClone(s.capacity),
          partners: structuredClone(s.partners),
          work: structuredClone(s.work),
          strategy: structuredClone(s.strategy),
          assumptions:
            "Selection creates assignments only. No delivery, acceptance or purchase is assumed.",
        },
      });
      s.work = s.work.map((w) => {
        if (w.status === "delivered") return w;
        const assigned = s.decisions.some(
          (d) => !d.stale && d.selected.includes(w.id),
        );
        const status = assigned ? "queued" : "proposed";
        return status === w.status
          ? w
          : { ...w, status, version: w.version + 1 };
      });
      break;
    }
    case "revenue.record": {
      const p = partner(c.partnerId);
      const src = source(c.sourceId, p.id);
      assert(
        ["direct acknowledgment", "billing receipt", "fixture"].includes(
          src.kind,
        ),
        "Current ARR needs a documented agreement or billing source",
      );
      p.currentArrCents = c.annualCents;
      p.currentArrSourceId = src.id;
      p.version++;
      break;
    }
    case "agreement.review": {
      const a = s.agreements.find((x) => x.id === c.agreementId);
      assert(a, "Agreement not found");
      const src = source(c.sourceId, a.partnerId);
      if (["partner acknowledged", "mutually agreed"].includes(c.state))
        assert(
          src.kind === "direct acknowledgment" ||
            (s.mode === "demo" && src.kind === "fixture"),
          "Customer acknowledgment requires direct evidence",
        );
      s.agreements.push({
        ...a,
        id: c.key,
        previousId: a.id,
        version: a.version + 1,
        state: c.state,
        sourceId: src.id,
        effectiveAt: now.slice(0, 10),
      });
      break;
    }
    case "milestone.record": {
      const p = partner(c.partnerId);
      const src = source(c.sourceId, p.id);
      if (c.kind === "customer") {
        if (p.customerSourceId === src.id) return current;
        assert(
          [
            "reported note",
            "direct acknowledgment",
            "billing receipt",
          ].includes(src.kind) ||
            (s.mode === "demo" && src.kind === "fixture"),
          "Customer agreement needs reported or documented commercial evidence",
        );
        p.customerSourceId = src.id;
        p.stage = "customer";
      } else if (c.kind === "payment") {
        if (p.paymentSourceId === src.id) return current;
        assert(
          src.kind === "billing receipt" ||
            (s.mode === "demo" && src.kind === "fixture"),
          "Paid status requires a billing receipt",
        );
        p.paymentSourceId = src.id;
        p.stage = "customer";
      } else {
        if (p.outcomeSourceId === src.id) return current;
        const a = s.agreements.find(
          (a) => a.id === c.agreementId && a.partnerId === p.id,
        );
        assert(
          a &&
            a.target !== null &&
            ["reported agreement", "mutually agreed"].includes(a.state),
          "An agreed metric version is required",
        );
        const o = s.observations.find(
          (o) =>
            o.agreementId === a.id &&
            o.sourceId === src.id &&
            o.health === "healthy" &&
            o.period === a.window,
        );
        assert(
          o && o.numerator / o.denominator >= a.target,
          "No healthy observation meets this metric",
        );
        p.outcomeSourceId = src.id;
        p.stage = "outcome achieved";
      }
      p.version++;
      break;
    }
    case "proposal.create": {
      const p = c.proposal;
      const entity =
        p.entity === "partner"
          ? s.partners.find((x) => x.id === p.entityId)
          : s.work.find((x) => x.id === p.entityId);
      assert(entity, "Correction target missing");
      const allowed =
        p.entity === "partner"
          ? ["fit", "problem", "segment", "workaround"]
          : ["classification", "classificationReason", "scope", "effort"];
      assert(
        allowed.includes(p.field),
        "This field requires its dedicated reviewed workflow",
      );
      assert(
        p.expectedVersion === entity.version,
        "Correction input is stale",
        409,
      );
      p.sourceIds.forEach((id) => source(id));
      s.proposals.push(p);
      break;
    }
    case "proposal.resolve": {
      const p = s.proposals.find((x) => x.id === c.proposalId);
      assert(p, "Proposal not found");
      if (c.disposition === "decline") {
        assert(
          p.state === "pending" || p.state === "conflict",
          "Proposal already resolved",
        );
        p.state = "declined";
        break;
      }
      const entity =
        p.entity === "partner"
          ? s.partners.find((x) => x.id === p.entityId)
          : s.work.find((x) => x.id === p.entityId);
      assert(entity, "Target missing");
      const record = entity as unknown as Record<string, unknown>;
      assert(
        !(
          p.entity === "partner" &&
          (entity as State["partners"][0]).lockedFields.includes(p.field)
        ),
        "This field is manually locked",
        409,
      );
      const expected = c.disposition === "undo" ? p.after : p.before;
      assert(
        hash(record[p.field]) === hash(expected),
        "Same-field conflict: current value differs. Keep current or create a manually merged proposal.",
        409,
      );
      assert(
        c.disposition === "undo"
          ? p.state === "accepted"
          : p.state === "pending",
        "Proposal already resolved",
      );
      record[p.field] = c.disposition === "undo" ? p.before : p.after;
      entity.version++;
      p.state = c.disposition === "undo" ? "undone" : "accepted";
      p.version++;
      break;
    }
    case "run.save": {
      const old = s.runs.find((r) => r.id === c.run.id);
      if (old?.status === "cancelled" && c.run.status !== "cancelled")
        c.run.status = "quarantined";
      if (c.run.output && c.run.inputHash !== before)
        c.run.status = "quarantined";
      upsert(s.runs, c.run);
      break;
    }
    case "review.add": {
      assert(
        c.review.inputHash === before,
        "Review sources changed; late review quarantined",
        409,
      );
      c.review.sourceIds.forEach((id) => source(id));
      s.reviews.push(c.review);
      break;
    }
    case "request.add": {
      const r = c.request;
      partner(r.partnerId);
      const src = source(r.sourceId, r.partnerId);
      assert(
        src.content.includes(r.quote),
        "Request quote must occur verbatim in its source",
      );
      assert(
        s.work.some((w) => w.id === r.workId),
        "Linked work missing",
      );
      assert(!s.requests.some((x) => x.id === r.id), "Duplicate request");
      s.requests.push(r);
      break;
    }
    case "request.link": {
      const req = s.requests.find((r) => r.id === c.requestId);
      assert(req, "Request not found");
      const target = s.work.find((w) => w.id === c.workId);
      assert(target, "Work not found");
      const previousId = req.workId;
      req.workId = target.id;
      req.linkState = "confirmed";
      req.version++;
      if (!target.partnerIds.includes(req.partnerId))
        target.partnerIds.push(req.partnerId);
      if (!target.sourceIds.includes(req.sourceId))
        target.sourceIds.push(req.sourceId);
      target.version++;
      const p = partner(req.partnerId);
      if (previousId !== target.id) {
        const previous = s.work.find((w) => w.id === previousId);
        const remaining = s.requests.filter(
          (r) => r.workId === previousId && r.linkState === "confirmed",
        );
        if (!remaining.some((r) => r.partnerId === p.id)) {
          if (previous) {
            previous.partnerIds = previous.partnerIds.filter(
              (id) => id !== p.id,
            );
            previous.version++;
          }
          p.requiredWork = p.requiredWork.filter((id) => id !== previousId);
          p.optionalWork = p.optionalWork.filter((id) => id !== previousId);
        }
        if (previous && !remaining.some((r) => r.sourceId === req.sourceId))
          previous.sourceIds = previous.sourceIds.filter(
            (id) => id !== req.sourceId,
          );
      }
      const mustHave = s.requests.some(
        (r) =>
          r.partnerId === p.id &&
          r.workId === target.id &&
          r.linkState === "confirmed" &&
          r.mustHave,
      );
      p.requiredWork = p.requiredWork.filter((id) => id !== target.id);
      p.optionalWork = p.optionalWork.filter((id) => id !== target.id);
      (mustHave ? p.requiredWork : p.optionalWork).push(target.id);
      p.version++;
      break;
    }
  }
  if (inputHash(s) !== before && c.type !== "plan.commit")
    s.decisions = s.decisions.map((d) => ({ ...d, stale: true }));
  s.version++;
  s.appliedKeys.push(c.key);
  s.history.push({
    id: c.key,
    at: now,
    actor,
    action:
      c.type === "request.link"
        ? `${c.type}: ${c.requestId} → ${c.workId}. ${c.reason}`
        : c.type,
    version: s.version,
  });
  return StateSchema.parse(s);
}
