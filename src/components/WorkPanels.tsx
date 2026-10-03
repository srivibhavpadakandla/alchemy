"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import Papa from "papaparse";
import { useConversation } from "@elevenlabs/react";
import {
  Download,
  Play,
  ShieldCheck,
  Mic,
  Square,
  RotateCcw,
  Plus,
} from "lucide-react";
import {
  State,
  Role,
  roles,
  Run,
  Work,
  classes,
  hash,
  inputHash,
  newPartner,
  money,
  calculate,
  readiness,
} from "@/lib/domain";
import { useGuild, Tag, Modal, Empty } from "./Workspace";
import { WorkCreate, RequestCreate } from "./WorkCreate";
import { CanonicalImport } from "./CanonicalImport";
import { TeamSettings } from "./TeamSettings";
import { resetDemo } from "@/lib/demo-store";
export function download(name: string, value: unknown) {
  const url = URL.createObjectURL(
    new Blob([JSON.stringify(value, null, 2)], { type: "application/json" }),
  );
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export function Evidence({ selectedId }: { selectedId?: string }) {
  const { state, openSource, mutate, notice, refresh } = useGuild();
  const [claim, setClaim] = useState("All three partners require Salesforce."),
    [busy, setBusy] = useState(false);
  const sources = selectedId
    ? state.sources.filter((s) => s.id === selectedId)
    : state.sources;
  return (
    <>
      <div className="section-heading">
        <div>
          <span className="eyebrow">SOURCE LIBRARY</span>
          <h2>
            {selectedId
              ? "The original record"
              : "Every interpretation starts here."}
          </h2>
        </div>
        <Tag>{sources.length} sources</Tag>
      </div>
      {sources.map((src) => (
        <article className="panel source-panel" key={src.id}>
          <div className="inline spread">
            <Tag tone={src.kind === "fixture" ? "amber" : "green"}>
              {src.kind.toUpperCase()}
            </Tag>
            <span className="muted">
              v{src.version} · {src.occurredAt}
            </span>
          </div>
          <h3>{src.title}</h3>
          <p>
            {state.partners.find((p) => p.id === src.partnerId)?.name} ·{" "}
            {src.author}
          </p>
          <blockquote>
            “{src.content.slice(src.quoteStart, src.quoteEnd)}”
          </blockquote>
          <div className="source-meta">
            <span>{src.id}</span>
            <span>
              Span {src.quoteStart}–{src.quoteEnd}
            </span>
            <span>{src.hash}</span>
          </div>
          <details>
            <summary>Provenance and full source</summary>
            <pre>{JSON.stringify(src, null, 2)}</pre>
          </details>
        </article>
      ))}
      {!sources.length && (
        <Empty title="No evidence yet">
          Open a partner and add a source note to begin.
        </Empty>
      )}
      <section className="panel gemma-panel">
        <div className="inline spread">
          <h2>
            <ShieldCheck size={22} /> Challenge a claim
          </h2>
          <Tag tone="purple">GEMMA EVIDENCE REVIEW</Tag>
        </div>
        <p>
          Review a precise assertion against existing source IDs. Findings are
          separate from founder-approved changes.
        </p>
        <label>
          Claim to check
          <textarea value={claim} onChange={(e) => setClaim(e.target.value)} />
        </label>
        <button
          className="button primary"
          disabled={busy || !sources.length}
          onClick={async () => {
            setBusy(true);
            try {
              const res = await fetch("/api/agent", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  action: "review",
                  programId: state.id,
                  mode: state.mode,
                  claim,
                  sourceIds: sources.map((s) => s.id),
                  demoState: state.mode === "demo" ? state : undefined,
                }),
              });
              const result = await res.json();
              if (!res.ok) throw Error(result.error);
              if (state.mode === "demo")
                await mutate({ type: "review.add", review: result.review });
              else await refresh();
            } catch (e) {
              notice(e instanceof Error ? e.message : "Review failed");
            } finally {
              setBusy(false);
            }
          }}
        >
          {busy ? "Review in progress…" : "Review with Gemma"}{" "}
          <ShieldCheck size={16} />
        </button>
        <p className="muted">
          A configured Google endpoint and verified model are required. No
          fixture output substitutes for a model call.
        </p>
        {state.reviews.map((review) => (
          <div className="source-quote" key={review.id}>
            <Tag
              tone={review.inputHash !== inputHash(state) ? "amber" : "purple"}
            >
              {review.inputHash !== inputHash(state)
                ? "STALE"
                : review.status.toUpperCase()}
            </Tag>
            <h3>{review.claim}</h3>
            <p>{review.justification}</p>
            <div className="inline">
              {review.sourceIds.map((id) => (
                <button
                  className="text-button"
                  key={id}
                  onClick={() => openSource(id)}
                >
                  {id} ↗
                </button>
              ))}
            </div>
            <small>
              {review.model} · receipt {review.requestId}
            </small>
          </div>
        ))}
      </section>
    </>
  );
}
function RequestLinkReview({
  request,
}: {
  request: State["requests"][number];
}) {
  const { state, mutate } = useGuild();
  const [workId, setWorkId] = useState(request.workId);
  const [reason, setReason] = useState("");
  return (
    <details className="source-quote">
      <summary>
        {request.linkState === "proposed"
          ? "Review proposed work link"
          : "Move or confirm work link"}
      </summary>
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          if (
            await mutate({
              type: "request.link",
              requestId: request.id,
              workId,
              reason,
            })
          )
            setReason("");
        }}
      >
        <label>
          Shared work item
          <select value={workId} onChange={(e) => setWorkId(e.target.value)}>
            {state.work.map((w) => (
              <option key={w.id} value={w.id}>
                {w.title}
              </option>
            ))}
          </select>
        </label>
        <label>
          Reason for this link
          <input
            required
            minLength={8}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          />
        </label>
        <button className="button" type="submit">
          Confirm request link
        </button>
      </form>
    </details>
  );
}
export function Requests() {
  const { state, mutate, openSource } = useGuild();
  const [edit, setEdit] = useState<Work | null>(null),
    [challenge, setChallenge] = useState<Work | null>(null),
    [adding, setAdding] = useState(false),
    [requesting, setRequesting] = useState(false);
  return (
    <>
      <div className="inline actions">
        <button className="button primary" onClick={() => setAdding(true)}>
          Add work item
        </button>
        <button
          className="button"
          onClick={() => setRequesting(true)}
          disabled={!state.sources.length || !state.work.length}
        >
          Record a request
        </button>
      </div>
      <p className="page-description">
        Requests converge on shared work. Classification is a proposal; your
        review controls the plan.
      </p>
      <div className="work-grid">
        {state.work.map((w) => (
          <article className="panel" key={w.id}>
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
              <Tag>{w.classificationState}</Tag>
            </div>
            <h2>{w.title}</h2>
            <p>{w.scope}</p>
            <div className="stat-row">
              <span>
                {w.effort ?? "?"} pts · range {w.low ?? "?"}–{w.high ?? "?"}
              </span>
              <span>{w.partnerIds.length} linked partners</span>
              <span>{w.status}</span>
            </div>
            <p className="muted">{w.classificationReason}</p>
            {state.requests
              .filter((r) => r.workId === w.id)
              .map((req) => (
                <div key={req.id}>
                  <button
                    className="request-link"
                    onClick={() => openSource(req.sourceId)}
                  >
                    <span className="avatar">
                      {
                        state.partners.find((p) => p.id === req.partnerId)
                          ?.name[0]
                      }
                    </span>
                    <span>
                      <strong>
                        {
                          state.partners.find((p) => p.id === req.partnerId)
                            ?.name
                        }
                      </strong>
                      <small>
                        {req.mustHave ? "Must-have" : "Optional"} ·{" "}
                        {req.linkState} · exact source ↗
                      </small>
                    </span>
                  </button>
                  <RequestLinkReview request={req} />
                </div>
              ))}
            <div className="inline actions">
              <button className="button" onClick={() => setEdit(w)}>
                Review class & estimate
              </button>
              <button className="text-button" onClick={() => setChallenge(w)}>
                Challenge recommendation ↗
              </button>
            </div>
          </article>
        ))}
      </div>
      <section className="panel">
        <h2>Requirement conflicts</h2>
        <p>
          Compare exact passages before calling requirements incompatible.
          Managed cloud versus required on-premises can conflict with this
          program’s architecture; different configurable preferences alone do
          not.
        </p>
        <p className="notice info">
          {state.mode === "demo"
            ? "No confirmed contradiction is present in the canonical fixture. "
            : ""}
          Run Smith on supplied sources to propose conflicts for review; inspect
          both passages before accepting a finding.
        </p>
      </section>
      <section className="panel">
        <h2>Protected corrections</h2>
        {!state.proposals.length && (
          <p className="muted">
            Challenge a classification to create a scoped correction. Unrelated
            edits are preserved; same-field conflicts require a new manual
            merge.
          </p>
        )}
        {state.proposals.map((p) => (
          <article className="source-quote" key={p.id}>
            <Tag>{p.state}</Tag>
            <h3>
              {p.entityId} / {p.field}
            </h3>
            <p>
              {String(p.before)} → <b>{String(p.after)}</b>
            </p>
            <p>{p.reason}</p>
            <div className="inline">
              {p.state === "pending" && (
                <>
                  <button
                    className="button primary"
                    onClick={() =>
                      void mutate({
                        type: "proposal.resolve",
                        proposalId: p.id,
                        disposition: "accept",
                      })
                    }
                  >
                    Accept scoped correction
                  </button>
                  <button
                    className="button"
                    onClick={() =>
                      void mutate({
                        type: "proposal.resolve",
                        proposalId: p.id,
                        disposition: "decline",
                      })
                    }
                  >
                    Keep current
                  </button>
                </>
              )}
              {p.state === "accepted" && (
                <button
                  className="button"
                  onClick={() =>
                    void mutate({
                      type: "proposal.resolve",
                      proposalId: p.id,
                      disposition: "undo",
                    })
                  }
                >
                  Undo as a new version
                </button>
              )}
            </div>
          </article>
        ))}
      </section>
      {adding && (
        <Modal
          title="Create reusable work"
          onClose={() => setAdding(false)}
          wide
        >
          <WorkCreate onDone={() => setAdding(false)} />
        </Modal>
      )}
      {requesting && (
        <Modal
          title="Record an exact request"
          onClose={() => setRequesting(false)}
        >
          <RequestCreate onDone={() => setRequesting(false)} />
        </Modal>
      )}
      {edit && (
        <Modal
          title="Review work scope and estimate"
          onClose={() => setEdit(null)}
        >
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              const f = new FormData(e.currentTarget);
              if (
                await mutate({
                  type: "work.save",
                  work: {
                    ...edit,
                    classification: String(
                      f.get("class"),
                    ) as Work["classification"],
                    classificationState: "approved",
                    classificationReason: String(f.get("reason")),
                    effort: Number(f.get("effort")),
                    low: Number(f.get("low")),
                    high: Number(f.get("high")),
                    scope: String(f.get("scope")),
                    estimator: "Founder override",
                    estimateDate: new Date().toISOString().slice(0, 10),
                  },
                })
              )
                setEdit(null);
            }}
          >
            <h3>{edit.title}</h3>
            <label>
              Primary class
              <select name="class" defaultValue={edit.classification}>
                {classes.map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </select>
            </label>
            <label>
              Review reason
              <textarea
                name="reason"
                required
                defaultValue={edit.classificationReason}
              />
            </label>
            <div className="form-grid">
              <label>
                Central effort
                <input
                  name="effort"
                  type="number"
                  min="0"
                  step=".5"
                  defaultValue={edit.effort ?? ""}
                  required
                />
              </label>
              <label>
                Low estimate
                <input
                  name="low"
                  type="number"
                  min="0"
                  step=".5"
                  defaultValue={edit.low ?? ""}
                  required
                />
              </label>
              <label>
                High estimate
                <input
                  name="high"
                  type="number"
                  min="0"
                  step=".5"
                  defaultValue={edit.high ?? ""}
                  required
                />
              </label>
            </div>
            <label>
              Included scope and setup
              <textarea name="scope" defaultValue={edit.scope} />
            </label>
            <button className="button primary">
              Approve reviewed work version
            </button>
          </form>
        </Modal>
      )}
      {challenge && (
        <Modal
          title="Challenge this recommendation"
          onClose={() => setChallenge(null)}
        >
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              const f = new FormData(e.currentTarget);
              if (
                await mutate({
                  type: "proposal.create",
                  proposal: {
                    id: crypto.randomUUID(),
                    entity: "work",
                    entityId: challenge.id,
                    field: "classification",
                    before: challenge.classification,
                    after: String(f.get("class")),
                    expectedVersion: challenge.version,
                    reason: String(f.get("reason")),
                    sourceIds: challenge.sourceIds,
                    state: "pending",
                    createdAt: new Date().toISOString(),
                    version: 1,
                  },
                })
              )
                setChallenge(null);
            }}
          >
            <h3>{challenge.title}</h3>
            <p>
              Current: {challenge.classification} · v{challenge.version}
            </p>
            {challenge.sourceIds.map((id) => (
              <button
                type="button"
                className="text-button"
                key={id}
                onClick={() => openSource(id)}
              >
                Open {id} ↗
              </button>
            ))}
            <label>
              Proposed classification
              <select name="class" defaultValue={challenge.classification}>
                {classes.map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </select>
            </label>
            <label>
              Evidence and reasoning
              <textarea name="reason" required minLength={5} />
            </label>
            <p className="notice info">
              Applying later checks the current field, preserves unrelated
              edits, and marks affected plans stale. No customer promise
              changes.
            </p>
            <button className="button primary">
              Create correction for review
            </button>
          </form>
        </Modal>
      )}
    </>
  );
}
export function AgentPanel({ role }: { role: Role }) {
  const { state, mutate, notice, refresh } = useGuild();
  const [busy, setBusy] = useState(false);
  const jobs = state.runs
    .filter((r) => r.role === role)
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  useEffect(() => {
    if (
      state.mode !== "live" ||
      !jobs.some((r) => ["queued", "working"].includes(r.status))
    )
      return;
    const t = setInterval(() => void refresh(), 3000);
    return () => clearInterval(t);
  }, [state.version]);
  const desc: Record<Role, string> = {
    Scout:
      "Check supplied partner sources against your target segment. Separate signals, inferred pain and unanswered questions.",
    Diplomat:
      "Extract proposed commitments and draft reciprocal pilot terms, without asserting agreement.",
    Quartermaster:
      "Create a pilot checklist with missing access and prerequisites. No external workspace is provisioned.",
    Smith:
      "Classify requests, propose shared work links and test architectural incompatibilities against exact passages.",
    Treasurer:
      "Inspect current checks, commercial blockers and next actions. All totals come from deterministic code.",
  };
  return (
    <>
      <div className="agent-intro">
        <img src={`/art/agent-${roles.indexOf(role)}.svg`} alt="" />
        <div>
          <Tag tone="green">{role.toUpperCase()}</Tag>
          <p>{desc[role]}</p>
        </div>
      </div>
      <button
        className="button primary"
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          try {
            const res = await fetch(
              state.mode === "live" ? "/api/jobs" : "/api/agent",
              {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  action: "run",
                  role,
                  programId: state.id,
                  mode: state.mode,
                  demoState: state.mode === "demo" ? state : undefined,
                }),
              },
            );
            const b = await res.json();
            if (b.run && state.mode === "demo")
              await mutate({ type: "run.save", run: b.run });
            if (state.mode === "live") await refresh();
            if (!res.ok) throw Error(b.error);
          } catch (e) {
            notice(e instanceof Error ? e.message : "Agent failed");
          } finally {
            setBusy(false);
          }
        }}
      >
        <Play size={15} />
        {busy
          ? "Running with pinned sources…"
          : `Run ${role} on shared records`}
      </button>
      <p className="muted">
        Provider calls require setup. A recorded failure stays a failure; no
        artificial progress or generated fixture run is shown.
      </p>
      {!jobs.length && (
        <Empty title="No task has run yet">
          A genuine task will show its pinned inputs, provider receipt, public
          output and review status here.
        </Empty>
      )}
      {jobs
        .slice()
        .reverse()
        .map((run) => (
          <article className="panel" key={run.id}>
            <div className="inline spread">
              <Tag tone={run.status === "failed" ? "red" : "green"}>
                {run.status}
              </Tag>
              <span>
                Input v{run.inputVersion} · attempt {run.attempt}
              </span>
            </div>
            <p>
              {run.error ||
                "Provider output is a proposal pending founder review."}
            </p>
            {state.mode === "live" &&
              ["queued", "working"].includes(run.status) && (
                <button
                  className="button"
                  onClick={async () => {
                    const r = await fetch(`/api/jobs/${run.id}`, {
                      method: "DELETE",
                    });
                    notice(
                      r.ok
                        ? "Cancellation recorded; late output will be quarantined."
                        : "Cancellation failed.",
                    );
                    await refresh();
                  }}
                >
                  Cancel task
                </button>
              )}
            {run.output != null && (
              <pre>{JSON.stringify(run.output, null, 2)}</pre>
            )}
            <details>
              <summary>Run, source and provider receipts</summary>
              <pre>{JSON.stringify(run, null, 2)}</pre>
            </details>
          </article>
        ))}
    </>
  );
}
export function SettingsPanel() {
  const { state, mutate, notice, refresh } = useGuild();
  const [status, setStatus] = useState<
      Record<string, { configured: boolean; detail: string }>
    >({}),
    [reset, setReset] = useState(false);
  useEffect(() => {
    fetch("/api/status")
      .then((r) => r.json())
      .then(setStatus)
      .catch(() => notice("Could not load integration status."));
  }, []);
  return (
    <>
      <div className="record-grid">
        <section className="panel">
          <h2>Product boundaries</h2>
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              const f = new FormData(e.currentTarget);
              await mutate({
                type: "strategy.save",
                segment: String(f.get("segment")),
                boundary: String(f.get("boundary")),
                deployment: String(f.get("deployment")),
              });
            }}
          >
            <label>
              Intended customer segment
              <textarea
                name="segment"
                defaultValue={state.strategy.segment}
                required
              />
            </label>
            <label>
              Unacceptable or exceptional commitments
              <textarea
                name="boundary"
                defaultValue={state.strategy.boundary}
                required
              />
            </label>
            <label>
              Supported deployment and data model
              <textarea
                name="deployment"
                defaultValue={state.strategy.deployment}
                required
              />
            </label>
            <button className="button primary">Save strategy version</button>
          </form>
        </section>
        <section className="panel">
          <h2>Capacity and reserves</h2>
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              const f = new FormData(e.currentTarget);
              await mutate({
                type: "capacity.save",
                capacity: {
                  ...state.capacity,
                  period: String(f.get("period")),
                  total: Number(f.get("total")),
                  core: Number(f.get("core")),
                  support: Number(f.get("support")),
                },
              });
            }}
          >
            <label>
              Named planning period
              <input name="period" defaultValue={state.capacity.period} />
            </label>
            <label>
              Total engineering points
              <input
                type="number"
                min="0"
                name="total"
                defaultValue={state.capacity.total}
              />
            </label>
            <label>
              Mandatory core / onboarding
              <input
                type="number"
                min="0"
                name="core"
                defaultValue={state.capacity.core}
              />
            </label>
            <label>
              Support reserve
              <input
                type="number"
                min="0"
                name="support"
                defaultValue={state.capacity.support}
              />
            </label>
            <p className="muted">
              Points are team estimates, not hours or model credits. Changing
              inputs invalidates existing comparisons.
            </p>
            <button className="button primary">Save capacity version</button>
          </form>
        </section>
      </div>
      <section className="panel">
        <h2>Integration readiness</h2>
        <p>
          Configured does not mean verified. Real provider proof is recorded
          only after a successful authenticated call.
        </p>
        {Object.entries(status).map(([name, s]) => (
          <div className="integration-row" key={name}>
            <span className="integration-logo">{name[0].toUpperCase()}</span>
            <div>
              <strong>{name}</strong>
              <small>{s.detail}</small>
            </div>
            <Tag tone={s.configured ? "amber" : "neutral"}>
              {s.configured ? "CONFIGURED · UNVERIFIED" : "SETUP REQUIRED"}
            </Tag>
          </div>
        ))}
      </section>
      <section className="panel">
        <h2>Portable records</h2>
        <p>
          Canonical export includes sources, formula inputs, immutable decisions
          and version lineage. Treat live exports as private.
        </p>
        <div className="inline">
          <button
            className="button primary"
            onClick={() =>
              download(`launchguild-${state.mode}-${state.version}.json`, state)
            }
          >
            <Download size={16} /> Export program
          </button>
          <button
            className="button"
            onClick={() =>
              download("launchguild-redacted-plan.json", {
                schema: "launchguild-redacted-v1",
                mode: state.mode,
                formula: "capacity-v1.0",
                capacity: state.capacity,
                plans: state.decisions.map((d) => ({
                  selected: d.selected,
                  formula: d.formula,
                  effort: d.result.effort,
                  remaining: d.result.remaining,
                  stale: d.stale,
                })),
                disclosure:
                  "No customer names, sources, people or opportunity amounts included.",
              })
            }
          >
            Export redacted plan
          </button>
          {state.mode === "demo" && (
            <button className="button danger" onClick={() => setReset(true)}>
              <RotateCcw size={16} /> Reset demo town
            </button>
          )}
        </div>
      </section>
      <CanonicalImport />
      <TeamSettings />
      {reset && (
        <Modal
          title="Reset the fictional town?"
          onClose={() => setReset(false)}
        >
          <p>
            This removes this browser’s demo edits and restores the three
            fictional partners. Export any demo decisions you want to keep.
          </p>
          <button
            className="button danger"
            onClick={async () => {
              await resetDemo();
              await refresh();
              setReset(false);
              notice("Fictional demo restored. Live records were not changed.");
            }}
          >
            Reset fictional demo
          </button>
        </Modal>
      )}
    </>
  );
}
export function ImportPanel({ onDone }: { onDone: () => void }) {
  const { state, mutate } = useGuild();
  const [csv, setCsv] = useState("id,name,segment,annual_usd,problem\n"),
    [mapping, setMapping] = useState({
      id: "id",
      name: "name",
      segment: "segment",
      amount: "annual_usd",
      problem: "problem",
    }),
    [preview, setPreview] = useState(false);
  const parsed = Papa.parse<Record<string, string>>(csv, {
      header: true,
      skipEmptyLines: true,
    }),
    headers = parsed.meta.fields ?? [];
  const errors = parsed.errors.map((e) => e.message);
  const rows = parsed.data.map((r, i) => {
    if (!r[mapping.id] || !r[mapping.name])
      errors.push(`Row ${i + 1}: stable ID and name required`);
    if (state.partners.some((p) => p.id === r[mapping.id]))
      errors.push(
        `Row ${i + 1}: ID already exists; import will not overwrite it`,
      );
    const amount = Number(r[mapping.amount]);
    if (!Number.isFinite(amount) || amount < 0)
      errors.push(`Row ${i + 1}: invalid amount`);
    return {
      ...newPartner(r[mapping.id] ?? "", r[mapping.name] ?? "", "import"),
      segment: r[mapping.segment] ?? "",
      problem: r[mapping.problem] ?? "",
      opportunityCents: Math.round(amount * 100),
    };
  });
  if (new Set(rows.map((r) => r.id)).size !== rows.length)
    errors.push("Duplicate IDs in file");
  return (
    <>
      {state.mode === "demo" && (
        <p className="notice amber">
          Your records cannot enter the fictional demo. Sign in and open a live
          program to commit this import. Preview remains available here.
        </p>
      )}
      <label>
        CSV text
        <textarea
          rows={7}
          value={csv}
          onChange={(e) => {
            setCsv(e.target.value);
            setPreview(false);
          }}
          maxLength={1000000}
        />
      </label>
      <label>
        Or select a text / CSV file
        <input
          type="file"
          accept=".csv,.txt,text/csv,text/plain"
          onChange={async (e) => {
            const f = e.target.files?.[0];
            if (f && f.size <= 1e6) setCsv(await f.text());
          }}
        />
      </label>
      <div className="form-grid">
        {Object.entries(mapping).map(([key, value]) => (
          <label key={key}>
            Map {key}
            <select
              value={value}
              onChange={(e) =>
                setMapping({ ...mapping, [key]: e.target.value })
              }
            >
              {headers.map((h) => (
                <option key={h}>{h}</option>
              ))}
            </select>
          </label>
        ))}
      </div>
      <button className="button" onClick={() => setPreview(true)}>
        Preview {rows.length} proposed records
      </button>
      {preview && (
        <>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Stable ID</th>
                  <th>Organization</th>
                  <th>Annual USD</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => (
                  <tr key={i}>
                    <td>{r.id}</td>
                    <td>{r.name}</td>
                    <td>{money(r.opportunityCents)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {errors.map((e, i) => (
            <p className="notice error" key={i}>
              {e}
            </p>
          ))}
          <button
            className="button primary"
            disabled={
              state.mode === "demo" ||
              errors.length > 0 ||
              !rows.length ||
              rows.length > 100
            }
            onClick={async () => {
              if (
                await mutate({
                  type: "partners.import",
                  partners: rows,
                  sources: [],
                })
              )
                onDone();
            }}
          >
            Commit reviewed import
          </button>
        </>
      )}
    </>
  );
}
export function VoicePanel({ onClose }: { onClose: () => void }) {
  const { state, base, notice } = useGuild();
  const [answer, setAnswer] = useState(""),
    [busy, setBusy] = useState(false);
  const invokeTool = async (
    action: string,
    params: Record<string, unknown> = {},
  ) => {
    const r = await fetch("/api/tools", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        programId: state.id,
        mode: state.mode,
        action,
        ...params,
        demoState: state.mode === "demo" ? state : undefined,
      }),
    });
    const b = await r.json();
    if (!r.ok) throw Error(b.error);
    setAnswer(JSON.stringify(b, null, 2));
    return JSON.stringify(b);
  };
  const conversation = useConversation({
    onError: (message) => notice(String(message)),
    clientTools: {
      read_partner: async (params) =>
        invokeTool("read_partner", { partnerId: params.partnerId }),
      compare_capacity: async () => invokeTool("compare_capacity"),
      propose_plan: async (params) =>
        invokeTool("propose_plan", { workIds: params.workIds }),
    },
  });
  useEffect(
    () => () => {
      void conversation.endSession();
    },
    [],
  );
  useEffect(() => {
    if (conversation.status !== "connected") return;
    const limit = setTimeout(() => {
      void conversation.endSession();
      notice("Five-minute voice session limit reached.");
    }, 300000);
    return () => clearTimeout(limit);
  }, [conversation.status]);
  const ask = (kind: string) => {
    if (kind === "promise")
      setAnswer(
        state.promises
          .filter((p) => p.partnerId === "kite")
          .map((p) => `${p.state}: ${p.wording}`)
          .join("\n") ||
          "No promise has been recorded for Kite. The source says evaluation only; no feature or delivery date was agreed.",
      );
    if (kind === "reuse")
      setAnswer(
        "Northstar and Juniper each explicitly request the scoped Salesforce integration. The source IDs are northstar-note-1 and juniper-note-1. This establishes overlap in two fictional partners, not market-wide demand.",
      );
    if (kind === "blocker") {
      const p = state.partners.find((p) => p.id === "juniper");
      setAnswer(
        p
          ? p.checks
              .filter((c) => c.status !== "met")
              .map((c) => `${c.label}: ${c.status}`)
              .join("\n")
          : "Select a partner in your records.",
      );
    }
  };
  return (
    <>
      <p>
        Read sources, compare plans and propose work. Commitments still require
        the normal founder review.
      </p>
      <div className="voice-state">
        <Mic size={28} />
        <strong>
          {conversation.status === "connected"
            ? "Voice connected"
            : "Microphone off"}
        </strong>
        <span>Hosted audio processing by ElevenLabs · opt-in only</span>
      </div>
      <div className="inline">
        <button
          className="button primary"
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            try {
              const r = await fetch("/api/voice", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ programId: state.id, mode: state.mode }),
              });
              const b = await r.json();
              if (!r.ok) throw Error(b.error);
              await conversation.startSession({
                signedUrl: b.signedUrl,
                connectionType: "websocket",
              });
            } catch (e) {
              notice(e instanceof Error ? e.message : "Voice failed");
            } finally {
              setBusy(false);
            }
          }}
        >
          <Mic size={16} /> Start voice session
        </button>
        <button
          className="button"
          onClick={() => void conversation.endSession()}
        >
          <Square size={14} /> Stop
        </button>
      </div>
      <h3>The same tools, in text</h3>
      <div className="text-tools">
        <button onClick={() => ask("promise")}>
          What did we actually promise Kite? ↗
        </button>
        <button onClick={() => ask("reuse")}>
          Why does Salesforce cover two partners? ↗
        </button>
        <button onClick={() => ask("blocker")}>
          What blocks Juniper becoming paid? ↗
        </button>
        <Link href={`${base}/capacity`} onClick={onClose}>
          Compare custom workflow with Salesforce →
        </Link>
      </div>
      {answer && <pre className="tool-answer">{answer}</pre>}
    </>
  );
}
