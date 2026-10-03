"use client";
import Link from "next/link";
import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Plus,
  ArrowUpRight,
  FileText,
  Download,
  Check,
  Clock,
} from "lucide-react";
import { useGuild, Modal, Empty, Tag } from "./Workspace";
import { SourceEditor } from "./PartnerPanel";
import { CommercialRecord } from "./CommercialRecord";
import { TrialReminders } from "./TrialReminders";
import { PrivateAttachments } from "./PrivateAttachments";
import {
  TrialPlan,
  TrialPlanSchema,
  TrialTask,
  trialResult,
} from "@/lib/trials";
import { Partner, money } from "@/lib/domain";
type Section = "pilots" | "plan" | "tasks" | "metrics" | "results" | "offer";
export function TrialWorkspace({
  section,
  selectedId,
}: {
  section: Section;
  selectedId?: string;
}) {
  const { state, base, mutate, openSource, notice } = useGuild();
  const router = useRouter();
  const search = useSearchParams().get("q")?.trim().toLowerCase() || "";
  const customers = state.partners.filter(
    (p) => !search || `${p.name} ${p.problem}`.toLowerCase().includes(search),
  );
  const [create, setCreate] = useState(false),
    [editPlan, setEditPlan] = useState(false),
    [source, setSource] = useState(false),
    [review, setReview] = useState(false),
    [task, setTask] = useState<TrialTask | null | false>(false),
    [commercial, setCommercial] = useState(false),
    [invite, setInvite] = useState(false),
    [inviteUrl, setInviteUrl] = useState(""),
    [nextAction, setNextAction] = useState(false);
  const customer = selectedId
    ? state.partners.find((p) => p.id === selectedId)
    : state.partners[0];
  const sources = state.sources.filter((s) => s.partnerId === customer?.id);
  const plan = state.trialPlans
    .filter((p) => p.partnerId === customer?.id)
    .at(-1);
  const tasks = state.trialTasks.filter((t) => t.trialId === plan?.trialId);
  const nextTask = tasks
    .filter((t) => t.status !== "done" && t.planVersion === plan?.version)
    .at(-1);
  const result = plan ? trialResult(plan, state.trialMeasurements) : null;
  const decision = state.trialDecisions
    .filter(
      (d) => d.trialId === plan?.trialId && d.planVersion === plan.version,
    )
    .at(-1);
  const currentPlans = state.partners.flatMap((p) =>
    state.trialPlans.filter((a) => a.partnerId === p.id).slice(-1),
  );
  const sourceSelect = (
    name: string,
    empty = "Select evidence",
    kind?: string,
  ) => (
    <select
      name={name}
      required={name !== "customer"}
      defaultValue={
        name === "founder"
          ? plan?.founderApprovalSourceId
          : name === "customer"
            ? plan?.customerApprovalSourceId
            : undefined
      }
    >
      <option value="">{empty}</option>
      {sources
        .filter(
          (s) =>
            !kind ||
            s.kind === kind ||
            (state.mode === "demo" && s.kind === "fixture"),
        )
        .map((s) => (
          <option key={s.id} value={s.id}>
            {s.title} · {s.kind}
          </option>
        ))}
    </select>
  );
  const exportReport = () => {
    if (!plan || !result || !customer) return;
    const linked = new Set(
      [
        plan.needsSourceId,
        plan.metric.baselineSourceId,
        plan.founderApprovalSourceId,
        plan.customerApprovalSourceId,
        result.observation?.sourceId,
        decision?.sourceId,
        customer.customerSourceId,
        customer.paymentSourceId,
        ...tasks.map((t) => t.completionSourceId),
      ].filter(Boolean),
    );
    const report = {
      product: "Alchemy",
      generatedAt: new Date().toISOString(),
      origin:
        state.mode === "demo"
          ? "Fictional sandbox"
          : "Manually reported customer trial",
      customer: customer.name,
      plan,
      result,
      pinnedReport:
        state.trialReports
          .filter(
            (r) => r.trialId === plan.trialId && r.planVersion === plan.version,
          )
          .at(-1) ?? null,
      tasks,
      decision: decision ?? null,
      commercial: {
        acceptanceSourceId: customer.customerSourceId || null,
        paymentSourceId: customer.paymentSourceId || null,
      },
      sources: sources.filter((s) => linked.has(s.id)),
      limits:
        "Reported evidence. Target attainment is separate from customer acceptance and actual payment.",
    };
    const url = URL.createObjectURL(
      new Blob([JSON.stringify(report, null, 2)], { type: "application/json" }),
    );
    const a = document.createElement("a");
    a.href = url;
    a.download = `alchemy-trial-${customer.id}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };
  return (
    <div className="trial-workspace">
      {section === "pilots" ? (
        <>
          <div className="trial-introduction">
            <span className="editorial-index">
              FROM A CONVERSATION TO A COMMERCIAL DECISION
            </span>
            <h2>Make the trial count.</h2>
            <p>
              Agree on the work. Measure the difference. Give your customer a
              reason to keep going.
            </p>
            <button className="metal-button" onClick={() => setCreate(true)}>
              <Plus size={14} /> NEW CUSTOMER
            </button>
          </div>
          <div className="hud trial-stats">
            <div>
              <strong>{state.partners.length}</strong>
              <span>CUSTOMERS</span>
            </div>
            <div>
              <strong>{currentPlans.length}</strong>
              <span>TRIAL PLANS</span>
            </div>
            <div>
              <strong>
                {
                  currentPlans.filter(
                    (p) =>
                      p.founderApprovalSourceId && p.customerApprovalSourceId,
                  ).length
                }
              </strong>
              <span>BOTH REVIEWS RECORDED</span>
            </div>
            <div>
              <strong>
                {state.partners.filter((p) => p.paymentSourceId).length}
              </strong>
              <span>PAYMENT RECEIPTS</span>
            </div>
          </div>
          {search && (
            <p className="trial-search-result">
              {customers.length} customers match “{search}” ·{" "}
              <Link href={base}>Clear search</Link>
            </p>
          )}
          <form action={base} className="cosmos-board-search">
            <input
              name="q"
              aria-label="Search customers"
              placeholder="Find a customer or trial"
              defaultValue={search}
            />
            <button className="button" type="submit">
              Search
            </button>
          </form>
          <div className="trial-customer-list">
            {customers.map((p, i) => {
              const a = state.trialPlans
                .filter((t) => t.partnerId === p.id)
                .at(-1);
              const r = a ? trialResult(a, state.trialMeasurements) : null;
              return (
                <Link
                  className="partner-card trial-customer-row cosmos-customer-card"
                  href={`${base}/plan/${p.id}`}
                  key={p.id}
                >
                  <div
                    className={`cosmos-customer-cover cosmos-photo tile-${i % 6}`}
                  >
                    <span>Illustrative cover</span>
                  </div>
                  <span className="trial-row-number">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <div>
                    <h3>{p.name}</h3>
                    <p>{p.problem || "Add conversation notes to begin."}</p>
                    <small>
                      {p.origin === "fixture"
                        ? "FICTIONAL CUSTOMER"
                        : "MANUALLY ENTERED"}{" "}
                      / {a ? `${a.start} — ${a.end}` : "NO TRIAL PLAN"}
                    </small>
                  </div>
                  <Tag>{r?.status ?? p.stage}</Tag>
                  <ArrowUpRight size={20} />
                </Link>
              );
            })}
          </div>
          <div className="trial-community">
            <span className="editorial-index">REAL VALUE, CLOSE TO HOME</span>
            <h3>
              Start with a business
              <br />
              in your community.
            </h3>
            <p>
              A local shop or nonprofit can be a real trial partner. Record
              their starting point, what changed, and what they say helped.
              Completed trials and partner-reported value are the outcomes to
              count.
            </p>
            <span className="muted">
              {state.mode === "demo"
                ? "This sandbox uses fictional customers and has no verified community outcomes."
                : "Record partner-confirmed outcomes in each trial’s evidence and results."}
            </span>
          </div>
          <details className="trial-support">
            <summary>Supporting tools</summary>
            <div className="inline">
              <Link href={`${base}/agents`}>AI drafting assistants ↗</Link>
              <Link href={`${base}/capacity`}>Capacity planning ↗</Link>
              <Link href={`${base}/requests`}>Shared product work ↗</Link>
              <Link href={`${base}/evidence`}>Evidence library ↗</Link>
              <Link href={`${base}/decisions`}>Decision history ↗</Link>
            </div>
          </details>
        </>
      ) : (
        <>
          <div className="trial-customer-picker">
            <label>
              Customer
              <select
                value={customer?.id ?? ""}
                onChange={(e) =>
                  router.push(`${base}/${section}/${e.target.value}`)
                }
              >
                <option value="" disabled>
                  Select a customer
                </option>
                {state.partners.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </label>
            <button
              className="button"
              onClick={() => setSource(true)}
              disabled={!customer}
            >
              <FileText size={14} /> Add evidence
            </button>
            <Link href={`${base}/pilots`}>All customers ↗</Link>
          </div>
          {!customer ? (
            <Empty title="Begin with a conversation">
              Add a customer and their needs in Customers & pilots.
            </Empty>
          ) : (
            <>
              <div className="trial-record-heading">
                <span className="editorial-index">
                  {customer.origin === "fixture"
                    ? "FICTIONAL CUSTOMER"
                    : "CUSTOMER RECORD"}{" "}
                  / {customer.name.toUpperCase()}
                </span>
                <h2>
                  {
                    {
                      plan: "A clear plan. A fair trial.",
                      tasks: "Shared work. Clear owners.",
                      metrics: "Measure what matters.",
                      results: "Evidence for the next step.",
                      offer: "Make the next step explicit.",
                    }[section]
                  }
                </h2>
              </div>
              <section className="trial-next-action">
                <span className="editorial-index">
                  NEXT ACTION /{" "}
                  {(
                    nextTask?.assignee ?? customer.nextAction.owner
                  ).toUpperCase()}{" "}
                  / {nextTask?.due ?? customer.nextAction.date}
                </span>
                <p>{nextTask?.title ?? customer.nextAction.action}</p>
                <small>
                  Missing input:{" "}
                  {nextTask
                    ? nextTask.blocker || "None recorded"
                    : customer.checks.find(
                        (c) => c.id === customer.nextAction.blockerId,
                      )?.reason ||
                      customer.nextAction.blockerId ||
                      "Not specified"}
                </small>
                <button
                  className="text-button"
                  onClick={() => setNextAction(true)}
                >
                  Review next action ↗
                </button>
              </section>
              {section === "tasks" && state.mode === "live" && (
                <TrialReminders programId={state.id} partnerId={customer.id} />
              )}
              {section === "metrics" && (
                <PrivateAttachments partnerId={customer.id} />
              )}
              {section === "plan" && (
                <>
                  <section className="panel trial-needs">
                    <h3>What the customer needs</h3>
                    <p>
                      {customer.problem ||
                        "Customer needs have not been recorded."}
                    </p>
                    {sources[0] && (
                      <button
                        className="text-button"
                        onClick={() =>
                          openSource(plan?.needsSourceId || sources[0].id)
                        }
                      >
                        Open conversation source ↗
                      </button>
                    )}
                  </section>
                  {!plan || editPlan ? (
                    <PlanForm
                      customer={customer}
                      previous={plan}
                      onDone={() => setEditPlan(false)}
                    />
                  ) : (
                    <>
                      <p className="muted">
                        {plan.evaluationKind} · Working product:{" "}
                        {plan.workingProduct}
                        {plan.workingProduct !== "yes" &&
                          " · Confirm the deliverable before beginning a product trial."}
                      </p>
                      <div className="trial-plan-bar">
                        <Tag>
                          {plan.founderApprovalSourceId &&
                          plan.customerApprovalSourceId
                            ? "Both reviews recorded"
                            : "Review pending"}
                        </Tag>
                        <span>
                          Version {plan.version} / {plan.start} — {plan.end}
                        </span>
                        <button
                          className="button"
                          onClick={() => setEditPlan(true)}
                        >
                          Amend plan
                        </button>
                        <button
                          className="button"
                          onClick={() => setReview(true)}
                        >
                          Record plan review
                        </button>
                        <button
                          className="button"
                          onClick={() => setInvite(true)}
                        >
                          Invite customer to review
                        </button>
                      </div>
                      <div className="trial-two-column">
                        <section className="panel">
                          <span className="editorial-index">
                            01 / THE STARTUP
                          </span>
                          <h3>What we will deliver</h3>
                          <p className="preserve-lines">
                            {plan.startupDeliverables}
                          </p>
                        </section>
                        <section className="panel">
                          <span className="editorial-index">
                            02 / THE CUSTOMER
                          </span>
                          <h3>What we need from you</h3>
                          <p className="preserve-lines">
                            {plan.customerResponsibilities}
                          </p>
                        </section>
                      </div>
                      <section className="panel trial-measure-definition">
                        <span className="editorial-index">
                          03 / THE SUCCESS MEASURE
                        </span>
                        <h3>{plan.metric.name}</h3>
                        <dl>
                          <div>
                            <dt>Baseline</dt>
                            <dd>
                              {plan.metric.baseline ?? "Missing"}{" "}
                              {plan.metric.unit}
                            </dd>
                          </div>
                          <div>
                            <dt>Target</dt>
                            <dd>
                              {plan.metric.comparison === "relative change" ||
                              plan.metric.direction === "higher"
                                ? "At least"
                                : "At most"}{" "}
                              {plan.metric.target}
                              {plan.metric.comparison === "relative change"
                                ? "% improvement"
                                : ` ${plan.metric.unit}`}
                            </dd>
                          </div>
                          <div>
                            <dt>Comparable period</dt>
                            <dd>{plan.metric.periodDays} days</dd>
                          </div>
                          <div>
                            <dt>Exposure / normalization</dt>
                            <dd>{plan.metric.exposure}</dd>
                          </div>
                        </dl>
                        <p>{plan.metric.method}</p>
                        {plan.metric.baselineSourceId && (
                          <button
                            className="text-button"
                            onClick={() =>
                              openSource(plan.metric.baselineSourceId)
                            }
                          >
                            Baseline evidence ↗
                          </button>
                        )}
                      </section>
                      <section className="panel">
                        <span className="editorial-index">
                          04 / IF THE TRIAL WORKS
                        </span>
                        <h3>
                          {money(
                            plan.paidOffer.amountCents,
                            plan.paidOffer.currency,
                          )}{" "}
                          / {plan.paidOffer.cadence}
                        </h3>
                        <p>{plan.paidOffer.description}</p>
                        <p>{plan.paidOffer.conditions}</p>
                        <Link
                          className="metal-button"
                          href={`${base}/tasks/${customer.id}`}
                        >
                          CONTINUE TO TASKS <ArrowUpRight size={14} />
                        </Link>
                      </section>
                    </>
                  )}
                </>
              )}
              {section !== "plan" && !plan ? (
                <Empty title="Set the plan first">
                  <Link href={`${base}/plan/${customer.id}`}>
                    Create the trial plan ↗
                  </Link>{" "}
                  to define responsibilities, success and the paid offer.
                </Empty>
              ) : null}
              {section === "tasks" && plan && (
                <>
                  <div className="section-heading">
                    <p>
                      Tasks are tied to plan version {plan.version}. Completion
                      requires a source.
                    </p>
                    <button
                      className="metal-button"
                      onClick={() => setTask(null)}
                    >
                      <Plus size={14} /> ADD TASK
                    </button>
                  </div>
                  {tasks.length ? (
                    <div className="trial-task-list">
                      {tasks.map((t) => (
                        <button
                          key={t.id}
                          className="trial-task-row"
                          onClick={() => setTask(t)}
                        >
                          {t.status === "done" ? (
                            <Check size={18} />
                          ) : (
                            <Clock size={18} />
                          )}
                          <span>
                            <strong>{t.title}</strong>
                            <small>
                              {t.owner.toUpperCase()} / {t.assignee} / DUE{" "}
                              {t.due}
                              {t.planVersion !== plan.version
                                ? " / EARLIER PLAN VERSION"
                                : ""}
                            </small>
                            {t.blocker && <p>{t.blocker}</p>}
                          </span>
                          <Tag>{t.status}</Tag>
                          <ArrowUpRight size={17} />
                        </button>
                      ))}
                    </div>
                  ) : (
                    <Empty title="Give the work an owner">
                      Add startup deliverables and customer responsibilities as
                      tasks.
                    </Empty>
                  )}
                  <Link
                    className="text-link"
                    href={`${base}/metrics/${customer.id}`}
                  >
                    RECORD THE MEASUREMENT <ArrowUpRight size={14} />
                  </Link>
                </>
              )}
              {section === "metrics" && plan && (
                <>
                  <section className="panel">
                    <span className="editorial-index">
                      MANUAL MEASUREMENT / SOURCE REQUIRED
                    </span>
                    <h3>{plan.metric.name}</h3>
                    <p>
                      Baseline: {plan.metric.baseline ?? "missing"}{" "}
                      {plan.metric.unit}. Target: {plan.metric.target}
                      {plan.metric.comparison === "relative change"
                        ? "% improvement"
                        : ` ${plan.metric.unit}`}
                      . Use {plan.metric.periodDays} comparable days and the
                      same exposure: {plan.metric.exposure}.
                    </p>
                    <MeasurementForm plan={plan} />
                  </section>
                  <section className="panel">
                    <h3>Measurement history</h3>
                    {state.trialMeasurements
                      .filter((m) => m.trialId === plan.trialId)
                      .map((m) => (
                        <button
                          className="evidence-row"
                          key={m.id}
                          onClick={() => openSource(m.sourceId)}
                        >
                          <strong>
                            {m.value} {m.unit}
                          </strong>
                          <span>
                            {m.measuredStart} — {m.measuredEnd} / {m.health} /
                            plan v{m.planVersion}
                          </span>
                          <ArrowUpRight size={14} />
                        </button>
                      ))}
                    <p className="muted">
                      Manual records are reported evidence. No instrumented
                      telemetry connector is configured.
                    </p>
                  </section>
                </>
              )}
              {section === "results" && plan && result && (
                <>
                  <section className="panel trial-report">
                    <span className="editorial-index">
                      RESULTS / PLAN VERSION {plan.version}
                    </span>
                    <h3>{result.status}</h3>
                    <div className="trial-result-values">
                      <div>
                        <span>BASELINE</span>
                        <strong>{plan.metric.baseline ?? "—"}</strong>
                        <small>{plan.metric.unit}</small>
                      </div>
                      <div>
                        <span>REPORTED RESULT</span>
                        <strong>{result.observation?.value ?? "—"}</strong>
                        <small>
                          {result.observation?.unit ?? plan.metric.unit}
                        </small>
                      </div>
                      <div>
                        <span>CHANGE</span>
                        <strong>
                          {result.change === null
                            ? "—"
                            : `${result.change.toFixed(1)}%`}
                        </strong>
                        <small>
                          {result.reasons.length
                            ? "comparison not established"
                            : "comparable reported evidence"}
                        </small>
                      </div>
                    </div>
                    {result.reasons.length ? (
                      <ul className="trial-gaps">
                        {result.reasons.map((r) => (
                          <li key={r}>{r}</li>
                        ))}
                      </ul>
                    ) : (
                      <p>
                        The reported measurement{" "}
                        {result.targetMet ? "meets" : "does not meet"} the
                        reviewed target. A commercial decision and payment
                        remain separate.
                      </p>
                    )}
                    <div className="inline">
                      {plan.metric.baselineSourceId && (
                        <button
                          className="button"
                          onClick={() =>
                            openSource(plan.metric.baselineSourceId)
                          }
                        >
                          Baseline source ↗
                        </button>
                      )}
                      {result.observation && (
                        <button
                          className="button"
                          onClick={() =>
                            openSource(result.observation!.sourceId)
                          }
                        >
                          Result source ↗
                        </button>
                      )}
                      <button className="button" onClick={exportReport}>
                        <Download size={14} /> Export results report
                      </button>
                    </div>
                  </section>
                  <section className="panel">
                    <h3>Persisted action receipts</h3>
                    {state.trialEvents
                      .filter((e) => e.trialId === plan.trialId)
                      .map((e) => (
                        <details className="trial-event" key={e.id}>
                          <summary>
                            {e.trigger} / {e.status}
                          </summary>
                          <p>{e.summary}</p>
                          <small>
                            Event {e.id} / {e.at} / actor {e.actor}
                          </small>
                          <p>Task: {e.taskId}</p>
                          {e.reportId && <p>Report: {e.reportId}</p>}
                        </details>
                      ))}
                    <h3>Report versions</h3>
                    {state.trialReports
                      .filter((r) => r.trialId === plan.trialId)
                      .map((r) => (
                        <details className="trial-event" key={r.id}>
                          <summary>
                            Plan v{r.planVersion} / {r.status} /{" "}
                            {r.createdAt.slice(0, 10)}
                          </summary>
                          <p>{r.limits}</p>
                          <small>
                            Report {r.id} / {r.inputHash}
                          </small>
                          {r.gaps.map((g) => (
                            <p key={g}>{g}</p>
                          ))}
                        </details>
                      ))}
                    <h3>Execution and review</h3>
                    <p>
                      {
                        tasks.filter(
                          (t) =>
                            t.status === "done" &&
                            t.planVersion === plan.version,
                        ).length
                      }{" "}
                      of{" "}
                      {
                        tasks.filter((t) => t.planVersion === plan.version)
                          .length
                      }{" "}
                      current-plan tasks have completion evidence.
                    </p>
                    <p>
                      {plan.founderApprovalSourceId
                        ? "Startup review recorded."
                        : "Startup review missing."}{" "}
                      {plan.customerApprovalSourceId
                        ? "Customer acknowledgment recorded."
                        : "Customer acknowledgment missing."}
                    </p>
                    <p>
                      {decision
                        ? `Commercial decision: ${decision.decision}. ${decision.reason}`
                        : "No commercial decision recorded."}
                    </p>
                    <p>
                      {customer.paymentSourceId
                        ? "Payment receipt recorded."
                        : "No payment receipt recorded."}
                    </p>
                    <Link
                      className="metal-button"
                      href={`${base}/offer/${customer.id}`}
                    >
                      REVIEW THE PAID OFFER <ArrowUpRight size={14} />
                    </Link>
                  </section>
                </>
              )}
              {section === "offer" && plan && (
                <>
                  <section className="panel trial-offer">
                    <span className="editorial-index">
                      THE OFFER IN THE TRIAL PLAN
                    </span>
                    <h3>
                      {money(
                        plan.paidOffer.amountCents,
                        plan.paidOffer.currency,
                      )}{" "}
                      <em>/ {plan.paidOffer.cadence}</em>
                    </h3>
                    <p>{plan.paidOffer.description}</p>
                    <p>{plan.paidOffer.conditions}</p>
                    <p>
                      Champion: {plan.buyer.champion}. Decision owner:{" "}
                      {plan.buyer.decisionOwner}. Decision date:{" "}
                      {plan.buyer.decisionDate || "Unknown"}.
                    </p>
                    <p>Remaining approvals: {plan.buyer.approvalBlockers}.</p>
                    <Tag>{result?.status}</Tag>
                    <p>
                      Review the evidence with the customer and record their
                      decision. A target being met does not automatically create
                      a customer or a payment.
                    </p>
                  </section>
                  <section className="panel">
                    <h3>Document the next step</h3>
                    <form
                      onSubmit={async (e) => {
                        e.preventDefault();
                        const f = new FormData(e.currentTarget);
                        await mutate({
                          type: "trial.decision.add",
                          decision: {
                            id: crypto.randomUUID(),
                            trialId: plan.trialId,
                            partnerId: customer.id,
                            planVersion: plan.version,
                            sourceId: String(f.get("sourceId")),
                            decision: String(
                              f.get("decision"),
                            ) as "continue paid",
                            reason: String(f.get("reason")),
                            recordedAt: new Date().toISOString(),
                          },
                        });
                      }}
                    >
                      <div className="form-grid">
                        <label>
                          Customer decision
                          <select name="decision">
                            <option value="undecided">Still undecided</option>
                            <option value="continue paid">
                              Continue on paid plan
                            </option>
                            <option value="extend trial">
                              Extend the trial
                            </option>
                            <option value="decline">Decline</option>
                            <option value="pause">Pause</option>
                            <option value="stop">Stop</option>
                            <option value="inconclusive">Inconclusive</option>
                          </select>
                        </label>
                        <label>
                          Decision evidence{sourceSelect("sourceId")}
                        </label>
                      </div>
                      <label>
                        Decision and next action
                        <textarea name="reason" required minLength={5} />
                      </label>
                      <button className="button primary">
                        Record commercial decision
                      </button>
                    </form>
                    {decision && (
                      <p>
                        Latest: {decision.decision} / {decision.reason}
                      </p>
                    )}
                  </section>
                  <section className="panel">
                    <h3>Acceptance and payment</h3>
                    <p>
                      {customer.customerSourceId
                        ? "Documented customer acceptance exists."
                        : "Customer acceptance has not been recorded."}
                    </p>
                    <p>
                      {customer.paymentSourceId
                        ? "A payment receipt has been recorded."
                        : "No payment receipt has been recorded."}
                    </p>
                    <button
                      className="button"
                      onClick={() => setCommercial(true)}
                    >
                      Record agreement / payment evidence
                    </button>
                    <p className="muted">
                      Recording evidence does not charge a customer. Payment
                      requires a billing receipt.
                    </p>
                  </section>
                </>
              )}
            </>
          )}
        </>
      )}
      {nextAction && customer && (
        <Modal
          title="Review the next action"
          onClose={() => setNextAction(false)}
        >
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              const f = new FormData(e.currentTarget);
              if (
                await mutate({
                  type: "partner.save",
                  partner: {
                    ...customer,
                    nextAction: {
                      action: String(f.get("action")),
                      owner: String(f.get("owner")),
                      date: String(f.get("due")),
                      blockerId: String(f.get("missing")),
                    },
                  },
                })
              )
                setNextAction(false);
            }}
          >
            <label>
              Next action
              <textarea
                name="action"
                defaultValue={customer.nextAction.action}
                required
              />
            </label>
            <label>
              Owner
              <input
                name="owner"
                defaultValue={customer.nextAction.owner}
                required
              />
            </label>
            <label>
              Deadline
              <input
                type="date"
                name="due"
                defaultValue={nextTask?.due ?? customer.nextAction.date}
                required
              />
            </label>
            <label>
              Specific missing input
              <textarea
                name="missing"
                defaultValue={
                  customer.checks.find(
                    (c) => c.id === customer.nextAction.blockerId,
                  )?.reason || customer.nextAction.blockerId
                }
              />
            </label>
            <button className="button primary">Save next action</button>
          </form>
        </Modal>
      )}
      {invite && customer && (
        <Modal
          title="Invite this customer to review"
          onClose={() => setInvite(false)}
        >
          {state.mode === "demo" ? (
            <p>
              Customer invitations require a live authenticated workspace. This
              local sandbox does not send invitations or simulate a second
              account.
            </p>
          ) : (
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                const f = new FormData(e.currentTarget);
                try {
                  const r = await fetch("/api/membership", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                      action: "invite",
                      programId: state.id,
                      partnerId: customer.id,
                      role: "customer",
                      email: String(f.get("email")),
                    }),
                  });
                  const b = await r.json();
                  if (!r.ok) throw Error(b.error);
                  setInviteUrl(b.url);
                } catch (err) {
                  notice(
                    err instanceof Error ? err.message : "Invitation failed",
                  );
                }
              }}
            >
              <p>
                This invitation grants access only to {customer.name}’s shared
                trial and its cited sources. The recipient must sign in with
                this verified email. It expires after seven days.
              </p>
              <label>
                Customer email
                <input type="email" name="email" required />
              </label>
              <button className="button primary">
                Create scoped invitation link
              </button>
              {inviteUrl && (
                <label>
                  Private invitation link · share with the recipient
                  <input readOnly value={inviteUrl} />
                </label>
              )}
            </form>
          )}
        </Modal>
      )}
      {create && (
        <Modal
          title="Add an interested customer"
          onClose={() => setCreate(false)}
        >
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              const f = new FormData(e.currentTarget),
                id = crypto.randomUUID();
              if (
                await mutate({
                  type: "customer.add",
                  id,
                  name: String(f.get("name")),
                  needs: String(f.get("needs")),
                })
              ) {
                setCreate(false);
                router.push(`${base}/plan/${id}`);
              }
            }}
          >
            <p>
              Start with notes from your conversation. No trial, agreement or
              sale is inferred.
            </p>
            <label>
              Customer name
              <input name="name" required maxLength={160} />
            </label>
            <label>
              What do they need?
              <textarea name="needs" required minLength={5} />
            </label>
            <button className="button primary">Create customer record</button>
          </form>
        </Modal>
      )}
      {source && customer && (
        <Modal title="Add source evidence" onClose={() => setSource(false)}>
          <SourceEditor
            partnerId={customer.id}
            onDone={() => setSource(false)}
          />
        </Modal>
      )}
      {commercial && customer && (
        <Modal
          title="Record commercial evidence"
          onClose={() => setCommercial(false)}
        >
          <CommercialRecord
            partner={customer}
            onDone={() => setCommercial(false)}
          />
        </Modal>
      )}
      {review && plan && (
        <Modal
          title="Record both sides’ review"
          onClose={() => setReview(false)}
        >
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              const f = new FormData(e.currentTarget);
              if (
                await mutate({
                  type: "trial.plan.add",
                  plan: {
                    ...plan,
                    id: crypto.randomUUID(),
                    previousId: plan.id,
                    version: plan.version + 1,
                    founderApprovalSourceId: String(f.get("founder")),
                    customerApprovalSourceId: String(f.get("customer")),
                    createdAt: new Date().toISOString(),
                  },
                })
              )
                setReview(false);
            }}
          >
            <p>
              This records review evidence for the exact plan terms. Customer
              acknowledgment must come from a direct acknowledgment source. It
              does not send a request or imply an independent sign-in.
            </p>
            <label>Startup approval evidence{sourceSelect("founder")}</label>
            <label>
              Customer acknowledgment evidence
              {sourceSelect(
                "customer",
                "Select direct acknowledgment",
                "direct acknowledgment",
              )}
            </label>
            <button className="button primary">
              Save reviewed plan version
            </button>
          </form>
        </Modal>
      )}
      {task !== false && plan && customer && (
        <Modal
          title={task ? "Review task" : "Add a trial task"}
          onClose={() => setTask(false)}
        >
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              const f = new FormData(e.currentTarget);
              if (
                await mutate({
                  type: "trial.task.save",
                  task: {
                    id: task?.id ?? crypto.randomUUID(),
                    trialId: plan.trialId,
                    partnerId: customer.id,
                    planVersion: plan.version,
                    version: task?.version ?? 1,
                    title: String(f.get("title")),
                    owner: String(f.get("owner")) as "startup",
                    assignee: String(f.get("assignee")),
                    due: String(f.get("due")),
                    status: String(f.get("status")) as "planned",
                    blocker: String(f.get("blocker")),
                    completionSourceId: String(f.get("completionSourceId")),
                  },
                })
              )
                setTask(false);
            }}
          >
            <label>
              Task
              <input name="title" defaultValue={task?.title} required />
            </label>
            <div className="form-grid">
              <label>
                Responsible side
                <select name="owner" defaultValue={task?.owner}>
                  <option value="startup">Startup</option>
                  <option value="customer">Customer</option>
                </select>
              </label>
              <label>
                Named owner
                <input name="assignee" defaultValue={task?.assignee} required />
              </label>
              <label>
                Due date
                <input
                  type="date"
                  name="due"
                  defaultValue={task?.due ?? plan.end}
                  required
                />
              </label>
              <label>
                Status
                <select name="status" defaultValue={task?.status}>
                  {["planned", "working", "blocked", "done"].map((s) => (
                    <option key={s}>{s}</option>
                  ))}
                </select>
              </label>
            </div>
            <label>
              Blocker
              <textarea name="blocker" defaultValue={task?.blocker} />
            </label>
            <label>
              Completion evidence
              <select
                name="completionSourceId"
                defaultValue={task?.completionSourceId ?? ""}
              >
                <option value="">None · task cannot be done</option>
                {sources.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.title}
                  </option>
                ))}
              </select>
            </label>
            <button className="button primary">Save trial task</button>
          </form>
        </Modal>
      )}
    </div>
  );
}
function PlanForm({
  customer,
  previous,
  onDone,
}: {
  customer: Partner;
  previous?: TrialPlan;
  onDone: () => void;
}) {
  const { state, mutate, notice } = useGuild();
  const sources = state.sources.filter((s) => s.partnerId === customer.id);
  const sourceOptions = (
    <>
      {sources.map((s) => (
        <option key={s.id} value={s.id}>
          {s.title} · {s.kind}
        </option>
      ))}
    </>
  );
  return (
    <form
      className="panel trial-plan-form"
      onSubmit={async (e) => {
        e.preventDefault();
        const f = new FormData(e.currentTarget);
        try {
          const plan = TrialPlanSchema.parse({
            id: crypto.randomUUID(),
            trialId: previous?.trialId ?? crypto.randomUUID(),
            partnerId: customer.id,
            version: (previous?.version ?? 0) + 1,
            previousId: previous?.id ?? "",
            needsSourceId: f.get("needsSourceId"),
            start: f.get("start"),
            end: f.get("end"),
            startupDeliverables: f.get("startupDeliverables"),
            customerResponsibilities: f.get("customerResponsibilities"),
            metric: {
              baselineStart: f.get("baselineStart"),
              baselineEnd: f.get("baselineEnd"),
              name: f.get("metric"),
              baseline:
                f.get("baseline") === "" ? null : Number(f.get("baseline")),
              target: Number(f.get("target")),
              unit: f.get("unit"),
              direction: f.get("direction"),
              comparison: f.get("comparison"),
              periodDays: Number(f.get("periodDays")),
              exposure: f.get("exposure"),
              method: f.get("method"),
              baselineSourceId: f.get("baselineSourceId"),
            },
            paidOffer: {
              description: f.get("offer"),
              amountCents: Math.round(Number(f.get("amount")) * 100),
              currency: "USD",
              cadence: f.get("cadence"),
              conditions: f.get("conditions"),
            },
            founderApprovalSourceId: "",
            customerApprovalSourceId: "",
            createdAt: new Date().toISOString(),
            evaluationKind: f.get("evaluationKind"),
            workingProduct: f.get("workingProduct"),
            buyer: {
              champion: String(f.get("champion") || "Unknown"),
              decisionOwner: String(f.get("decisionOwner") || "Unknown"),
              decisionDate: String(f.get("decisionDate") || ""),
              approvalBlockers: String(f.get("approvalBlockers") || "Unknown"),
            },
          });
          if (await mutate({ type: "trial.plan.add", plan })) onDone();
        } catch (err) {
          notice(err instanceof Error ? err.message : "Review plan fields");
        }
      }}
    >
      <span className="editorial-index">
        {previous ? "AMENDMENT / NEW VERSION" : "A SHORT CUSTOMER TRIAL"}
      </span>
      <h3>
        {previous
          ? "Review the changed terms."
          : "Define success before you start."}
      </h3>
      <p>Save a draft, then record both reviews before measuring the trial.</p>
      <div className="form-grid">
        <label>
          What kind of evaluation?
          <select name="evaluationKind" defaultValue={previous?.evaluationKind}>
            <option value="pilot">
              Pilot · evaluate an existing deliverable
            </option>
            <option value="design partnership">
              Design partnership · co-develop the product
            </option>
            <option value="discovery">
              Discovery · understand the problem first
            </option>
          </select>
        </label>
        <label>
          Is there a working deliverable?
          <select
            name="workingProduct"
            defaultValue={previous?.workingProduct ?? "unknown"}
          >
            <option value="unknown">Not established yet</option>
            <option value="yes">Yes</option>
            <option value="no">No · begin with discovery</option>
          </select>
        </label>
      </div>
      <div className="form-grid">
        <label>
          Conversation source
          <select
            name="needsSourceId"
            required
            defaultValue={previous?.needsSourceId}
          >
            {sourceOptions}
          </select>
        </label>
        <label>
          Trial starts
          <input
            name="start"
            type="date"
            required
            defaultValue={previous?.start}
          />
        </label>
        <label>
          Trial ends
          <input name="end" type="date" required defaultValue={previous?.end} />
        </label>
      </div>
      <div className="form-grid">
        <label>
          Startup deliverables
          <textarea
            name="startupDeliverables"
            required
            minLength={5}
            defaultValue={previous?.startupDeliverables}
          />
        </label>
        <label>
          Customer responsibilities
          <textarea
            name="customerResponsibilities"
            required
            minLength={5}
            defaultValue={previous?.customerResponsibilities}
          />
        </label>
      </div>
      <h4>The measurable target</h4>
      <div className="form-grid">
        <label>
          Baseline period starts
          <input
            name="baselineStart"
            type="date"
            defaultValue={previous?.metric.baselineStart}
          />
        </label>
        <label>
          Baseline period ends
          <input
            name="baselineEnd"
            type="date"
            defaultValue={previous?.metric.baselineEnd}
          />
        </label>
      </div>
      <div className="form-grid">
        <label>
          Metric name
          <input name="metric" required defaultValue={previous?.metric.name} />
        </label>
        <label>
          Unit
          <input
            name="unit"
            placeholder="orders per 100 visitors"
            required
            defaultValue={previous?.metric.unit}
          />
        </label>
        <label>
          Baseline value
          <input
            name="baseline"
            type="number"
            step="any"
            defaultValue={previous?.metric.baseline ?? ""}
          />
        </label>
        <label>
          Baseline source
          <select
            name="baselineSourceId"
            defaultValue={previous?.metric.baselineSourceId ?? ""}
          >
            <option value="">Not established</option>
            {sourceOptions}
          </select>
        </label>
        <label>
          Success target
          <input
            name="target"
            type="number"
            step="any"
            required
            defaultValue={previous?.metric.target}
          />
        </label>
        <label>
          Compare
          <select name="comparison" defaultValue={previous?.metric.comparison}>
            <option value="absolute">Absolute value</option>
            <option value="relative change">
              Percentage improvement from baseline
            </option>
          </select>
        </label>
        <label>
          Improvement direction
          <select name="direction" defaultValue={previous?.metric.direction}>
            <option value="higher">Higher is better</option>
            <option value="lower">Lower is better</option>
          </select>
        </label>
        <label>
          Comparable period (days)
          <input
            name="periodDays"
            type="number"
            min="1"
            max="366"
            required
            defaultValue={previous?.metric.periodDays ?? 30}
          />
        </label>
        <label>
          Exposure / normalization
          <input
            name="exposure"
            placeholder="per 100 visitors, same opening hours"
            required
            defaultValue={previous?.metric.exposure}
          />
        </label>
      </div>
      <label>
        Measurement method
        <textarea
          name="method"
          required
          minLength={5}
          defaultValue={previous?.metric.method}
        />
      </label>
      <h4>The paid offer if it works</h4>
      <div className="form-grid">
        <label>
          Customer champion
          <input
            name="champion"
            placeholder="Unknown is okay"
            defaultValue={previous?.buyer.champion}
          />
        </label>
        <label>
          Who decides on the purchase?
          <input
            name="decisionOwner"
            placeholder="Unknown is okay"
            defaultValue={previous?.buyer.decisionOwner}
          />
        </label>
        <label>
          Decision date
          <input
            name="decisionDate"
            type="date"
            defaultValue={previous?.buyer.decisionDate}
          />
        </label>
      </div>
      <label>
        Remaining approvals or missing inputs
        <textarea
          name="approvalBlockers"
          placeholder="Budget, access, approver, or unknown"
          defaultValue={previous?.buyer.approvalBlockers}
        />
      </label>
      <label>
        Paid plan and deliverables
        <textarea
          name="offer"
          required
          minLength={5}
          defaultValue={previous?.paidOffer.description}
        />
      </label>
      <div className="form-grid">
        <label>
          Price (USD)
          <input
            name="amount"
            type="number"
            min="0"
            step=".01"
            required
            defaultValue={previous ? previous.paidOffer.amountCents / 100 : ""}
          />
        </label>
        <label>
          Billing period
          <select name="cadence" defaultValue={previous?.paidOffer.cadence}>
            {["monthly", "annual", "one-time"].map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
        </label>
      </div>
      <label>
        Conditions and decision process
        <textarea
          name="conditions"
          required
          minLength={5}
          defaultValue={previous?.paidOffer.conditions}
        />
      </label>
      <button className="button primary">Save trial plan draft</button>
    </form>
  );
}
function MeasurementForm({ plan }: { plan: TrialPlan }) {
  const { state, mutate } = useGuild();
  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        const f = new FormData(e.currentTarget);
        await mutate({
          type: "trial.measurement.add",
          measurement: {
            id: crypto.randomUUID(),
            trialId: plan.trialId,
            partnerId: plan.partnerId,
            planVersion: plan.version,
            sourceId: String(f.get("sourceId")),
            value: Number(f.get("value")),
            unit: String(f.get("unit")),
            periodDays: Number(f.get("periodDays")),
            exposure: String(f.get("exposure")),
            measuredStart: String(f.get("start")),
            measuredEnd: String(f.get("end")),
            validUntil: String(f.get("validUntil")),
            health: String(f.get("health")) as "reported",
            recordedAt: new Date().toISOString(),
          },
        });
      }}
    >
      <div className="form-grid">
        <label>
          Observed value
          <input name="value" type="number" step="any" required />
        </label>
        <label>
          Unit
          <input name="unit" defaultValue={plan.metric.unit} required />
        </label>
        <label>
          Period length (days)
          <input
            name="periodDays"
            type="number"
            min="1"
            defaultValue={plan.metric.periodDays}
            required
          />
        </label>
        <label>
          Exposure / normalization
          <input name="exposure" defaultValue={plan.metric.exposure} required />
        </label>
        <label>
          Measurement starts
          <input type="date" name="start" defaultValue={plan.start} required />
        </label>
        <label>
          Measurement ends
          <input type="date" name="end" defaultValue={plan.end} required />
        </label>
        <label>
          Fresh through
          <input type="date" name="validUntil" required />
        </label>
        <label>
          Evidence quality
          <select name="health">
            <option value="reported">Reported, comparable collection</option>
            <option value="stale">Stale</option>
            <option value="uncertain">Uncertain</option>
          </select>
        </label>
      </div>
      <label>
        Measurement source
        <select name="sourceId" required>
          <option value="">Select evidence</option>
          {state.sources
            .filter((s) => s.partnerId === plan.partnerId)
            .map((s) => (
              <option key={s.id} value={s.id}>
                {s.title} · {s.kind}
              </option>
            ))}
        </select>
      </label>
      <button className="button primary">Save reported measurement</button>
    </form>
  );
}
