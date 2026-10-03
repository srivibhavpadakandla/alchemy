"use client";
import { useState } from "react";
import Link from "next/link";
import {
  Plus,
  ArrowLeft,
  Pencil,
  CheckCircle2,
  HelpCircle,
  AlertCircle,
} from "lucide-react";
import {
  Partner,
  newPartner,
  money,
  readiness,
  hash,
  stages,
  State,
  Source,
} from "@/lib/domain";
import { CommercialRecord } from "./CommercialRecord";
import { useGuild, Tag, Modal, Empty } from "./Workspace";
export function PartnerPanel({ partner: p }: { partner: Partner }) {
  const { state, base, mutate, openSource } = useGuild();
  const [tab, setTab] = useState("Overview"),
    [editing, setEditing] = useState(false),
    [note, setNote] = useState(false),
    [pilot, setPilot] = useState(false),
    [promise, setPromise] = useState(false),
    [check, setCheck] = useState<Partner["checks"][0] | null>(null),
    [observation, setObservation] = useState(false),
    [commercial, setCommercial] = useState(false),
    [reviewPilot, setReviewPilot] = useState(false);
  const r = readiness(p),
    sources = state.sources.filter((x) => x.partnerId === p.id),
    agreements = state.agreements.filter((a) => a.partnerId === p.id),
    agreement = agreements.at(-1);
  return (
    <>
      <Link className="back-link" href={`${base}/partners`}>
        <ArrowLeft size={14} /> All partners
      </Link>
      <section className="partner-heading">
        <div className="partner-initial large">{p.name[0]}</div>
        <div>
          <div className="inline">
            <h2>{p.name}</h2>
            <Tag tone="green">{p.stage}</Tag>
            <Tag>{p.origin}</Tag>
          </div>
          <p>
            {p.segment || "Segment unknown"} · Owner: {p.owner} · Record v
            {p.version}
          </p>
        </div>
        <button className="button" onClick={() => setEditing(true)}>
          <Pencil size={15} /> Edit partner
        </button>
      </section>
      <div className="record-tabs" role="tablist">
        {[
          "Overview",
          "People & pilot",
          "Requests & promises",
          "Readiness",
          "Evidence",
          "History",
        ].map((t) => (
          <button
            key={t}
            role="tab"
            aria-selected={t === tab}
            onClick={() => setTab(t)}
          >
            {t}
          </button>
        ))}
      </div>
      {tab === "Overview" && (
        <div className="record-grid">
          <section className="panel">
            <span className="eyebrow">THE RELATIONSHIP</span>
            <h2>What brought them here?</h2>
            <h4>Target problem</h4>
            <p>{p.problem || "Not yet recorded."}</p>
            <h4>Current workaround</h4>
            <p>{p.workaround || "Unknown"}</p>
            <h4>Fit and uncertainty</h4>
            <p>{p.fit}</p>
            <div className="record-callout">
              <strong>{money(p.opportunityCents, p.currency)}</strong>
              <span>Conditional {p.basis} opportunity</span>
              <small>Not agreed revenue, purchase probability or cash.</small>
            </div>
          </section>
          <section className="panel">
            <span className="eyebrow">THE NEXT REAL STEP</span>
            <h2>{p.nextAction.action}</h2>
            <p>
              {p.nextAction.owner} · {p.nextAction.date}
            </p>
            <Tag tone="amber">
              {r.critical.length} unconfirmed critical checks
            </Tag>
            <h4>Product outcome</h4>
            <p>
              {p.outcomeSourceId
                ? "Evidence-backed outcome recorded."
                : "No evidenced outcome has been recorded."}
            </p>
            <h4>Commercial status</h4>
            <button className="text-button" onClick={() => setCommercial(true)}>
              Record agreement / payment evidence ↗
            </button>
            <p>
              {p.paymentSourceId
                ? "Paid receipt recorded; inspect source for scope and amount."
                : "No payment evidence. Buyer, terms and security require separate confirmation."}
            </p>
            {p.customerSourceId && (
              <button
                className="text-button"
                onClick={() => openSource(p.customerSourceId)}
              >
                {state.sources.find((s) => s.id === p.customerSourceId)
                  ?.kind === "reported note"
                  ? "Reported customer agreement"
                  : "Documented customer agreement"}{" "}
                · inspect evidence ↗
              </button>
            )}
            {agreement &&
              agreement.reviewDate < new Date().toISOString().slice(0, 10) && (
                <p className="notice amber">
                  Decision overdue. Convert, close or propose a bounded
                  extension with a new goal and date.
                </p>
              )}
            <button
              className="button primary"
              onClick={() => setTab("Readiness")}
            >
              Inspect readiness checks →
            </button>
          </section>
        </div>
      )}
      {tab === "People & pilot" && (
        <>
          <div className="record-grid">
            <section className="panel">
              <h2>People at the table</h2>
              {p.people.map((person, i) => (
                <div className="person-row" key={i}>
                  <span className="avatar">{person.name[0]}</span>
                  <div>
                    <strong>{person.name}</strong>
                    <small>{person.role}</small>
                  </div>
                  <button
                    className="text-button"
                    onClick={() => openSource(person.sourceId)}
                  >
                    Source ↗
                  </button>
                </div>
              ))}
              {!p.people.some((x) =>
                x.role.toLowerCase().includes("buyer"),
              ) && (
                <p className="notice amber">Economic buyer not identified.</p>
              )}
              <p className="muted">
                Champion, user, buyer, technical, security and procurement roles
                should be explicit. Add known people in Edit partner.
              </p>
            </section>
            <section className="panel">
              <div className="inline spread">
                <h2>Agreed pilot</h2>
                <button className="button small" onClick={() => setPilot(true)}>
                  {agreement ? "Propose amendment" : "Draft pilot"}
                </button>
              </div>
              {agreement ? (
                <>
                  <Tag>
                    {agreement.state} · v{agreement.version}
                  </Tag>
                  <button
                    className="text-button"
                    onClick={() => setReviewPilot(true)}
                  >
                    Review agreement status ↗
                  </button>
                  <p>{agreement.scope}</p>
                  <dl className="calculation">
                    <div>
                      <dt>Start → end</dt>
                      <dd>
                        {agreement.start} → {agreement.end}
                      </dd>
                    </div>
                    <div>
                      <dt>Review / purchase discussion</dt>
                      <dd>{agreement.reviewDate}</dd>
                    </div>
                    <div>
                      <dt>Success metric</dt>
                      <dd>
                        {agreement.metric} ≥ {agreement.target}
                      </dd>
                    </div>
                  </dl>
                  <details>
                    <summary>Full reciprocal agreement and exclusions</summary>
                    <dl className="detail-list">
                      {Object.entries(agreement).map(([k, v]) => (
                        <div key={k}>
                          <dt>{k}</dt>
                          <dd>{String(v ?? "Unknown")}</dd>
                        </div>
                      ))}
                    </dl>
                  </details>
                  <p className="muted">
                    Draft generation is not an executed or legally reviewed
                    contract. Amendments preserve the original outcome.
                  </p>
                </>
              ) : (
                <Empty title="No pilot agreement yet">
                  Draft a bounded pilot with responsibilities and measurable
                  success.
                </Empty>
              )}
            </section>
          </div>
          <section className="panel">
            <div className="inline spread">
              <h2>Metric observations</h2>
              <button
                className="button"
                disabled={!agreement}
                onClick={() => setObservation(true)}
              >
                Record observation
              </button>
            </div>
            {state.observations
              .filter((o) => o.partnerId === p.id)
              .map((o) => (
                <div className="history-row" key={o.id}>
                  <strong>
                    {o.numerator}/{o.denominator}
                  </strong>
                  <span>
                    {o.period} · {o.health} · {o.origin}
                  </span>
                  <button
                    className="text-button"
                    onClick={() => openSource(o.sourceId)}
                  >
                    Source ↗
                  </button>
                  <button
                    className="button small"
                    onClick={() =>
                      void mutate({
                        type: "milestone.record",
                        partnerId: p.id,
                        sourceId: o.sourceId,
                        agreementId: o.agreementId,
                        kind: "outcome",
                      })
                    }
                  >
                    Review and record outcome
                  </button>
                </div>
              ))}
            {!state.observations.some((o) => o.partnerId === p.id) && (
              <p className="muted">
                Measurement unavailable. No telemetry integration is configured;
                missing data is not zero usage.
              </p>
            )}
          </section>
        </>
      )}
      {tab === "Requests & promises" && (
        <>
          <section className="panel">
            <h2>Requests → shared work</h2>
            {state.requests
              .filter((x) => x.partnerId === p.id)
              .map((req) => (
                <div className="source-quote" key={req.id}>
                  <Tag tone={req.mustHave ? "amber" : "neutral"}>
                    {req.mustHave ? "MUST-HAVE" : "OPTIONAL"}
                  </Tag>
                  <blockquote>“{req.quote}”</blockquote>
                  <p>
                    Linked to{" "}
                    <b>{state.work.find((w) => w.id === req.workId)?.title}</b>{" "}
                    · {req.linkState}
                  </p>
                  <button
                    className="text-button"
                    onClick={() => openSource(req.sourceId)}
                  >
                    Open exact source ↗
                  </button>
                </div>
              ))}
          </section>
          <section className="panel">
            <div className="inline spread">
              <h2>The promise ledger</h2>
              <button className="button" onClick={() => setPromise(true)}>
                <Plus size={14} /> Draft promise
              </button>
            </div>
            {state.promises
              .filter((x) => x.partnerId === p.id)
              .map((pr) => (
                <div className="source-quote" key={pr.id}>
                  <Tag>{pr.state}</Tag>
                  <blockquote>{pr.wording}</blockquote>
                  <p>
                    {pr.actor} → {pr.recipient} · {pr.deadline}
                  </p>
                  <p>{pr.conditions}</p>
                  <button
                    className="text-button"
                    onClick={() => openSource(pr.sourceId)}
                  >
                    Evidence ↗
                  </button>
                </div>
              ))}
            {!state.promises.some((pr) => pr.partnerId === p.id) && (
              <Empty title="A request is not a promise">
                No promises have been recorded. The source conversation may
                describe evaluation without an agreed delivery commitment.
              </Empty>
            )}
          </section>
        </>
      )}
      {tab === "Readiness" && (
        <>
          <div className="readiness-banner">
            <div>
              <strong>
                {r.met}
                <span>/{r.total}</span>
              </strong>
              <p>applicable checks confirmed</p>
            </div>
            <div>
              <h2>
                {r.ready
                  ? "Checklist complete; payment still separate"
                  : p.outcomeSourceId
                    ? "Product outcome achieved; commercial blockers remain"
                    : "Evidence before confidence."}
              </h2>
              <p>
                {r.blocked} blocked · {r.unknown} unknown or stale ·{" "}
                {r.critical.length} critical requirements unresolved
              </p>
              <small>
                This is checklist completion. It is not a probability of
                purchase.
              </small>
            </div>
          </div>
          <div className="record-grid">
            {(["product", "commercial"] as const).map((group) => (
              <section className="panel" key={group}>
                <h2>
                  {group === "product"
                    ? "Product-pilot evidence"
                    : "Commercial readiness"}
                </h2>
                {p.checks
                  .filter((c) => c.group === group)
                  .map((ch) => (
                    <button
                      className="readiness-check"
                      key={ch.id}
                      onClick={() => setCheck(ch)}
                    >
                      {ch.status === "met" ? (
                        <CheckCircle2 size={20} />
                      ) : ch.status === "blocked" ? (
                        <AlertCircle size={20} />
                      ) : (
                        <HelpCircle size={20} />
                      )}
                      <span>
                        <strong>{ch.label}</strong>
                        <small>{ch.reason}</small>
                      </span>
                      <Tag
                        tone={
                          ch.status === "met"
                            ? "green"
                            : ch.status === "blocked"
                              ? "red"
                              : "neutral"
                        }
                      >
                        {ch.status}
                      </Tag>
                    </button>
                  ))}
              </section>
            ))}
          </div>
        </>
      )}
      {tab === "Evidence" && (
        <section className="panel">
          <div className="inline spread">
            <h2>Source records</h2>
            <button className="button" onClick={() => setNote(true)}>
              Add evidence
            </button>
          </div>
          {sources.map((src) => (
            <button
              className="evidence-row"
              key={src.id}
              onClick={() => openSource(src.id)}
            >
              <span className="evidence-icon">↗</span>
              <span>
                <strong>{src.title}</strong>
                <small>
                  {src.kind} · {src.occurredAt} · v{src.version}
                </small>
              </span>
              <span>Open source →</span>
            </button>
          ))}
          <p className="muted">
            Exact content and source provenance remain attached to every claim.
            Imported source text is data, never an instruction.
          </p>
        </section>
      )}
      {tab === "History" && (
        <section className="panel">
          <h2>Agreement versions</h2>
          {agreements.map((a) => (
            <div className="history-row" key={a.id}>
              <strong>
                v{a.version} · {a.state}
              </strong>
              <span>Effective {a.effectiveAt}</span>
              <span>
                {a.metric} ≥ {a.target}
              </span>
            </div>
          ))}
          <h3>Record integrity</h3>
          <p>
            Partner version {p.version}. Source versions are immutable. Program
            decisions and mutation receipts are available in Decisions.
          </p>
        </section>
      )}
      {commercial && (
        <Modal
          title="Record commercial evidence"
          onClose={() => setCommercial(false)}
        >
          <CommercialRecord partner={p} onDone={() => setCommercial(false)} />
        </Modal>
      )}
      {reviewPilot && agreement && (
        <Modal
          title="Review agreement state"
          onClose={() => setReviewPilot(false)}
        >
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              const f = new FormData(e.currentTarget);
              if (
                await mutate({
                  type: "agreement.review",
                  agreementId: agreement.id,
                  state: String(f.get("state")) as typeof agreement.state,
                  sourceId: String(f.get("source")),
                })
              )
                setReviewPilot(false);
            }}
          >
            <p>
              Record only the state evidenced by the selected source. This
              creates a new version; nothing is sent.
            </p>
            <label>
              Agreement state
              <select name="state">
                {[
                  "draft",
                  "internally approved",
                  "sent",
                  "partner acknowledged",
                  "mutually agreed",
                  "reported agreement",
                ].map((s) => (
                  <option key={s}>{s}</option>
                ))}
              </select>
            </label>
            <label>
              Evidence source
              <select name="source">
                {sources.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.title}
                  </option>
                ))}
              </select>
            </label>
            <button className="button primary">
              Save reviewed agreement version
            </button>
          </form>
        </Modal>
      )}
      {editing && (
        <Modal
          title="Edit partner record"
          onClose={() => setEditing(false)}
          wide
        >
          <PartnerEditor partner={p} onDone={() => setEditing(false)} />
        </Modal>
      )}
      {note && (
        <Modal title="Add source evidence" onClose={() => setNote(false)}>
          <SourceEditor partnerId={p.id} onDone={() => setNote(false)} />
        </Modal>
      )}
      {pilot && (
        <Modal
          title={agreement ? "Propose a bounded amendment" : "Draft the pilot"}
          onClose={() => setPilot(false)}
          wide
        >
          <PilotEditor
            partner={p}
            previous={agreement}
            onDone={() => setPilot(false)}
          />
        </Modal>
      )}
      {promise && (
        <Modal
          title="Draft a proposed promise"
          onClose={() => setPromise(false)}
        >
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              const f = new FormData(e.currentTarget);
              if (
                await mutate({
                  type: "promise.save",
                  promise: {
                    id: crypto.randomUUID(),
                    partnerId: p.id,
                    wording: String(f.get("wording")),
                    sourceId: String(f.get("sourceId")),
                    actor: p.owner,
                    recipient: p.name,
                    state: "draft",
                    workId: String(f.get("workId")),
                    conditions: String(f.get("conditions")),
                    owner: p.owner,
                    deadline: String(f.get("deadline")),
                    version: 1,
                  },
                })
              )
                setPromise(false);
            }}
          >
            <label>
              Exact proposed wording
              <textarea name="wording" required />
            </label>
            <label>
              Source
              <select name="sourceId" required>
                {sources.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.title}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Linked work
              <select name="workId">
                <option value="">No work linked</option>
                {state.work.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.title}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Conditions and exclusions
              <textarea name="conditions" required />
            </label>
            <label>
              Deadline
              <input name="deadline" type="date" required />
            </label>
            <p className="notice info">
              This remains a draft. Nothing will be sent or represented as
              agreed.
            </p>
            <button className="button primary">Save proposed promise</button>
          </form>
        </Modal>
      )}
      {check && (
        <Modal title="Review a readiness check" onClose={() => setCheck(null)}>
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              const f = new FormData(e.currentTarget);
              const updated = {
                ...check,
                status: String(f.get("status")) as typeof check.status,
                reason: String(f.get("reason")),
                sourceId: String(f.get("sourceId")),
                reviewer: "Founder",
                reviewedAt: new Date().toISOString(),
                version: check.version + 1,
              };
              if (
                await mutate({
                  type: "partner.save",
                  partner: {
                    ...p,
                    checks: p.checks.map((c) =>
                      c.id === check.id ? updated : c,
                    ),
                  },
                })
              )
                setCheck(null);
            }}
          >
            <h3>{check.label}</h3>
            <label>
              Status
              <select name="status" defaultValue={check.status}>
                {["met", "blocked", "unknown", "stale", "not applicable"].map(
                  (s) => (
                    <option key={s}>{s}</option>
                  ),
                )}
              </select>
            </label>
            <label>
              Reason / N/A policy justification
              <textarea
                name="reason"
                defaultValue={check.reason}
                required
                minLength={5}
              />
            </label>
            <label>
              Source
              <select name="sourceId" defaultValue={check.sourceId}>
                <option value="">No source · cannot mark met</option>
                {sources.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.title}
                  </option>
                ))}
              </select>
            </label>
            <button className="button primary">Save reviewed check</button>
          </form>
        </Modal>
      )}
      {observation && agreement && (
        <Modal
          title="Record a metric observation"
          onClose={() => setObservation(false)}
        >
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              const f = new FormData(e.currentTarget);
              if (
                await mutate({
                  type: "observation.add",
                  observation: {
                    id: crypto.randomUUID(),
                    partnerId: p.id,
                    agreementId: agreement.id,
                    sourceId: String(f.get("sourceId")),
                    numerator: Number(f.get("numerator")),
                    denominator: Number(f.get("denominator")),
                    period: String(f.get("period")),
                    health: String(f.get("health")) as "healthy",
                    origin: state.mode === "demo" ? "fixture" : "reported",
                    recordedAt: new Date().toISOString(),
                  },
                })
              )
                setObservation(false);
            }}
          >
            <p>
              Metric: {agreement.metric}. This records a{" "}
              {state.mode === "demo" ? "fictional fixture" : "founder-reported"}{" "}
              observation, not verified telemetry.
            </p>
            <div className="form-grid">
              <label>
                Numerator
                <input type="number" name="numerator" required />
              </label>
              <label>
                Denominator
                <input type="number" min="1" name="denominator" required />
              </label>
            </div>
            <label>
              Evaluation period
              <input name="period" defaultValue={agreement.window} required />
            </label>
            <label>
              Collection health
              <select name="health">
                <option>healthy</option>
                <option>stale</option>
                <option>unavailable</option>
              </select>
            </label>
            <label>
              Source
              <select name="sourceId" required>
                {sources.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.title}
                  </option>
                ))}
              </select>
            </label>
            <button className="button primary">Save observation</button>
          </form>
        </Modal>
      )}
    </>
  );
}
export function PartnerEditor({
  partner,
  onDone,
}: {
  partner?: Partner;
  onDone: () => void;
}) {
  const { state, mutate } = useGuild();
  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        const f = new FormData(e.currentTarget),
          p =
            partner ??
            newPartner(
              crypto.randomUUID(),
              String(f.get("name")),
              state.mode === "demo" ? "fixture" : "manual",
            );
        const people = String(f.get("people"))
          .split("\n")
          .filter(Boolean)
          .map((line) => {
            const [name, role, sourceId] = line.split("|").map((s) => s.trim());
            return {
              name,
              role: role ?? "Unspecified",
              sourceId: sourceId ?? "",
            };
          });
        if (
          await mutate({
            type: "partner.save",
            partner: {
              ...p,
              name: String(f.get("name")),
              segment: String(f.get("segment")),
              owner: String(f.get("owner")),
              problem: String(f.get("problem")),
              workaround: String(f.get("workaround")),
              fit: String(f.get("fit")),
              opportunityCents: Math.round(Number(f.get("amount")) * 100),
              stage: String(f.get("stage")) as Partner["stage"],
              people,
              nextAction: {
                action: String(f.get("action")),
                owner: String(f.get("nextOwner")),
                date: String(f.get("nextDate")),
                blockerId: p.nextAction.blockerId,
              },
            },
          })
        )
          onDone();
      }}
    >
      <div className="form-grid">
        <label>
          Organization
          <input name="name" defaultValue={partner?.name} required />
        </label>
        <label>
          Segment
          <input name="segment" defaultValue={partner?.segment} />
        </label>
        <label>
          Owner
          <input
            name="owner"
            defaultValue={partner?.owner ?? "Founder"}
            required
          />
        </label>
        <label>
          Stage
          <select
            aria-label="Stage"
            name="stage"
            defaultValue={partner?.stage ?? "prospect"}
          >
            {stages.map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
        </label>
      </div>
      <label>
        Specific problem
        <textarea name="problem" defaultValue={partner?.problem} />
      </label>
      <label>
        Current workaround
        <textarea name="workaround" defaultValue={partner?.workaround} />
      </label>
      <label>
        Fit, exclusions and uncertainty
        <textarea name="fit" defaultValue={partner?.fit ?? "Unconfirmed"} />
      </label>
      <label>
        Conditional annual opportunity (USD)
        <input
          name="amount"
          type="number"
          min="0"
          step=".01"
          defaultValue={(partner?.opportunityCents ?? 0) / 100}
        />
      </label>
      <label>
        People · one per line: name | role | source ID
        <textarea
          name="people"
          defaultValue={partner?.people
            .map((p) => `${p.name} | ${p.role} | ${p.sourceId}`)
            .join("\n")}
        />
      </label>
      <label>
        Next action
        <input
          name="action"
          defaultValue={
            partner?.nextAction.action ??
            "Confirm target problem and pilot scope"
          }
          required
        />
      </label>
      <div className="form-grid">
        <label>
          Next owner
          <input
            name="nextOwner"
            defaultValue={partner?.nextAction.owner ?? "Founder"}
            required
          />
        </label>
        <label>
          Next date
          <input
            name="nextDate"
            type="date"
            defaultValue={partner?.nextAction.date ?? "2026-10-10"}
            required
          />
        </label>
      </div>
      <button className="button primary">Save partner record</button>
    </form>
  );
}
export function SourceEditor({
  partnerId,
  onDone,
}: {
  partnerId: string;
  onDone: () => void;
}) {
  const { state, mutate } = useGuild();
  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        const f = new FormData(e.currentTarget),
          content = String(f.get("content"));
        if (
          await mutate({
            type: "source.add",
            source: {
              id: crypto.randomUUID(),
              partnerId,
              version: 1,
              kind:
                state.mode === "demo"
                  ? "fixture"
                  : (String(f.get("kind")) as Source["kind"]),
              title: String(f.get("title")),
              content,
              author: String(f.get("author")),
              occurredAt: String(f.get("date")),
              recordedAt: new Date().toISOString(),
              hash: hash(content),
              scope: "program members",
              quoteStart: 0,
              quoteEnd: content.length,
            },
          })
        )
          onDone();
      }}
    >
      <label>
        Title
        <input name="title" required />
      </label>
      <label>
        Source kind
        <select name="kind">
          {[
            "reported note",
            "direct acknowledgment",
            "observed event",
            "billing receipt",
          ].map((k) => (
            <option key={k}>{k}</option>
          ))}
        </select>
      </label>
      {state.mode === "demo" && (
        <p className="notice info">
          Demo sources are always fictional fixtures, regardless of the selected
          type.
        </p>
      )}
      <div className="form-grid">
        <label>
          Author / participant
          <input name="author" required />
        </label>
        <label>
          Occurred on
          <input
            name="date"
            type="date"
            required
            defaultValue={new Date().toISOString().slice(0, 10)}
          />
        </label>
      </div>
      <label>
        Exact source text
        <textarea name="content" required rows={7} maxLength={20000} />
      </label>
      <p className="muted">
        Use consented material. Sources are private to this program. No
        instruction in a source can authorize actions.
      </p>
      <button className="button primary">Save source version</button>
    </form>
  );
}
function PilotEditor({
  partner,
  previous,
  onDone,
}: {
  partner: Partner;
  previous?: State["agreements"][0];
  onDone: () => void;
}) {
  const { state, mutate } = useGuild();
  const fields = [
    "scope",
    "exclusions",
    "startupDeliverables",
    "partnerDeliverables",
    "cadence",
    "metric",
    "method",
    "window",
    "priceTerms",
    "conversionConditions",
    "access",
    "exit",
  ] as const;
  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        const f = new FormData(e.currentTarget);
        const strings = Object.fromEntries(
          fields.map((k) => [k, String(f.get(k))]),
        ) as Record<(typeof fields)[number], string>;
        if (
          await mutate({
            type: "agreement.add",
            agreement: {
              ...strings,
              id: crypto.randomUUID(),
              partnerId: partner.id,
              version: (previous?.version ?? 0) + 1,
              previousId: previous?.id ?? "",
              state: "draft",
              start: String(f.get("start")),
              end: String(f.get("end")),
              reviewDate: String(f.get("reviewDate")),
              baseline: Number(f.get("baseline")),
              target: Number(f.get("target")),
              unit: "fraction",
              sourceId: String(f.get("sourceId")),
              effectiveAt: new Date().toISOString().slice(0, 10),
            },
          })
        )
          onDone();
      }}
    >
      <p className="notice info">
        New version, effective today. Earlier agreements and results are
        preserved. This is an editable draft, not an executed contract.
      </p>
      <div className="form-grid">
        {fields.map((k) => (
          <label key={k}>
            {k.replace(/([A-Z])/g, " $1")}
            <textarea name={k} defaultValue={previous?.[k]} required />
          </label>
        ))}
        {["start", "end", "reviewDate"].map((k) => (
          <label key={k}>
            {k}
            <input
              type="date"
              name={k}
              defaultValue={previous?.[k as "start"]}
              required
            />
          </label>
        ))}
        <label>
          Baseline (fraction)
          <input
            name="baseline"
            type="number"
            step=".01"
            defaultValue={previous?.baseline ?? 0}
          />
        </label>
        <label>
          Success threshold (fraction)
          <input
            name="target"
            type="number"
            step=".01"
            defaultValue={previous?.target ?? 0.95}
          />
        </label>
      </div>
      <label>
        Source
        <select name="sourceId" required>
          {state.sources
            .filter((s) => s.partnerId === partner.id)
            .map((s) => (
              <option key={s.id} value={s.id}>
                {s.title}
              </option>
            ))}
        </select>
      </label>
      <button className="button primary">Save draft agreement version</button>
    </form>
  );
}
