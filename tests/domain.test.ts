import { describe, it, expect } from "vitest";
import {
  seed,
  calculate,
  readiness,
  inputHash,
  hash,
  newPartner,
  StateSchema,
} from "../src/lib/domain";
import { applyCommand, Command } from "../src/lib/commands";
const cmd = (s: ReturnType<typeof seed>, c: Record<string, unknown>) => ({
  ...c,
  key: crypto.randomUUID(),
  expectedVersion: s.version,
});
describe("canonical calculations", () => {
  it.each([
    ["salesforce", 20, 70, 30, 3800000],
    ["custom_approval", 46, 96, 4, 5000000],
  ] as const)(
    "%s reproduces fixture values",
    (id, effort, total, remaining, value) => {
      const r = calculate(seed(), [id]);
      expect(r).toMatchObject({ effort, total, remaining, value });
    },
  );
  it("never counts Juniper twice; optional CSV adds no deal", () => {
    expect(calculate(seed(), ["salesforce", "csv", "csv"])).toMatchObject({
      effort: 28,
      total: 78,
      remaining: 22,
      value: 3800000,
      partnerIds: ["northstar", "juniper"],
    });
  });
  it("overbooks by 16, keeps reserves", () =>
    expect(calculate(seed(), ["salesforce", "custom_approval"])).toMatchObject({
      effort: 66,
      total: 116,
      remaining: -16,
      reserved: 50,
    }));
  it("distinguishes two concentration horizons", () => {
    expect(calculate(seed(), ["custom_approval"]).projectedConcentration).toBe(
      1,
    );
    expect(
      calculate(seed(), ["salesforce", "custom_approval"])
        .projectedConcentration,
    ).toBeCloseTo(50000 / 88000);
    expect(calculate(seed(), []).currentConcentration).toBeNull();
  });
  it("uses explicit total and discretionary denominators", () => {
    expect(calculate(seed(), ["custom_approval"])).toMatchObject({
      totalShare: 0.46,
      discretionaryShare: 0.92,
      high: 60,
    });
  });
  it("deduplicates dependency closure", () => {
    const s = seed();
    s.work[1].dependencies = ["salesforce"];
    expect(calculate(s, ["csv", "salesforce"]).effort).toBe(28);
  });
  it("detects cycles and missing prerequisites", () => {
    const s = seed();
    s.work[0].dependencies = ["csv"];
    s.work[1].dependencies = ["salesforce"];
    expect(calculate(s, ["salesforce"]).errors.join()).toContain("cycle");
    s.work[0].dependencies = ["missing"];
    expect(calculate(s, ["salesforce"]).errors.join()).toContain(
      "Missing work",
    );
  });
  it("unknown efforts and zero denominator remain unknown", () => {
    const s = seed();
    s.work[0].effort = null;
    s.capacity.total = 0;
    const r = calculate(s, ["salesforce"]);
    expect(r.effort).toBeNull();
    expect(r.totalShare).toBeNull();
    expect(r.discretionaryShare).toBeNull();
  });
  it("mixed currency or basis cannot invent money", () => {
    const s = seed();
    s.partners[1].currency = "EUR";
    expect(calculate(s, ["salesforce"]).value).toBeNull();
    s.partners[1].currency = "USD";
    s.partners[1].basis = "monthly";
    expect(calculate(s, ["salesforce"]).value).toBeNull();
  });
  it("selected features never unblock commercial conditions", () =>
    expect(
      calculate(seed(), ["salesforce", "csv", "custom_approval"])
        .unblockedValue,
    ).toBe(0));
});
describe("reviewed commands and integrity", () => {
  it("commit queues once and changes no partner milestone", () => {
    const s = seed(),
      c = cmd(s, {
        type: "plan.commit",
        selected: ["salesforce"],
        inputHash: inputHash(s),
        reason: "Shared learning in our intended segment",
        exception: "",
      });
    const next = applyCommand(s, c);
    expect(next.decisions).toHaveLength(1);
    expect(next.work[0].status).toBe("queued");
    expect(next.partners).toEqual(s.partners);
    expect(applyCommand(next, c)).toEqual(next);
  });
  it("stale plan and overbooking rejected without mutation", () => {
    const s = seed();
    expect(() =>
      applyCommand(
        s,
        cmd(s, {
          type: "plan.commit",
          selected: ["salesforce"],
          inputHash: "stale",
          reason: "Something",
          exception: "",
        }),
      ),
    ).toThrow("inputs changed");
    expect(() =>
      applyCommand(
        s,
        cmd(s, {
          type: "plan.commit",
          selected: ["salesforce", "custom_approval"],
          inputHash: inputHash(s),
          reason: "Both routes",
          exception: "",
        }),
      ),
    ).toThrow("exception");
    expect(s.decisions).toHaveLength(0);
  });
  it("records a justified custom choice and authorized capacity exception", () => {
    const s = seed();
    const n = applyCommand(
      s,
      cmd(s, {
        type: "plan.commit",
        selected: ["custom_approval"],
        inputHash: inputHash(s),
        reason:
          "We choose enterprise learning under a bounded paid services strategy",
        exception: "",
      }),
    );
    expect(n.decisions[0].selected).toEqual(["custom_approval"]);
    const over = applyCommand(
      s,
      cmd(s, {
        type: "plan.commit",
        selected: ["salesforce", "custom_approval"],
        inputHash: inputHash(s),
        reason: "Approved expanded team coverage",
        exception: "Founder confirms sixteen additional points for this period",
      }),
    );
    expect(over.decisions[0].result.remaining).toBe(-16);
  });
  it("concurrent plan commit cannot double-spend", () => {
    const s = seed(),
      a = applyCommand(
        s,
        cmd(s, {
          type: "plan.commit",
          selected: ["salesforce"],
          inputHash: inputHash(s),
          reason: "Share the work",
          exception: "",
        }),
      );
    expect(() =>
      applyCommand(
        a,
        cmd(s, {
          type: "plan.commit",
          selected: ["csv"],
          inputHash: inputHash(s),
          reason: "Second writer",
          exception: "",
        }),
      ),
    ).toThrow("Record changed");
    expect(() =>
      applyCommand(
        a,
        cmd(a, {
          type: "plan.commit",
          selected: ["csv"],
          inputHash: inputHash(a),
          reason: "Second writer",
          exception: "",
        }),
      ),
    ).toThrow("already committed");
  });
  it("changes costs and invalidates committed plan", () => {
    let s = seed();
    s = applyCommand(
      s,
      cmd(s, {
        type: "plan.commit",
        selected: ["salesforce"],
        inputHash: inputHash(s),
        reason: "Share the work",
        exception: "",
      }),
    );
    s = applyCommand(
      s,
      cmd(s, { type: "work.save", work: { ...s.work[0], effort: 22 } }),
    );
    expect(s.decisions[0].stale).toBe(true);
    expect(calculate(s, ["salesforce"]).effort).toBe(22);
  });
  it("preserves unrelated edits and allows versioned undo", () => {
    let s = seed();
    s = applyCommand(
      s,
      cmd(s, {
        type: "proposal.create",
        proposal: {
          id: "correction",
          entity: "work",
          entityId: "salesforce",
          field: "classification",
          before: "integration",
          after: "reusable configuration",
          expectedVersion: 1,
          reason: "Reviewed scope indicates configuration",
          sourceIds: ["northstar-note-1"],
          state: "pending",
          createdAt: "2026-10-03",
          version: 1,
        },
      }),
    );
    s = applyCommand(
      s,
      cmd(s, {
        type: "partner.save",
        partner: {
          ...s.partners[0],
          problem: "Unrelated bytes stay exactly here.",
        },
      }),
    );
    s = applyCommand(
      s,
      cmd(s, {
        type: "proposal.resolve",
        proposalId: "correction",
        disposition: "accept",
      }),
    );
    expect(s.partners[0].problem).toBe("Unrelated bytes stay exactly here.");
    expect(s.work[0].classification).toBe("reusable configuration");
    s = applyCommand(
      s,
      cmd(s, {
        type: "proposal.resolve",
        proposalId: "correction",
        disposition: "undo",
      }),
    );
    expect(s.work[0].classification).toBe("integration");
    expect(s.work[0].version).toBe(3);
  });
  it("same-field edit causes conflict and keeps manual edit", () => {
    let s = seed();
    s = applyCommand(
      s,
      cmd(s, {
        type: "proposal.create",
        proposal: {
          id: "correction",
          entity: "work",
          entityId: "salesforce",
          field: "classification",
          before: "integration",
          after: "reusable configuration",
          expectedVersion: 1,
          reason: "A proposal",
          sourceIds: ["northstar-note-1"],
          state: "pending",
          createdAt: "2026-10-03",
          version: 1,
        },
      }),
    );
    s = applyCommand(
      s,
      cmd(s, {
        type: "work.save",
        work: { ...s.work[0], classification: "core product" },
      }),
    );
    expect(() =>
      applyCommand(
        s,
        cmd(s, {
          type: "proposal.resolve",
          proposalId: "correction",
          disposition: "accept",
        }),
      ),
    ).toThrow("Same-field conflict");
    expect(s.work[0].classification).toBe("core product");
  });
  it("rejects arbitrary correction field and cross-partner evidence", () => {
    const s = seed();
    expect(() =>
      applyCommand(
        s,
        cmd(s, {
          type: "partner.save",
          partner: {
            ...s.partners[0],
            checks: s.partners[0].checks.map((ch, i) =>
              i ? ch : { ...ch, status: "met", sourceId: "kite-note-1" },
            ),
          },
        }),
      ),
    ).toThrow("another partner");
  });
  it("rejects fake paid / outcome state through generic edits", () => {
    const s = seed();
    expect(() =>
      applyCommand(
        s,
        cmd(s, {
          type: "partner.save",
          partner: { ...s.partners[0], stage: "customer" },
        }),
      ),
    ).toThrow("receipt");
    expect(() =>
      applyCommand(
        s,
        cmd(s, {
          type: "partner.save",
          partner: { ...s.partners[0], stage: "outcome achieved" },
        }),
      ),
    ).toThrow("observation");
  });
  it("isolates imports, rejects duplicates and preserves on failure", () => {
    const s = seed();
    expect(() =>
      applyCommand(
        s,
        cmd(s, {
          type: "partners.import",
          partners: [newPartner("real", "Actual org")],
          sources: [],
        }),
      ),
    ).toThrow("live program");
    s.mode = "live";
    const original = structuredClone(s);
    expect(() =>
      applyCommand(
        s,
        cmd(s, {
          type: "partners.import",
          partners: [newPartner("northstar", "New")],
          sources: [],
        }),
      ),
    ).toThrow("ID conflict");
    expect(s).toEqual(original);
  });
  it("unknowns stay in checklist denominator; critical blockers override", () => {
    const p = seed().partners[0];
    p.checks = p.checks.map((c, i) => ({
      ...c,
      status: i < 6 ? "met" : i < 8 ? "blocked" : "unknown",
    }));
    expect(readiness(p)).toMatchObject({
      met: 6,
      total: 10,
      percent: 60,
      blocked: 2,
      unknown: 2,
      ready: false,
    });
  });
  it("N/A reason required", () => {
    const s = seed();
    const p = structuredClone(s.partners[0]);
    p.checks[0].status = "not applicable";
    p.checks[0].reason = "";
    expect(() =>
      applyCommand(s, cmd(s, { type: "partner.save", partner: p })),
    ).toThrow("reason");
  });
  it("canonical schema round-trips all records and formula inputs", () => {
    const s = seed();
    expect(StateSchema.parse(JSON.parse(JSON.stringify(s)))).toEqual(s);
  });
});
it("N/A checks with reasons reduce only the applicable denominator", () => {
  const p = seed().partners[0];
  p.checks = p.checks.map((c, i) => ({
    ...c,
    status: i === 8 ? "not applicable" : "met",
    reason: i === 8 ? "No regulated data under policy v1" : "Documented",
  }));
  expect(readiness(p)).toMatchObject({
    met: 9,
    total: 9,
    percent: 100,
    ready: true,
  });
});
it("existing ARR changes the conditional concentration without becoming cash", () => {
  const s = seed();
  s.partners[0].currentArrCents = 2000000;
  expect(calculate(s, ["custom_approval"]).projectedConcentration).toBeCloseTo(
    50000 / 70000,
  );
  expect(calculate(s, ["custom_approval"]).currentArr).toBe(2000000);
});
it("late output after cancellation is quarantined", () => {
  let s = seed();
  const run = {
    id: "job",
    role: "Smith" as const,
    status: "cancelled" as const,
    inputVersion: s.version,
    inputHash: inputHash(s),
    promptVersion: "test",
    model: "mock",
    provider: "mock",
    attempt: 1,
    createdAt: "2026-10-03",
    updatedAt: "2026-10-03",
    requestId: "",
    output: null,
    error: "",
    receipts: [],
    tokens: null,
  };
  s = applyCommand(s, cmd(s, { type: "run.save", run }));
  s = applyCommand(
    s,
    cmd(s, {
      type: "run.save",
      run: { ...run, status: "complete", output: { summary: "Late" } },
    }),
  );
  expect(s.runs[0].status).toBe("quarantined");
});
it("replacement plan releases old assignments while preserving delivery", () => {
  let s = seed();
  s = applyCommand(
    s,
    cmd(s, {
      type: "plan.commit",
      selected: ["salesforce"],
      inputHash: inputHash(s),
      reason: "Shared scope first",
      exception: "",
    }),
  );
  s = applyCommand(
    s,
    cmd(s, { type: "work.save", work: { ...s.work[0], effort: 22 } }),
  );
  s = applyCommand(
    s,
    cmd(s, {
      type: "plan.commit",
      selected: ["custom_approval"],
      inputHash: inputHash(s),
      reason: "Reviewed enterprise strategy instead",
      exception: "",
    }),
  );
  expect(s.work.find((w) => w.id === "salesforce")?.status).toBe("proposed");
  expect(s.work.find((w) => w.id === "custom_approval")?.status).toBe("queued");
  expect(s.decisions.filter((d) => !d.stale)).toHaveLength(1);
});
it("moving a confirmed request updates attribution and purchase gates", () => {
  let s = seed();
  s = applyCommand(
    s,
    cmd(s, {
      type: "request.link",
      requestId: "northstar-salesforce",
      workId: "custom_approval",
      reason: "Founder reviewed changed requirement scope",
    }),
  );
  expect(s.partners[0].requiredWork).toEqual(["custom_approval"]);
  expect(s.work[0].partnerIds).toEqual(["juniper"]);
  expect(s.work[0].sourceIds).not.toContain("northstar-note-1");
  expect(calculate(s, ["salesforce"]).value).toBe(800000);
  expect(s.history.at(-1)?.action).toContain("changed requirement scope");
});
it("reported customer agreement upgrades relationship without inventing paid status or ARR", () => {
  let s = seed();
  s = applyCommand(
    s,
    cmd(s, {
      type: "milestone.record",
      partnerId: "kite",
      sourceId: "kite-note-1",
      kind: "customer",
    }),
  );
  expect(s.partners[2]).toMatchObject({
    stage: "customer",
    customerSourceId: "kite-note-1",
    paymentSourceId: "",
    currentArrCents: 0,
  });
});
it("live imports cannot smuggle fixture evidence or commercial milestones", () => {
  const s = seed();
  s.mode = "live";
  const p = newPartner("new", "New partner");
  expect(() =>
    applyCommand(
      s,
      cmd(s, {
        type: "partners.import",
        partners: [{ ...p, customerSourceId: "forged" }],
        sources: [],
      }),
    ),
  ).toThrow("unverified prospects");
  expect(() =>
    applyCommand(
      s,
      cmd(s, {
        type: "partners.import",
        partners: [p],
        sources: [{ ...s.sources[0], id: "new-source", partnerId: p.id }],
      }),
    ),
  ).toThrow("Fixture source");
});
