import { afterEach, expect, it, vi } from "vitest";
import { emptyState, newPartner } from "../src/lib/domain";
import {
  TrialPlanSchema,
  TrialTaskSchema,
  TrialMeasurementSchema,
} from "../src/lib/trials";
import {
  EmailRuleSchema,
  emailCandidates,
  localSchedule,
  sendTrialEmail,
  trialEmailDelivery,
  emailRetryEligible,
  emailReviewDigest,
  emailTemplatePreviews,
} from "../src/lib/trial-email";
const now = new Date("2026-09-09T17:00:00Z");
function fixture() {
  const state = emptyState("live", "owner");
  state.partners.push(newPartner("cafe", "Customer café"));
  state.trialPlans.push(
    TrialPlanSchema.parse({
      id: "plan",
      trialId: "trial",
      partnerId: "cafe",
      version: 1,
      previousId: "",
      needsSourceId: "needs",
      start: "2026-09-01",
      end: "2026-09-30",
      startupDeliverables: "Install dashboard",
      customerResponsibilities: "Record weekly measurements",
      metric: {
        name: "Waste per cover",
        baseline: 100,
        target: 20,
        unit: "grams",
        direction: "lower",
        comparison: "relative change",
        periodDays: 30,
        exposure: "per cover",
        method: "Weigh and normalize waste",
        baselineSourceId: "baseline",
      },
      paidOffer: {
        description: "Waste dashboard subscription",
        amountCents: 19900,
        currency: "USD",
        cadence: "monthly",
        conditions: "Requires separate written acceptance",
      },
      founderApprovalSourceId: "founder",
      customerApprovalSourceId: "customer",
      createdAt: "2026-09-01T00:00:00Z",
    }),
  );
  state.trialTasks.push(
    TrialTaskSchema.parse({
      id: "task",
      trialId: "trial",
      partnerId: "cafe",
      planVersion: 1,
      version: 1,
      title: "Record waste totals",
      owner: "customer",
      assignee: "Customer",
      due: "2026-09-08",
      status: "planned",
      blocker: "",
      completionSourceId: "",
    }),
  );
  state.trialTasks.push({
    ...state.trialTasks[0],
    id: "private",
    owner: "startup",
    title: "Internal sensitive financing notes",
  });
  const rule = {
    ...EmailRuleSchema.parse({
      programId: state.id,
      partnerId: "cafe",
      expectedVersion: state.version,
      enabled: true,
      reviewed: true,
      recipients: ["Owner@example.test"],
      triggers: [
        "kickoff",
        "task assignment",
        "due reminder",
        "missing measurement",
        "trial end",
      ],
      timeZone: "America/Los_Angeles",
      time: "09:00",
      subject: "{{customer}} · {{trigger}}",
      template: "Hello {{customer}}\n{{task}}\nDue {{due}}\n{{reportUrl}}",
    }),
    id: "rule",
    plan_id: "plan",
    actor_id: "owner",
    version: 1,
  };
  return { state, rule };
}
afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});
it("schedules using the reviewed IANA time zone across UTC dates", () => {
  expect(
    localSchedule(new Date("2026-09-09T02:00:00Z"), "America/Los_Angeles"),
  ).toEqual({ day: "2026-09-08", time: "19:00" });
  expect(() => localSchedule(now, "not-a-zone")).toThrow();
});
it("deduplicates recipients and keys by pilot event and recipient, and never includes internal tasks", () => {
  const { state, rule } = fixture(),
    first = emailCandidates(state, rule, now);
  expect(first.length).toBe(4);
  expect(first.map((c) => c.key)).toEqual(
    emailCandidates(state, rule, now).map((c) => c.key),
  );
  expect(new Set(first.map((c) => c.key)).size).toBe(first.length);
  expect(
    first.every(
      (c) =>
        c.recipient === "owner@example.test" &&
        !c.text.includes("Internal sensitive"),
    ),
  ).toBe(true);
  expect(
    EmailRuleSchema.parse({
      ...rule,
      recipients: ["Owner@example.test", "owner@example.test"],
    }).recipients,
  ).toEqual(["owner@example.test"]);
});
it("suppresses completed, old-version, startup-owned and foreign-customer task reminders", () => {
  const { state, rule } = fixture();
  state.trialTasks[0].status = "done";
  state.trialTasks.push(
    { ...state.trialTasks[0], id: "stale", planVersion: 2, status: "planned" },
    {
      ...state.trialTasks[0],
      id: "foreign",
      partnerId: "foreign",
      status: "planned",
    },
  );
  expect(
    emailCandidates(
      state,
      { ...rule, triggers: ["due reminder", "task assignment"] },
      now,
    ),
  ).toEqual([]);
});
it.each(["pause", "stop", "decline", "continue paid"] as const)(
  "suppresses all automation after %s",
  (decision) => {
    const { state, rule } = fixture();
    state.trialDecisions.push({
      id: "decision",
      trialId: "trial",
      partnerId: "cafe",
      planVersion: 1,
      sourceId: "source",
      decision,
      reason: "Recorded owner decision",
      recordedAt: now.toISOString(),
    });
    expect(emailCandidates(state, rule, now)).toEqual([]);
  },
);
it("requires current plan and both reviews; disabled and before-schedule rules never send", () => {
  const { state, rule } = fixture();
  for (const patch of [
    { enabled: false },
    { plan_id: "old-plan" },
    { time: "18:00" },
  ])
    expect(emailCandidates(state, { ...rule, ...patch }, now)).toEqual([]);
  state.trialPlans[0].customerApprovalSourceId = "";
  expect(emailCandidates(state, rule, now)).toEqual([]);
});
it("submitted current-plan measurements suppress missing-measurement requests", () => {
  const { state, rule } = fixture();
  state.trialMeasurements.push(
    TrialMeasurementSchema.parse({
      id: "m",
      trialId: "trial",
      partnerId: "cafe",
      planVersion: 1,
      sourceId: "source",
      value: 90,
      unit: "grams",
      periodDays: 7,
      exposure: "per cover",
      measuredStart: "2026-09-01",
      measuredEnd: "2026-09-08",
      validUntil: "2026-09-15",
      health: "reported",
      recordedAt: "2026-09-08T17:00:00Z",
    }),
  );
  expect(
    emailCandidates(state, { ...rule, triggers: ["missing measurement"] }, now),
  ).toEqual([]);
});
it("trial end sends only a results-review invitation, and cannot imply purchase or payment", () => {
  const { state, rule } = fixture(),
    end = emailCandidates(state, rule, new Date("2026-10-02T17:00:00Z"));
  expect(end).toHaveLength(1);
  expect(end[0].event).toBe("trial-end");
  expect(end[0].text).toContain("Buying and payment decisions remain explicit");
});
it("review digest binds normalized configuration and current program/plan, while preview excludes internal notes", () => {
  const { state, rule } = fixture(),
    digest = emailReviewDigest(state, rule, "plan");
  expect(
    emailReviewDigest(
      state,
      { ...rule, enabled: false, reviewDigest: "old" },
      "plan",
    ),
  ).toBe(digest);
  expect(
    emailReviewDigest({ ...state, version: state.version + 1 }, rule, "plan"),
  ).not.toBe(digest);
  expect(
    emailReviewDigest(
      state,
      { ...rule, template: "A completely changed message" },
      "plan",
    ),
  ).not.toBe(digest);
  expect(emailReviewDigest(state, rule, "new-plan")).not.toBe(digest);
  expect(
    emailTemplatePreviews(state, rule).every(
      (p) => !p.text.includes("Internal sensitive"),
    ),
  ).toBe(true);
});
it("rendered task names cannot inject email subject headers", () => {
  const { state, rule } = fixture();
  state.trialTasks[0].title = "Review\r\nBcc: hidden@example.test";
  expect(
    emailCandidates(state, { ...rule, subject: "{{task}}" }, now).every(
      (c) => !/[\r\n]/.test(c.subject),
    ),
  ).toBe(true);
});
it("missing provider setup blocks submission without a network call", async () => {
  vi.stubEnv("RESEND_API_KEY", "");
  vi.stubEnv("EMAIL_FROM", "");
  const fetch = vi.fn();
  vi.stubGlobal("fetch", fetch);
  const { state, rule } = fixture();
  await expect(
    sendTrialEmail(emailCandidates(state, rule, now)[0]),
  ).rejects.toThrow("No message was sent");
  expect(fetch).not.toHaveBeenCalled();
});
it("provider acceptance stores a receipt with the original key and immutable sender/body, without claiming delivery", async () => {
  vi.stubEnv("RESEND_API_KEY", "test-key");
  vi.stubEnv("EMAIL_FROM", "changed@example.test");
  const fetch = vi
    .fn()
    .mockResolvedValue(
      Response.json({ id: "11111111-1111-4111-8111-111111111111" }),
    );
  vi.stubGlobal("fetch", fetch);
  const { state, rule } = fixture(),
    candidate = {
      ...emailCandidates(state, rule, now)[0],
      from: "reviewed@example.test",
    };
  expect(await sendTrialEmail(candidate)).toEqual({
    providerId: "11111111-1111-4111-8111-111111111111",
    status: "accepted",
  });
  const request = fetch.mock.calls[0][1];
  expect(request.headers["Idempotency-Key"]).toBe(candidate.key);
  expect(JSON.parse(request.body)).toMatchObject({
    from: "reviewed@example.test",
    to: [candidate.recipient],
    text: candidate.text,
  });
});
it("invalid or missing provider receipt stays uncertain rather than claiming success", async () => {
  vi.stubEnv("RESEND_API_KEY", "test-key");
  vi.stubEnv("EMAIL_FROM", "sender@example.test");
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue(Response.json({ id: "not-a-receipt" })),
  );
  const { state, rule } = fixture();
  await expect(
    sendTrialEmail(emailCandidates(state, rule, now)[0]),
  ).rejects.toThrow("uncertain");
});
it.each([
  ["sent", "accepted"],
  ["delivered", "delivered"],
  ["bounced", "failed"],
  ["suppressed", "failed"],
])(
  "classifies genuine %s provider lookup as %s",
  async (last_event, status) => {
    vi.stubEnv("RESEND_API_KEY", "test-key");
    vi.stubEnv("EMAIL_FROM", "sender@example.test");
    const id = "11111111-1111-4111-8111-111111111111";
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(Response.json({ id, last_event })),
    );
    expect(await trialEmailDelivery(id)).toBe(status);
  },
);
it("refuses a delivery receipt from a different provider message", async () => {
  vi.stubEnv("RESEND_API_KEY", "test-key");
  vi.stubEnv("EMAIL_FROM", "sender@example.test");
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue(
      Response.json({
        id: "22222222-2222-4222-8222-222222222222",
        last_event: "delivered",
      }),
    ),
  );
  await expect(
    trialEmailDelivery("11111111-1111-4111-8111-111111111111"),
  ).rejects.toThrow("validated");
});
it("crash retries are limited to the same unreceipted payload within one hour and three attempts", () => {
  const at = Date.parse("2026-09-09T17:00:00Z"),
    record = {
      status: "pending",
      attempts: 1,
      created_at: "2026-09-09T16:30:00Z",
      updated_at: "2026-09-09T16:58:00Z",
    };
  expect(emailRetryEligible(record, at)).toBe(true);
  for (const patch of [
    { status: "accepted" },
    { status: "delivered" },
    { status: "failed" },
    { attempts: 3 },
    { provider_id: "receipt" },
    { created_at: "2026-09-09T15:00:00Z" },
    { updated_at: "2026-09-09T16:59:50Z" },
  ])
    expect(emailRetryEligible({ ...record, ...patch }, at)).toBe(false);
});
it("uses timestamps rather than database UUID order to honor a later stop and newer weekly measurement", () => {
  const { state, rule } = fixture();
  const base = {
    trialId: "trial",
    partnerId: "cafe",
    planVersion: 1,
    sourceId: "source",
    reason: "Recorded owner decision",
  };
  state.trialDecisions.push(
    {
      ...base,
      id: "a-later-stop",
      decision: "stop",
      recordedAt: "2026-09-09T16:00:00Z",
    },
    {
      ...base,
      id: "z-old-undecided",
      decision: "undecided",
      recordedAt: "2026-09-01T00:00:00Z",
    },
  );
  expect(emailCandidates(state, rule, now)).toEqual([]);
  state.trialDecisions = [];
  const m = TrialMeasurementSchema.parse({
    id: "a-new",
    trialId: "trial",
    partnerId: "cafe",
    planVersion: 1,
    sourceId: "source",
    value: 90,
    unit: "grams",
    periodDays: 7,
    exposure: "per cover",
    measuredStart: "2026-09-01",
    measuredEnd: "2026-09-08",
    validUntil: "2026-09-15",
    health: "reported",
    recordedAt: "2026-09-08T17:00:00Z",
  });
  state.trialMeasurements.push(m, {
    ...m,
    id: "z-old",
    recordedAt: "2026-09-01T00:00:00Z",
  });
  expect(
    emailCandidates(state, { ...rule, triggers: ["missing measurement"] }, now),
  ).toEqual([]);
});
