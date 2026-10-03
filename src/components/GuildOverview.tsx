"use client";
import Link from "next/link";
import { ArrowUpRight, Plus, Play } from "lucide-react";
import { Role, calculate, money, roles } from "@/lib/domain";
import { useGuild, Tag } from "./Workspace";
import { AgentPortrait, roleJobs } from "./AgentWorkspace";
export function GuildOverview({
  onRole,
  onCreate,
}: {
  onRole: (r: Role) => void;
  onCreate: () => void;
}) {
  const { state, base } = useGuild();
  const active = state.runs.filter((r) =>
    ["queued", "working"].includes(r.status),
  );
  const ready = state.runs.filter((r) => r.status === "needs-review");
  const latest = [...state.runs].sort((a, b) =>
    b.updatedAt.localeCompare(a.updatedAt),
  )[0];
  return (
    <>
      <section className="mission-hero">
        <img src="/art/office-noir.png" alt="" className="mission-photo" />
        <div className="mission-shade" />
        <div className="mission-heading">
          <span className="eyebrow">
            {state.name.toUpperCase()} / MISSION CONTROL
          </span>
          <h2>
            One founder.
            <br />
            <em>Five perspectives.</em>
          </h2>
          <Link href={`${base}/agents`} className="metal-button">
            <Play size={13} />
            PUT YOUR TEAM TO WORK
          </Link>
        </div>
        <div className="mission-live">
          <span className="signal-light" />
          <span>
            {active.length
              ? `${active.map((r) => r.role).join(" + ")} working`
              : ready.length
                ? `${ready.length} analyses ready for review`
                : "Standing by for your first task"}
          </span>
        </div>
      </section>
      <div className="hud guild-hud">
        <div>
          <span>DESIGN PARTNERS</span>
          <strong>
            {state.partners.length}
            <small> / 5</small>
          </strong>
        </div>
        <div>
          <span>AVAILABLE CAPACITY</span>
          <strong>
            {state.capacity.total -
              state.capacity.core -
              state.capacity.support}
            <small> points</small>
          </strong>
        </div>
        <div>
          <span>ACTUAL CURRENT ARR</span>
          <strong>
            {money(calculate(state, []).currentArr)}
            <small> / year</small>
          </strong>
        </div>
        <div>
          <span>RECORDED ANALYSES</span>
          <strong>
            {ready.length}
            <small> awaiting review</small>
          </strong>
        </div>
      </div>
      <section className="mission-crew">
        <div className="section-heading">
          <div>
            <span className="eyebrow">01 / YOUR SPECIALISTS</span>
            <h2>The team is here.</h2>
          </div>
          <Link href={`${base}/agents`} className="text-link">
            OPEN AGENT WORKSPACE
            <ArrowUpRight size={14} />
          </Link>
        </div>
        <div className="crew-strip">
          {roles.map((role) => {
            const run = [...state.runs]
              .filter((r) => r.role === role)
              .sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0];
            return (
              <button key={role} onClick={() => onRole(role)}>
                <AgentPortrait role={role} />
                <span>
                  <strong>{role}</strong>
                  <small>{roleJobs[role]}</small>
                  <span
                    className={`crew-status ${run?.status === "working" ? "crew-working" : ""}`}
                  >
                    {run?.status === "needs-review"
                      ? "READY TO REVIEW"
                      : (run?.status?.toUpperCase() ?? "STANDING BY")}
                  </span>
                </span>
                <ArrowUpRight size={14} />
              </button>
            );
          })}
        </div>
      </section>
      <div className="overview-bottom">
        <section className="partner-ledger">
          <div className="section-heading">
            <div>
              <span className="eyebrow">02 / YOUR FIRST FIVE</span>
              <h2>People. Progress. Possibility.</h2>
            </div>
            <button className="button" onClick={onCreate}>
              <Plus size={15} />
              Add partner
            </button>
          </div>
          {state.partners.map((p, i) => (
            <Link
              className="partner-card ledger-row"
              key={p.id}
              href={`${base}/partners/${p.id}`}
            >
              <span className={`ledger-avatar avatar-${i}`}>
                {String(i + 1).padStart(2, "0")}
              </span>
              <div>
                <h3>{p.name}</h3>
                <small>{p.nextAction.action || p.problem}</small>
              </div>
              <Tag>{p.stage}</Tag>
              <ArrowUpRight size={16} />
            </Link>
          ))}
          {!state.partners.length && <p>Add your first partner to begin.</p>}
        </section>
        <aside className="next-decision">
          <span className="eyebrow">03 / YOUR NEXT MOVE</span>
          <h2>
            {state.mode === "demo"
              ? "Build once. Help two."
              : "Make the next decision."}
          </h2>
          <p>
            {state.mode === "demo"
              ? "Compare the shared Salesforce build with Kite’s custom approval workflow."
              : "Compare work and available capacity before making a commitment."}
          </p>
          {state.mode === "demo" && (
            <>
              <div>
                <span>Shared integration</span>
                <strong>
                  {state.work.find((w) => w.id === "salesforce")?.effort ?? "—"}{" "}
                  pts
                </strong>
              </div>
              <div>
                <span>Custom approval</span>
                <strong>
                  {state.work.find((w) => w.id === "custom_approval")?.effort ??
                    "—"}{" "}
                  pts
                </strong>
              </div>
            </>
          )}
          <Link href={`${base}/capacity`}>
            COMPARE THE TRADEOFF
            <ArrowUpRight size={15} />
          </Link>
          <small>Opportunity estimates remain conditional.</small>
        </aside>
      </div>
      {latest && (
        <section className="latest-dispatch">
          <span className="eyebrow">
            LATEST DISPATCH / {latest.role.toUpperCase()}
          </span>
          <p>
            {latest.status === "needs-review" &&
            latest.output &&
            typeof latest.output === "object" &&
            "summary" in latest.output
              ? String(latest.output.summary)
              : latest.error || `Task ${latest.status}.`}
          </p>
          <Link href={`${base}/agents`}>
            READ THE EXECUTION RECEIPT
            <ArrowUpRight size={14} />
          </Link>
        </section>
      )}
    </>
  );
}
