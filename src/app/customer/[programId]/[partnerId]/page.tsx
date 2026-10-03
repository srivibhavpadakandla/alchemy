"use client";
import { use, useEffect, useState } from "react";
import Link from "next/link";
import {
  TrialPlan,
  TrialTask,
  TrialMeasurement,
  TrialDecision,
  trialResult,
} from "@/lib/trials";
import { TrialReminders } from "@/components/TrialReminders";
import { Source, money } from "@/lib/domain";
type Portal = {
  programId: string;
  programVersion: number;
  customer: { id: string; name: string };
  plans: TrialPlan[];
  tasks: TrialTask[];
  measurements: TrialMeasurement[];
  decisions: TrialDecision[];
  sources: Source[];
};
export default function CustomerTrial({
  params,
}: {
  params: Promise<{ programId: string; partnerId: string }>;
}) {
  const { programId, partnerId } = use(params),
    endpoint = `/api/customer/${encodeURIComponent(programId)}/${encodeURIComponent(partnerId)}`;
  const [data, setData] = useState<Portal | null>(null),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  useEffect(() => {
    let active = true;
    fetch(endpoint, { cache: "no-store" })
      .then(async (r) => {
        const b = await r.json();
        if (!r.ok) throw Error(b.error);
        if (active) setData(b);
      })
      .catch((e) => {
        if (active) setError(e.message);
      });
    return () => {
      active = false;
    };
  }, [endpoint]);
  const plan = data?.plans.at(-1),
    result = plan && data ? trialResult(plan, data.measurements) : null;
  return (
    <main className="customer-portal">
      <header>
        <Link className="alchemy-wordmark" href="/">
          Alchemy<span className="alchemy-mark">✳</span>
        </Link>
        <span>YOUR SHARED CUSTOMER TRIAL</span>
      </header>
      {error && (
        <p role="status" className="notice amber">
          {error}
        </p>
      )}
      {!data ? (
        <section className="panel">
          <h1>
            {error ? "Sign in to review your trial." : "Opening your trial…"}
          </h1>
          <Link
            className="alchemy-button"
            href={`/login?next=${encodeURIComponent(`/customer/${programId}/${partnerId}`)}`}
          >
            Sign in ↗
          </Link>
        </section>
      ) : (
        <>
          <span className="editorial-index">
            CUSTOMER WORKSPACE / {data.customer.name}
          </span>
          <h1>
            A fair trial.
            <br />
            <em>A shared next step.</em>
          </h1>
          {!plan ? (
            <p>No trial plan has been shared yet.</p>
          ) : (
            <>
              <section className="panel">
                <span className="editorial-index">
                  PLAN VERSION {plan.version} / {plan.start} — {plan.end}
                </span>
                <h2>What we agree to try</h2>
                <div className="trial-two-column">
                  <div>
                    <h3>The startup will deliver</h3>
                    <p className="preserve-lines">{plan.startupDeliverables}</p>
                  </div>
                  <div>
                    <h3>Your responsibilities</h3>
                    <p className="preserve-lines">
                      {plan.customerResponsibilities}
                    </p>
                  </div>
                </div>
                <h3>The success measure</h3>
                <p>
                  {plan.metric.name}: baseline{" "}
                  {plan.metric.baseline ?? "missing"} {plan.metric.unit}; target{" "}
                  {plan.metric.target}
                  {plan.metric.comparison === "relative change"
                    ? "% improvement"
                    : ` ${plan.metric.unit}`}
                  . Compare {plan.metric.periodDays} days with exposure:{" "}
                  {plan.metric.exposure}.
                </p>
                <p>{plan.metric.method}</p>
                <h3>The paid offer</h3>
                <p>
                  {money(plan.paidOffer.amountCents, plan.paidOffer.currency)} /{" "}
                  {plan.paidOffer.cadence}. {plan.paidOffer.description}
                </p>
                <p>{plan.paidOffer.conditions}</p>
              </section>
              <section className="panel">
                <h2>
                  {plan.customerApprovalSourceId
                    ? "Your acknowledgment is recorded."
                    : "Review the plan together."}
                </h2>
                <p>
                  Record that you reviewed this exact trial plan. This does not
                  accept the paid offer or charge a payment.
                </p>
                {!plan.customerApprovalSourceId && (
                  <form
                    onSubmit={async (e) => {
                      e.preventDefault();
                      setBusy(true);
                      setError("");
                      try {
                        const f = new FormData(e.currentTarget);
                        const r = await fetch(endpoint, {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({
                            planId: plan.id,
                            expectedVersion: data.programVersion,
                            key: crypto.randomUUID(),
                            comment: String(f.get("comment")),
                          }),
                        });
                        const b = await r.json();
                        if (!r.ok) throw Error(b.error);
                        setData(b);
                      } catch (e) {
                        setError(
                          e instanceof Error ? e.message : "Review failed",
                        );
                      } finally {
                        setBusy(false);
                      }
                    }}
                  >
                    <label>
                      Review note
                      <textarea
                        name="comment"
                        required
                        minLength={5}
                        placeholder="What we agreed to try and any remaining questions."
                      />
                    </label>
                    <button className="alchemy-button" disabled={busy}>
                      {busy ? "Recording…" : "Record my plan acknowledgment"}
                    </button>
                  </form>
                )}
              </section>
              <section className="panel">
                <h2>Shared tasks</h2>
                {data.tasks.map((t) => (
                  <div className="history-row" key={t.id}>
                    <strong>{t.title}</strong>
                    <span>
                      {t.owner} / {t.assignee} / due {t.due}
                    </span>
                    <span>
                      {t.status}
                      {t.planVersion !== plan.version &&
                        " · earlier plan version"}
                    </span>
                    {t.owner === "customer" &&
                      t.planVersion === plan.version && (
                        <form
                          onSubmit={async (e) => {
                            e.preventDefault();
                            setBusy(true);
                            setError("");
                            try {
                              const f = new FormData(e.currentTarget),
                                r = await fetch(endpoint, {
                                  method: "POST",
                                  headers: {
                                    "Content-Type": "application/json",
                                  },
                                  body: JSON.stringify({
                                    action: "task",
                                    taskId: t.id,
                                    taskVersion: t.version,
                                    expectedVersion: data.programVersion,
                                    key: crypto.randomUUID(),
                                    status: f.get("status"),
                                    comment: f.get("comment"),
                                  }),
                                }),
                                b = await r.json();
                              if (!r.ok) throw Error(b.error);
                              setData(b);
                            } catch (e) {
                              setError(
                                e instanceof Error
                                  ? e.message
                                  : "Task update failed",
                              );
                            } finally {
                              setBusy(false);
                            }
                          }}
                        >
                          <label>
                            Task status
                            <select
                              name="status"
                              defaultValue={
                                t.status === "planned" ? "working" : t.status
                              }
                            >
                              <option value="working">Working</option>
                              <option value="blocked">Blocked</option>
                              <option value="done">
                                Done · reported completion
                              </option>
                            </select>
                          </label>
                          <label>
                            Progress or completion evidence
                            <textarea name="comment" minLength={5} required />
                          </label>
                          <button className="alchemy-button" disabled={busy}>
                            Record task update
                          </button>
                        </form>
                      )}
                  </div>
                ))}
                {!data.tasks.length && <p>No tasks have been added.</p>}
              </section>
              <section className="panel">
                <h2>{result?.status}</h2>
                <p>
                  Baseline: {plan.metric.baseline ?? "missing"}{" "}
                  {plan.metric.unit}. Reported result:{" "}
                  {result?.observation?.value ?? "missing"}{" "}
                  {result?.observation?.unit ?? ""}.
                </p>
                {result?.reasons.map((r) => (
                  <p key={r}>{r}</p>
                ))}
                <p>
                  Reported results do not automatically establish acceptance or
                  payment.
                </p>
              </section>
              <section className="panel">
                <h2>Sources shared with this trial</h2>
                {data.sources.map((s) => (
                  <details key={s.id}>
                    <summary>
                      {s.title} / {s.kind}
                    </summary>
                    <p className="preserve-lines">{s.content}</p>
                    <small>
                      {s.occurredAt} / author {s.author}
                    </small>
                  </details>
                ))}
              </section>
            </>
          )}
        </>
      )}
    </main>
  );
}
