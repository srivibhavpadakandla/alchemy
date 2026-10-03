"use client";
import { useState } from "react";
import {
  Plus,
  Check,
  ArrowRight,
  AlertTriangle,
  GitBranch,
  Save,
} from "lucide-react";
import { calculate, inputHash, money, State } from "@/lib/domain";
import { useGuild, Modal, Tag } from "./Workspace";
export function Capacity() {
  const { state, mutate, openSource, notice } = useGuild();
  const [selected, setSelected] = useState<string[]>(
      state.work.length ? [state.work[0].id] : [],
    ),
    [commit, setCommit] = useState(false),
    [reason, setReason] = useState(""),
    [exception, setException] = useState(""),
    [saved, setSaved] = useState(false),
    [snapshot, setSnapshot] = useState("");
  const r = calculate(state, selected);
  const toggle = (id: string) =>
    setSelected((s) =>
      s.includes(id) ? s.filter((x) => x !== id) : [...s, id],
    );
  const pct = (n: number | null) =>
    n === null ? "Unavailable" : `${(n * 100).toFixed((n * 100) % 1 ? 2 : 0)}%`;
  return (
    <>
      <div className="capacity-intro">
        <div>
          <Tag tone="purple">SCENARIO PREVIEW</Tag>
          <p>
            Compare the work, see the consequences, then make the call.
            <br />
            Selected work stays a proposal until you review and commit it.
          </p>
        </div>
        <div className="period-badge">
          {state.capacity.period}
          <small>Engineering points · team estimates</small>
        </div>
      </div>
      <div className="capacity-layout">
        <section className="panel work-picker">
          <div className="section-heading">
            <h2>Work on the table</h2>
            <span>{state.work.length} scoped items</span>
          </div>
          {state.work.map((w) => (
            <article
              key={w.id}
              className={`work-card ${r.selected.includes(w.id) ? "selected" : ""}`}
              draggable
              onDragStart={(e) => e.dataTransfer.setData("text/plain", w.id)}
            >
              <div className="inline spread">
                <Tag
                  tone={
                    w.classification.includes("customization")
                      ? "purple"
                      : "green"
                  }
                >
                  {w.classification}
                </Tag>
                <span className="points">
                  {w.effort ?? "?"}
                  <small> pts</small>
                </span>
              </div>
              <h3>{w.title}</h3>
              <p>{w.scope}</p>
              <div className="work-partners">
                <GitBranch size={14} />
                {w.partnerIds
                  .map(
                    (id) =>
                      state.partners
                        .find((p) => p.id === id)
                        ?.name.split(" ")[0],
                  )
                  .join(" + ")}
                <span>
                  {w.low ?? "?"}–{w.high ?? "?"} pts range
                </span>
              </div>
              {w.dependencies.length > 0 && (
                <p>Requires: {w.dependencies.join(", ")}</p>
              )}
              <div className="inline spread">
                <button
                  className="text-button"
                  onClick={() => openSource(w.sourceIds[0])}
                >
                  Open source evidence ↗
                </button>
                <button
                  className={`button small ${selected.includes(w.id) ? "selected-button" : ""}`}
                  onClick={() => toggle(w.id)}
                >
                  {selected.includes(w.id) ? (
                    <Check size={15} />
                  ) : (
                    <Plus size={15} />
                  )}{" "}
                  {selected.includes(w.id) ? "Selected" : "Add to plan"}
                </button>
              </div>
            </article>
          ))}
        </section>
        <section
          className="panel plan-summary"
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            const id = e.dataTransfer.getData("text/plain");
            if (state.work.some((w) => w.id === id) && !selected.includes(id))
              setSelected([...selected, id]);
          }}
        >
          <div className="section-heading">
            <h2>Your monthly allocation</h2>
            <Tag
              tone={r.remaining !== null && r.remaining < 0 ? "red" : "green"}
            >
              {r.remaining !== null && r.remaining < 0
                ? "OVER CAPACITY"
                : "DRAFT PLAN"}
            </Tag>
          </div>
          <div className="big-capacity">
            <strong>{r.total ?? "?"}</strong>
            <span>
              / {state.capacity.total}
              <small>total points, including reserves</small>
            </span>
          </div>
          <div className="capacity-bar">
            <i
              className="core"
              style={{
                width: `${state.capacity.total ? (state.capacity.core / state.capacity.total) * 100 : 0}%`,
              }}
            />
            <i
              className="support"
              style={{
                width: `${state.capacity.total ? (state.capacity.support / state.capacity.total) * 100 : 0}%`,
              }}
            />
            <i
              className="allocated"
              style={{
                width: `${state.capacity.total ? (Math.min(r.effort ?? 0, Math.max(0, r.discretionary)) / state.capacity.total) * 100 : 0}%`,
              }}
            />
          </div>
          <div className="bar-legend">
            <span>
              <i className="core" />
              {state.capacity.core} core
            </span>
            <span>
              <i className="support" />
              {state.capacity.support} support
            </span>
            <span>
              <i className="allocated" />
              {r.effort ?? "?"} selected
            </span>
            <span>
              <i />
              {r.remaining ?? "?"} remaining
            </span>
          </div>
          <dl className="calculation">
            <div>
              <dt>Selected work / discretionary</dt>
              <dd>
                {r.effort ?? "?"} / {r.discretionary} pts
              </dd>
            </div>
            <div>
              <dt>Share of total capacity</dt>
              <dd>{pct(r.totalShare)}</dd>
            </div>
            <div>
              <dt>Share of discretionary capacity</dt>
              <dd>{pct(r.discretionaryShare)}</dd>
            </div>
            <div>
              <dt>Estimate range + reserves</dt>
              <dd>
                {r.low === null ? "?" : r.low + r.reserved}–
                {r.high === null ? "?" : r.high + r.reserved} pts
              </dd>
            </div>
            <div>
              <dt>Distinct partner coverage</dt>
              <dd>{r.partnerIds.length} partners</dd>
            </div>
          </dl>
          <div className="opportunity-total">
            <span>ASSOCIATED CONDITIONAL ANNUAL OPPORTUNITY</span>
            <strong>{money(r.value)}</strong>
            <small>USD / year · each partner counted once</small>
          </div>
          {selected.includes("csv") && selected.includes("salesforce") && (
            <div className="notice info">
              CSV adds <b>$0 additional deal value</b>. Juniper’s $8,000 is
              already counted with Salesforce.
            </div>
          )}
          <p className="commercial-note">
            <AlertTriangle size={17} /> {money(r.unblockedValue)} commercially
            unblocked. Delivery, acceptance, buyer, terms and security still
            need evidence.
          </p>
          {r.remaining !== null && r.remaining < 0 && (
            <div className="notice error">
              Overbooked by <b>{-r.remaining} points</b>. Remove work or
              explicitly justify a capacity exception at review.
            </div>
          )}
          {r.high !== null && r.high + r.reserved > state.capacity.total && (
            <p className="notice amber">
              The upper estimate reaches {r.high + r.reserved} points, exceeding
              capacity by {r.high + r.reserved - state.capacity.total}. Scope
              risk remains.
            </p>
          )}
          {r.errors.map((e) => (
            <p className="notice error" key={e}>
              {e}
            </p>
          ))}
          <div className="inline actions">
            <button
              className="button"
              disabled={!selected.length}
              onClick={() => setSaved(true)}
            >
              <Save size={16} /> Save scenario
            </button>
            <button
              className="button primary"
              disabled={!selected.length || r.unknown || r.errors.length > 0}
              onClick={() => {
                setSnapshot(inputHash(state));
                setCommit(true);
              }}
            >
              Review plan <ArrowRight size={16} />
            </button>
          </div>
        </section>
      </div>
      {state.mode === "demo" && (
        <section className="comparison">
          <div className="section-heading">
            <div>
              <span className="eyebrow">TWO VALID DIRECTIONS</span>
              <h2>Shared progress or a strategic exception?</h2>
            </div>
          </div>
          <div className="compare-grid">
            <Comparison
              state={state}
              selected={["salesforce"]}
              title="Build for the cohort"
              onSelect={() => setSelected(["salesforce"])}
            />
            <Comparison
              state={state}
              selected={["custom_approval"]}
              title="Invest in the enterprise bet"
              onSelect={() => setSelected(["custom_approval"])}
            />
          </div>
          <div className="notice info">
            <b>Longer-horizon illustration:</b> if all three eventually convert
            and existing ARR is zero, conditional annual total is{" "}
            {money(
              calculate(
                state,
                state.work.map((w) => w.id),
              ).projectedTotal,
            )}
            . Largest share:{" "}
            {pct(
              calculate(
                state,
                state.work.map((w) => w.id),
              ).projectedConcentration,
            )}
            . This is not current-month delivery or earned revenue.
          </div>
        </section>
      )}
      <section className="panel">
        <h2>Saved scenarios</h2>
        {!state.scenarios.length ? (
          <p className="muted">
            Save the assumptions behind a comparison so you can revisit it.
          </p>
        ) : (
          state.scenarios.map((s) => (
            <div className="history-row" key={s.id}>
              <strong>{s.name}</strong>
              <Tag tone={s.inputHash === inputHash(state) ? "green" : "amber"}>
                {s.inputHash === inputHash(state)
                  ? "CURRENT"
                  : "STALE · RECOMPUTE"}
              </Tag>
              <button
                className="button small"
                onClick={() => setSelected(s.selected)}
              >
                Open and recompute
              </button>
            </div>
          ))
        )}
      </section>
      {saved && (
        <Modal title="Save this scenario" onClose={() => setSaved(false)}>
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              const data = new FormData(e.currentTarget);
              if (
                await mutate({
                  type: "scenario.save",
                  selected,
                  name: String(data.get("name")),
                  assumptions: String(data.get("assumptions")),
                })
              )
                setSaved(false);
            }}
          >
            <label>
              Scenario name
              <input
                name="name"
                required
                defaultValue={`Plan ${state.scenarios.length + 1}`}
              />
            </label>
            <label>
              Assumptions
              <textarea
                name="assumptions"
                defaultValue="Delivery and purchase remain conditional. Reserve core and support capacity in full."
              />
            </label>
            <button className="button primary">Save draft scenario</button>
          </form>
        </Modal>
      )}
      {commit && (
        <Modal
          title="Review your founder decision"
          onClose={() => setCommit(false)}
        >
          <Tag tone="amber">INTERNAL ASSIGNMENTS ONLY</Tag>
          <h3>
            {r.selected
              .map((id) => state.work.find((w) => w.id === id)?.title)
              .join(" + ")}
          </h3>
          <p>
            {r.effort} points of selected work. {r.remaining} points remaining.{" "}
            {money(r.value)} conditional annual opportunity, not revenue.
          </p>
          <p>
            Committing queues the selected work. Pilot stages, customer
            promises, and payment records remain unchanged.
          </p>
          <label>
            Why is this the right tradeoff?
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Include strategic fit, learning, scope and the next owner/action."
            />
          </label>
          {r.remaining !== null && r.remaining < 0 && (
            <label>
              Explicit over-capacity exception
              <textarea
                value={exception}
                onChange={(e) => setException(e.target.value)}
                placeholder="Explain the extra capacity and why this exception is authorized."
              />
            </label>
          )}
          <button
            className="button primary"
            disabled={reason.trim().length < 5}
            onClick={async () => {
              if (
                await mutate({
                  type: "plan.commit",
                  selected,
                  inputHash: snapshot,
                  reason,
                  exception,
                })
              ) {
                setCommit(false);
                notice(
                  "Decision committed. Work queued; no delivery or sale recorded.",
                );
              }
            }}
          >
            Commit reviewed plan <Check size={16} />
          </button>
        </Modal>
      )}
    </>
  );
}
function Comparison({
  state,
  selected,
  title,
  onSelect,
}: {
  state: State;
  selected: string[];
  title: string;
  onSelect: () => void;
}) {
  const r = calculate(state, selected);
  return (
    <article className="panel">
      <Tag tone={selected[0] === "salesforce" ? "green" : "purple"}>
        {selected[0] === "salesforce" ? "SHARED ROUTE" : "CUSTOM ROUTE"}
      </Tag>
      <h3>{title}</h3>
      <div className="compare-numbers">
        <div>
          <strong>{r.effort}</strong>
          <span>selected points</span>
        </div>
        <div>
          <strong>{money(r.value)}</strong>
          <span>conditional annual</span>
        </div>
        <div>
          <strong>
            {r.projectedConcentration === null
              ? "—"
              : `${Math.round(r.projectedConcentration * 100)}%`}
          </strong>
          <span>if covered deals convert</span>
        </div>
      </div>
      <p>
        {selected[0] === "salesforce"
          ? "Observed overlap in two partners. Wider market demand is still a hypothesis."
          : "Can be justified by enterprise strategy, learning or service economics. Record your reason; support and portability are open."}
      </p>
      <p className="muted">
        Current concentration:{" "}
        {r.currentConcentration === null
          ? "no current revenue"
          : `${r.currentConcentration * 100}%`}
        . Future share assumes only these deals convert.
      </p>
      <button className="button" onClick={onSelect}>
        Use this scenario <ArrowRight size={15} />
      </button>
    </article>
  );
}
