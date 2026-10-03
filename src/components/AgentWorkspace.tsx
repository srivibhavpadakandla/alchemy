"use client";
import { useState } from "react";
import {
  ArrowUpRight,
  Check,
  LoaderCircle,
  Play,
  Square,
  FileText,
  Radio,
} from "lucide-react";
import Link from "next/link";
import { Role, roles, Run } from "@/lib/domain";
import { RoleOutput } from "@/lib/providers";
import { useGuild, Tag } from "./Workspace";
export const roleJobs: Record<Role, string> = {
  Scout: "Find the right partners",
  Diplomat: "Shape a reciprocal pilot",
  Quartermaster: "Unblock onboarding",
  Smith: "Find the shared product",
  Treasurer: "Check the path to revenue",
};
const roleSymbols = ["⌖", "⚑", "▣", "⚒", "◈"];
export function AgentPortrait({ role }: { role: Role }) {
  return (
    <span
      className={`agent-portrait portrait-${role.toLowerCase()}`}
      aria-hidden="true"
    >
      {roleSymbols[roles.indexOf(role)]}
    </span>
  );
}
export function ActivityRail() {
  const { state, base, localAgent } = useGuild();
  const runs = [...state.runs].sort((a, b) =>
    b.createdAt.localeCompare(a.createdAt),
  );
  const current =
    runs.find((r) => ["working", "queued"].includes(r.status)) || runs[0];
  return (
    <aside className="activity-rail">
      <div className="rail-heading">
        <span className="eyebrow">GUILD ACTIVITY</span>
        <Radio size={16} />
      </div>
      <h2>
        {current?.status === "working"
          ? `${current.role} is on it.`
          : current?.status === "needs-review"
            ? "A fresh perspective."
            : "Meet your build crew."}
      </h2>
      <p>
        Five specialists. One shared product. Every finding connected to its
        evidence.
      </p>
      <div className="connection-chip">
        <span className={`live-dot ${localAgent.enabled ? "connected" : ""}`} />
        {localAgent.enabled
          ? "Local Codex connected"
          : "Provider setup required"}
      </div>
      {current ? (
        <div className="activity-trail">
          {current.receipts.slice(-3).map((r, i) => (
            <div key={i}>
              <span className="trail-point" />
              <small>
                {new Date(r.at).toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </small>
              <p>{r.summary}</p>
            </div>
          ))}
          <Tag tone={current.status === "needs-review" ? "green" : "neutral"}>
            {current.status.replaceAll("-", " ")}
          </Tag>
        </div>
      ) : (
        <div className="rail-empty">
          <AgentPortrait role="Smith" />
          <strong>Start with Smith</strong>
          <p>Find which partner requests belong in the same build.</p>
        </div>
      )}
      <Link href={`${base}/agents`} className="button primary">
        {current ? "Open agent workspace" : "Put your guild to work"}
        <ArrowUpRight size={16} />
      </Link>
      <small className="rail-footnote">
        {state.mode === "demo"
          ? "Fictional records · real model analysis"
          : "Private program records"}
      </small>
    </aside>
  );
}
export function AgentWorkspace({
  initialRole = "Smith",
}: {
  initialRole?: Role;
}) {
  const { state, localAgent, openSource, base } = useGuild();
  const [role, setRole] = useState<Role>(initialRole);
  const runs = state.runs
    .filter((r) => r.role === role)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const [selected, setSelected] = useState("");
  const run = runs.find((r) => r.id === selected) || runs[0];
  const active = run && ["working", "queued"].includes(run.status);
  const roleBusy = runs.some((r) => ["working", "queued"].includes(r.status));
  const parsed = RoleOutput.safeParse(run?.output),
    output = parsed.success ? parsed.data : null;
  const [starting, setStarting] = useState(false);
  const start = async () => {
    setStarting(true);
    setSelected("");
    try {
      await localAgent.launch(role);
    } finally {
      setStarting(false);
    }
  };
  return (
    <div className="agent-workspace">
      <div className="agent-roster" aria-label="Agent roles">
        {roles.map((r) => (
          <button
            key={r}
            className={role === r ? "selected" : ""}
            onClick={() => {
              setRole(r);
              setSelected("");
            }}
            aria-pressed={role === r}
          >
            <AgentPortrait role={r} />
            <span>
              <strong>{r}</strong>
              <small>{roleJobs[r]}</small>
            </span>
          </button>
        ))}
      </div>
      <div className="agent-desk">
        <div className="agent-brief">
          <div>
            <span className="eyebrow">
              {role.toUpperCase()} /{" "}
              {localAgent.enabled ? "LOCAL CODEX" : "AGENT"}
            </span>
            <h2>{roleJobs[role]}.</h2>
            <p>
              Analyze {state.sources.length} sources from your current program.
              Findings are proposals for your review.
            </p>
          </div>
          <button
            className="button primary"
            onClick={() => void start()}
            disabled={!localAgent.enabled || roleBusy || starting}
          >
            {active || starting ? (
              <LoaderCircle size={16} className="spin" />
            ) : (
              <Play size={16} />
            )}{" "}
            {active ? `${role} working…` : `Run ${role}`}
          </button>
        </div>
        {!localAgent.enabled && (
          <div className="notice">
            Local Codex is not enabled here. Configure an authenticated provider
            in <Link href={`${base}/settings`}>Settings</Link>.
          </div>
        )}
        {localAgent.error && (
          <p className="notice" role="alert">
            {localAgent.error}
          </p>
        )}
        <div className="agent-result-grid">
          <section className="agent-findings" aria-live="polite">
            {active && (
              <div className="working-card">
                <div className="working-orbit">
                  <AgentPortrait role={role} />
                </div>
                <span className="eyebrow">LIVE MODEL TASK</span>
                <h3>{role} is reading the evidence.</h3>
                <p>
                  The current program is pinned to version {run.inputVersion}.
                  The result appears here after its structure and source quotes
                  are validated.
                </p>
                <button
                  className="button"
                  onClick={() => void localAgent.cancel(run.id)}
                >
                  <Square size={13} />
                  Cancel task
                </button>
              </div>
            )}
            {!run && (
              <div className="agent-empty">
                <AgentPortrait role={role} />
                <h3>A second set of eyes.</h3>
                <p>
                  Run {role} to get a source-backed analysis. No task has been
                  run for this role yet.
                </p>
                <div className="agent-inputs">
                  <FileText size={17} />
                  {state.sources.length} program sources<span>→</span>
                  <Check size={17} />
                  Reviewable findings
                </div>
              </div>
            )}
            {run?.status === "failed" && (
              <div className="notice" role="alert">
                <strong>Task failed</strong>
                <p>{run.error}</p>
              </div>
            )}
            {run?.status === "cancelled" && (
              <div className="notice">
                Task cancelled. No result was accepted.
              </div>
            )}
            {run?.status === "quarantined" && (
              <div className="notice">
                The records changed after this task started. This result is out
                of date; run a fresh analysis before using it.
              </div>
            )}
            {output && (
              <>
                <div className="result-summary">
                  <span className="eyebrow">
                    ANALYSIS READY · FOUNDER REVIEW
                  </span>
                  <h3>{role}’s take</h3>
                  <p>{output.summary}</p>
                </div>
                {output.findings.map((f, i) => (
                  <article className="finding" key={i}>
                    <div className="finding-top">
                      <span className="finding-number">
                        {String(i + 1).padStart(2, "0")}
                      </span>
                      <Tag>{f.kind}</Tag>
                      {f.proposedClass !== "unclassified" && (
                        <Tag tone="green">{f.proposedClass}</Tag>
                      )}
                    </div>
                    <p className="finding-statement">{f.statement}</p>
                    {f.quote && <blockquote>“{f.quote}”</blockquote>}
                    <div className="source-links">
                      {f.sourceIds.map((id) => (
                        <button key={id} onClick={() => openSource(id)}>
                          <FileText size={13} />
                          {
                            state.partners
                              .find(
                                (p) =>
                                  p.id ===
                                  state.sources.find((s) => s.id === id)
                                    ?.partnerId,
                              )
                              ?.name.split(" ")[0]
                          }{" "}
                          ·{" "}
                          {state.sources.find((s) => s.id === id)?.title || id}
                          <ArrowUpRight size={12} />
                        </button>
                      ))}
                    </div>
                    {f.uncertainty && (
                      <p className="finding-uncertainty">
                        <strong>Still unknown:</strong> {f.uncertainty}
                      </p>
                    )}
                  </article>
                ))}
                {output.nextActions.length > 0 && (
                  <div className="next-actions">
                    <h3>Suggested next steps</h3>
                    {output.nextActions.map((a, i) => (
                      <div key={i}>
                        <span>{i + 1}</span>
                        <p>
                          {a.action}
                          <small>
                            {a.owner} {a.dueDate && `· ${a.dueDate}`}
                          </small>
                        </p>
                      </div>
                    ))}
                  </div>
                )}
                {output.draft && (
                  <details className="draft-detail">
                    <summary>Read proposed draft</summary>
                    <p>{output.draft}</p>
                  </details>
                )}
              </>
            )}
          </section>
          <aside className="run-receipt">
            <span className="eyebrow">EXECUTION RECEIPT</span>
            {run ? (
              <>
                <Tag tone={active ? "green" : "neutral"}>
                  {run.status.replaceAll("-", " ")}
                </Tag>
                <dl>
                  <dt>Provider</dt>
                  <dd>{run.provider}</dd>
                  <dt>Input</dt>
                  <dd>
                    Program v{run.inputVersion} · {run.inputHash.slice(0, 12)}
                  </dd>
                  <dt>Started</dt>
                  <dd>{new Date(run.createdAt).toLocaleString()}</dd>
                  <dt>Session ID</dt>
                  <dd className="mono">
                    {run.requestId || "Waiting for provider"}
                  </dd>
                  <dt>Tokens</dt>
                  <dd>
                    {run.tokens?.toLocaleString() ??
                      "Available after completion"}
                  </dd>
                </dl>
                <div className="receipt-events">
                  {run.receipts.map((r, i) => (
                    <div key={i}>
                      <Check size={13} />
                      <p>
                        {r.summary}
                        <small>{new Date(r.at).toLocaleTimeString()}</small>
                      </p>
                    </div>
                  ))}
                </div>
                {runs.length > 1 && (
                  <label>
                    Previous runs
                    <select
                      value={run.id}
                      onChange={(e) => setSelected(e.target.value)}
                    >
                      {runs.map((r) => (
                        <option key={r.id} value={r.id}>
                          {new Date(r.createdAt).toLocaleString()} · {r.status}
                        </option>
                      ))}
                    </select>
                  </label>
                )}
              </>
            ) : (
              <p>
                Real provider events and the session ID appear here when a task
                starts.
              </p>
            )}
            <div className="receipt-note">
              Analysis only. No emails sent, agreements changed or payments
              claimed.
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
