"use client";
import { useGuild } from "./Workspace";
import { classes, Work } from "@/lib/domain";
export function WorkCreate({ onDone }: { onDone: () => void }) {
  const { state, mutate } = useGuild();
  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        const f = new FormData(e.currentTarget),
          ids = f.getAll("partners").map(String),
          number = (key: string) =>
            String(f.get(key)).trim() ? Number(f.get(key)) : null;
        if (
          await mutate({
            type: "work.save",
            work: {
              id: crypto.randomUUID(),
              version: 1,
              title: String(f.get("title")),
              classification: String(f.get("class")) as Work["classification"],
              classificationState: "proposed",
              classificationReason:
                "Founder-supplied scope; classification awaits review.",
              effort: number("effort"),
              low: number("low"),
              high: number("high"),
              estimator: "Founder estimate",
              estimateDate: new Date().toISOString().slice(0, 10),
              scope: String(f.get("scope")),
              dependencies: f.getAll("dependencies").map(String),
              excludes: [],
              partnerIds: ids,
              sourceIds: f.getAll("sources").map(String),
              acceptance: String(f.get("acceptance")),
              status: "proposed",
              deliverySourceId: "",
            },
          })
        )
          onDone();
      }}
    >
      <label>
        Work title
        <input name="title" required />
      </label>
      <label>
        Proposed primary class
        <select name="class">
          {classes.map((c) => (
            <option key={c}>{c}</option>
          ))}
        </select>
      </label>
      <label>
        Scope, setup and support assumptions
        <textarea name="scope" required />
      </label>
      <label>
        Acceptance criteria
        <textarea name="acceptance" required />
      </label>
      <div className="form-grid">
        {["effort", "low", "high"].map((n) => (
          <label key={n}>
            {n} estimate · blank means unknown
            <input name={n} type="number" min="0" step=".5" />
          </label>
        ))}
      </div>
      <fieldset>
        <legend>Confirmed cohort partners</legend>
        {state.partners.map((p) => (
          <label className="checkbox-label" key={p.id}>
            <input type="checkbox" name="partners" value={p.id} />
            {p.name}
          </label>
        ))}
      </fieldset>
      <fieldset>
        <legend>Supporting source records</legend>
        {state.sources.map((s) => (
          <label className="checkbox-label" key={s.id}>
            <input type="checkbox" name="sources" value={s.id} />
            {s.title} · {s.partnerId}
          </label>
        ))}
      </fieldset>
      <fieldset>
        <legend>Dependencies</legend>
        {state.work.map((w) => (
          <label className="checkbox-label" key={w.id}>
            <input type="checkbox" name="dependencies" value={w.id} />
            {w.title}
          </label>
        ))}
      </fieldset>
      <button className="button primary">Create proposed work item</button>
    </form>
  );
}
export function RequestCreate({ onDone }: { onDone: () => void }) {
  const { state, mutate } = useGuild();
  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        const f = new FormData(e.currentTarget),
          src = state.sources.find((s) => s.id === f.get("source"));
        if (!src) return;
        if (
          await mutate({
            type: "request.add",
            request: {
              id: crypto.randomUUID(),
              partnerId: src.partnerId,
              sourceId: src.id,
              quote: String(f.get("quote")),
              workId: String(f.get("work")),
              linkState: "proposed",
              mustHave: f.get("mustHave") === "on",
              assertedBy: String(f.get("assertedBy")),
              version: 1,
            },
          })
        )
          onDone();
      }}
    >
      <label>
        Partner-scoped source
        <select name="source" required>
          {state.sources.map((s) => (
            <option key={s.id} value={s.id}>
              {s.partnerId} · {s.title}
            </option>
          ))}
        </select>
      </label>
      <label>
        Verbatim request passage
        <textarea name="quote" required />
      </label>
      <label>
        Who asserts this requirement?
        <input name="assertedBy" required />
      </label>
      <label className="checkbox-label">
        <input name="mustHave" type="checkbox" /> Explicitly stated must-have
      </label>
      <label>
        Proposed work link
        <select name="work" required>
          {state.work.map((w) => (
            <option key={w.id} value={w.id}>
              {w.title}
            </option>
          ))}
        </select>
      </label>
      <button className="button primary">Save proposed request link</button>
    </form>
  );
}
