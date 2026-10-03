import { State } from "./domain";
export function redactedShare(s: State) {
  return {
    schema: "launchguild-share-v1",
    mode: s.mode,
    period: s.capacity.period,
    capacity: {
      total: s.capacity.total,
      core: s.capacity.core,
      support: s.capacity.support,
    },
    plans: s.decisions.map((d) => ({
      id: d.id,
      createdAt: d.createdAt,
      stale: d.stale,
      formula: d.formula,
      selectedPoints: d.result.effort,
      totalPoints: d.result.total,
      remainingPoints: d.result.remaining,
    })),
    disclosure:
      "Read-only redacted planning summary. No partner names, people, sources, commercial amounts or internal notes included. A plan is not delivery or revenue.",
  };
}
