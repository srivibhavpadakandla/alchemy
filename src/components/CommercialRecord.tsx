"use client";
import { Partner } from "@/lib/domain";
import { useGuild } from "./Workspace";
export function CommercialRecord({
  partner: p,
  onDone,
}: {
  partner: Partner;
  onDone: () => void;
}) {
  const { state, mutate } = useGuild();
  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        const f = new FormData(e.currentTarget);
        const sourceId = String(f.get("source"));
        if (f.get("kind") === "arr") {
          if (
            await mutate({
              type: "revenue.record",
              partnerId: p.id,
              sourceId,
              annualCents: Math.round(Number(f.get("amount")) * 100),
            })
          )
            onDone();
        } else if (
          await mutate({
            type: "milestone.record",
            partnerId: p.id,
            sourceId,
            kind: f.get("kind") === "customer" ? "customer" : "payment",
          })
        )
          onDone();
      }}
    >
      <p>
        Annual recurring revenue and collected cash are different. Cite the
        agreement or billing receipt; a hypothetical opportunity cannot become
        revenue by selecting a feature.
      </p>
      <label>
        Record type
        <select name="kind">
          <option value="arr">Current contracted ARR · annual USD basis</option>
          <option value="customer">
            Reported/documented customer agreement · no payment assumed
          </option>
          <option value="paid">
            Documented payment receipt · upgrade paid badge
          </option>
        </select>
      </label>
      <label>
        Current contracted annual amount (for ARR record)
        <input
          name="amount"
          type="number"
          min="0"
          step=".01"
          defaultValue={p.currentArrCents / 100}
        />
      </label>
      <label>
        Documented evidence
        <select name="source" required>
          {state.sources
            .filter(
              (s) =>
                s.partnerId === p.id &&
                [
                  "billing receipt",
                  "direct acknowledgment",
                  "reported note",
                  "fixture",
                ].includes(s.kind),
            )
            .map((s) => (
              <option key={s.id} value={s.id}>
                {s.title} · {s.kind}
              </option>
            ))}
        </select>
      </label>
      {state.mode === "demo" && (
        <p className="notice amber">
          This is a separately labeled fictional evidence event. It does not
          assert a real payment or customer.
        </p>
      )}
      <button className="button primary">
        Record reviewed commercial evidence
      </button>
    </form>
  );
}
