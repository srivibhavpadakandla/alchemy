import { expect, it } from "vitest";
import { emptyState, newPartner, hash, SourceSchema } from "../src/lib/domain";
import { applyCommand } from "../src/lib/commands";
import {
  TrialPlanSchema,
  TrialMeasurementSchema,
  trialResult,
} from "../src/lib/trials";
import { authNext } from "../src/lib/auth-next";
export const plan = TrialPlanSchema.parse({
  id: "plan-1",
  trialId: "trial",
  partnerId: "cafe",
  version: 1,
  previousId: "",
  needsSourceId: "needs",
  start: "2026-09-01",
  end: "2026-09-30",
  workingProduct: "yes",
  startupDeliverables: "Install waste dashboard",
  customerResponsibilities: "Record waste and covers daily",
  metric: {
    name: "Waste per cover",
    baseline: 100,
    target: 20,
    unit: "grams per cover",
    direction: "lower",
    comparison: "relative change",
    periodDays: 30,
    exposure: "per cover served",
    method: "Weigh each daily waste batch and divide by covers served",
    baselineSourceId: "baseline",
    baselineStart: "2026-08-01",
    baselineEnd: "2026-08-30",
  },
  paidOffer: {
    description: "Waste dashboard subscription",
    amountCents: 19900,
    currency: "USD",
    cadence: "monthly",
    conditions: "Separate written acceptance after reviewing results",
  },
  founderApprovalSourceId: "founder",
  customerApprovalSourceId: "customer",
  createdAt: "2026-09-01T00:00:00Z",
});
export const measurement = TrialMeasurementSchema.parse({
  id: "measure",
  trialId: "trial",
  partnerId: "cafe",
  planVersion: 1,
  sourceId: "observation",
  value: 76,
  unit: "grams per cover",
  periodDays: 30,
  exposure: "per cover served",
  measuredStart: "2026-09-01",
  measuredEnd: "2026-09-30",
  validUntil: "2026-10-31",
  health: "reported",
  recordedAt: "2026-10-01T00:00:00Z",
});
function state() {
  const s = emptyState("live", "owner");
  s.partners.push(newPartner("cafe", "Example café"));
  s.trialPlans.push(plan);
  for (const id of [
    "needs",
    "baseline",
    "founder",
    "customer",
    "observation",
  ]) {
    const content = `Manual source for ${id}`;
    s.sources.push(
      SourceSchema.parse({
        id,
        partnerId: "cafe",
        version: 1,
        kind: id === "customer" ? "direct acknowledgment" : "reported note",
        title: id,
        content,
        author: "Manual reporter",
        occurredAt: "2026-09-30",
        recordedAt: "2026-10-01T00:00:00Z",
        hash: hash(content),
        scope: "program members",
        quoteStart: 0,
        quoteEnd: content.length,
      }),
    );
  }
  return s;
}
it("computes the reported normalized reduction without creating a sale", () => {
  const r = trialResult(plan, [measurement], "2026-10-03");
  expect(r).toMatchObject({
    targetMet: true,
    change: -24,
    comparisonValue: 24,
    status: "Reported target met",
  });
  const s = state(),
    next = applyCommand(
      s,
      {
        type: "trial.measurement.add",
        measurement,
        key: "record",
        expectedVersion: 1,
      },
      "founder",
      "2026-10-03T00:00:00Z",
    );
  expect(next.trialReports).toHaveLength(1);
  expect(next.trialReports[0]).toMatchObject({
    planId: plan.id,
    targetMet: true,
    change: -24,
  });
  expect(next.trialEvents[0]).toMatchObject({
    trigger: "measurement.recorded",
    status: "succeeded",
    reportId: "report-record",
    taskId: "action-record",
  });
  expect(next.trialTasks[0].title).toContain("Review results");
  expect(next.partners[0]).toMatchObject({
    stage: "prospect",
    paymentSourceId: "",
    currentArrCents: 0,
    customerSourceId: "",
  });
  expect(
    applyCommand(next, {
      type: "trial.measurement.add",
      measurement,
      key: "record",
      expectedVersion: 1,
    }),
  ).toEqual(next);
});
it.each([
  { unit: "kg" },
  { periodDays: 7 },
  { exposure: "total without covers" },
  { health: "uncertain" as const },
  { validUntil: "2026-10-01" },
  { measuredEnd: "2026-10-01" },
  { planVersion: 2 },
])(
  "withholds target attainment for incompatible or missing evidence %j",
  (patch) => {
    const r = trialResult(plan, [{ ...measurement, ...patch }], "2026-10-03");
    expect(r.targetMet).toBe(false);
    expect(r.change).toBeNull();
    expect(r.comparisonValue).toBeNull();
    expect(r.reasons.length).toBeGreaterThan(0);
  },
);
it("requires comparable baseline period and both reviews", () => {
  for (const p of [
    { ...plan, customerApprovalSourceId: "" },
    { ...plan, metric: { ...plan.metric, baselineStart: "" } },
    { ...plan, metric: { ...plan.metric, baseline: 0 } },
  ])
    expect(trialResult(p, [measurement], "2026-10-03").targetMet).toBe(false);
});
it("terms amendments clear acknowledgments and preserve historical plan", () => {
  const s = state(),
    amend = {
      ...plan,
      id: "plan-2",
      previousId: plan.id,
      version: 2,
      startupDeliverables: "A changed deliverable",
    };
  expect(() =>
    applyCommand(s, {
      type: "trial.plan.add",
      plan: amend,
      key: "amend",
      expectedVersion: 1,
    }),
  ).toThrow("fresh review");
  const next = applyCommand(s, {
    type: "trial.plan.add",
    plan: {
      ...amend,
      founderApprovalSourceId: "",
      customerApprovalSourceId: "",
    },
    key: "amend",
    expectedVersion: 1,
  });
  expect(next.trialPlans).toHaveLength(2);
  expect(next.trialPlans[0]).toEqual(plan);
  expect(next.trialEvents).toHaveLength(0);
  expect(trialResult(next.trialPlans[1], [measurement]).status).toBe(
    "Evidence incomplete",
  );
});
it("rejects cross-customer sources and invalid dated observation atomically", () => {
  const s = state();
  s.sources.find((x) => x.id === "observation")!.partnerId = "other";
  expect(() =>
    applyCommand(s, {
      type: "trial.measurement.add",
      measurement,
      key: "foreign",
      expectedVersion: 1,
    }),
  ).toThrow("another partner");
  expect(s.trialReports).toHaveLength(0);
  expect(() =>
    applyCommand(state(), {
      type: "trial.measurement.add",
      measurement: { ...measurement, periodDays: 7 },
      key: "invalid",
      expectedVersion: 1,
    }),
  ).toThrow("period length");
});
it("trial end persists an evidence-gap report and action exactly once per key", () => {
  const s = state(),
    c = {
      type: "trial.evaluate",
      trialId: "trial",
      key: "end",
      expectedVersion: 1,
    };
  expect(() => applyCommand(s, c, "scheduler", "2026-09-29T00:00:00Z")).toThrow(
    "not ended",
  );
  const next = applyCommand(s, c, "scheduler", "2026-10-03T00:00:00Z");
  expect(next.trialReports[0]).toMatchObject({
    targetMet: false,
    status: "Evidence incomplete",
  });
  expect(next.trialTasks[0].title).toContain("Resolve missing");
  expect(next.trialEvents[0].trigger).toBe("trial.ended");
  expect(applyCommand(next, c)).toEqual(next);
});
it("requires source-backed task completion and detects concurrent edits", () => {
  const s = state(),
    task = {
      id: "task",
      trialId: "trial",
      partnerId: "cafe",
      planVersion: 1,
      version: 1,
      title: "Record samples",
      owner: "customer",
      assignee: "Café champion",
      due: "2026-09-30",
      status: "done",
      blocker: "",
      completionSourceId: "",
    };
  expect(() =>
    applyCommand(s, {
      type: "trial.task.save",
      task,
      key: "done",
      expectedVersion: 1,
    }),
  ).toThrow("Evidence");
  const next = applyCommand(s, {
    type: "trial.task.save",
    task: { ...task, completionSourceId: "observation" },
    key: "done",
    expectedVersion: 1,
  });
  expect(next.trialTasks[0].status).toBe("done");
  expect(() =>
    applyCommand(next, {
      type: "trial.task.save",
      task,
      key: "stale",
      expectedVersion: 1,
    }),
  ).toThrow("changed since");
});
it("auth returns stay on approved local app routes", () => {
  expect(authNext("/customer/org/cafe")).toBe("/customer/org/cafe");
  expect(authNext("/invite/token")).toBe("/invite/token");
  for (const path of [
    "//evil.example",
    "https://evil.example",
    "/customer\\evil",
    "/login",
    "/customer/\n",
  ])
    expect(authNext(path)).toBe("/app");
});
