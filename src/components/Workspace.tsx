"use client";
import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useRef,
} from "react";
import Link from "next/link";
import { ConversationProvider } from "@elevenlabs/react";
import { usePathname, useRouter } from "next/navigation";
import {
  Building2,
  Bot,
  Map,
  GitBranch,
  Scale,
  BookOpen,
  ScrollText,
  Settings,
  ArrowUpRight,
  Plus,
  Mic,
  ChevronRight,
  Download,
  LogOut,
  LoaderCircle,
  X,
} from "lucide-react";
import {
  State,
  Partner,
  Role,
  roles,
  calculate,
  money,
  readiness,
  inputHash,
} from "@/lib/domain";
import { Command } from "@/lib/commands";
import { readDemo, mutateDemo, subscribeDemo } from "@/lib/demo-store";
import { TrialWorkspace } from "./TrialWorkspace";
import { Frontdesk } from "./video-inspired/Frontdesk";
import { Capacity } from "./Capacity";
import { PartnerPanel, PartnerEditor } from "./PartnerPanel";
import {
  Evidence,
  Requests,
  SettingsPanel,
  AgentPanel,
  VoicePanel,
  ImportPanel,
} from "./WorkPanels";

import { useLocalAgents } from "./useLocalAgents";
import { AgentWorkspace } from "./AgentWorkspace";
import { GuildOverview } from "./GuildOverview";
import { LiveTerminal } from "./LiveTerminal";

type InputCommand = Command extends infer C
  ? C extends Command
    ? Omit<C, "key" | "expectedVersion">
    : never
  : never;
type Ctx = {
  state: State;
  localAgent: ReturnType<typeof useLocalAgents>;
  mutate: (c: InputCommand) => Promise<boolean>;
  base: string;
  openSource: (id: string) => void;
  notice: (s: string) => void;
  refresh: () => Promise<void>;
};
const Context = createContext<Ctx | null>(null);
export const useGuild = () => {
  const c = useContext(Context);
  if (!c) throw Error("Missing guild context");
  return c;
};
export function Modal({
  title,
  children,
  onClose,
  wide = false,
}: {
  title: string;
  children: React.ReactNode;
  onClose: () => void;
  wide?: boolean;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const previous =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
    ref.current?.showModal();
    const d = ref.current;
    return () => {
      d?.close();
      queueMicrotask(() => {
        if (previous?.isConnected) previous.focus();
      });
    };
  }, []);
  return (
    <dialog
      ref={ref}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      className={`dialog ${wide ? "wide" : ""}`}
    >
      <header>
        <h2>{title}</h2>
        <button
          className="icon-button"
          onClick={onClose}
          aria-label="Close dialog"
        >
          <X size={20} />
        </button>
      </header>
      <div className="dialog-body">{children}</div>
    </dialog>
  );
}
export function Tag({
  children,
  tone = "neutral",
}: {
  children: React.ReactNode;
  tone?: string;
}) {
  return <span className={`tag ${tone}`}>{children}</span>;
}
export function Empty({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="empty">
      <span className="empty-mark">◇</span>
      <h3>{title}</h3>
      <p>{children}</p>
    </div>
  );
}
export function Workspace({ mode }: { mode: "demo" | "live" }) {
  const [state, setState] = useState<State | null>(null),
    [error, setError] = useState(""),
    [message, setMessage] = useState(""),
    [source, setSource] = useState(""),
    [role, setRole] = useState<Role | null>(null),
    [voice, setVoice] = useState(false),
    [create, setCreate] = useState(false),
    [importing, setImporting] = useState(false),
    [preview, setPreview] = useState<string[]>([]);
  const pathname = usePathname(),
    router = useRouter();
  const programId =
    mode === "demo" ? "demo" : pathname.split("/")[3] || "default";
  const base = mode === "demo" ? "/demo" : `/app/programs/${programId}`;
  const section =
    mode === "demo"
      ? pathname.split("/")[2] || "pilots"
      : pathname.split("/")[4] || "pilots";
  const partnerId =
    mode === "demo" ? pathname.split("/")[3] : pathname.split("/")[5];
  const refresh = useCallback(async () => {
    try {
      if (mode === "demo") setState(await readDemo());
      else {
        const r = await fetch(`/api/programs/${programId}`);
        const body = await r.json();
        if (!r.ok) throw Error(body.error);
        setState(body);
      }
      setError("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to load program");
    }
  }, [mode, programId]);
  useEffect(() => {
    void refresh();
    if (mode === "demo") return subscribeDemo(() => void refresh());
  }, [refresh, mode]);
  const mutate = async (c: InputCommand) => {
    if (!state) return false;
    try {
      const command = {
        ...c,
        key: crypto.randomUUID(),
        expectedVersion: state.version,
      } as Command;
      if (mode === "demo") setState(await mutateDemo(command));
      else {
        const res = await fetch(`/api/programs/${programId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(command),
        });
        const body = await res.json();
        if (!res.ok) throw Error(body.error);
        setState(body);
      }
      setMessage("Saved. History and dependent records updated.");
      return true;
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Save failed");
      await refresh();
      return false;
    }
  };
  const localAgent = useLocalAgents(mode, setState);
  if (!state)
    return (
      <main className="loading-screen">
        <Link className="brand" href="/" aria-label="Alchemy home">
          ALCHEMY
        </Link>
        {error ? (
          <>
            <h1>Your workspace needs a connection.</h1>
            <p>{error}</p>
            <div className="inline">
              <button className="button primary" onClick={() => void refresh()}>
                Retry connection
              </button>
              <Link className="button" href="/login">
                Sign in
              </Link>
              <Link className="button parchment" href="/demo">
                Try fictional demo
              </Link>
            </div>
          </>
        ) : (
          <>
            <LoaderCircle className="spin" />
            <p>Opening trial records…</p>
          </>
        )}
      </main>
    );
  const selectedPartner = state.partners.find((p) => p.id === partnerId);
  const nav = [
    ["pilots", "Customers & pilots", Building2],
    ["plan", "Trial Plan", ScrollText],
    ["tasks", "Tasks", Map],
    ["metrics", "Metrics", Scale],
    ["results", "Results", BookOpen],
    ["offer", "Paid Offer", ArrowUpRight],
    ["settings", "Settings", Settings],
  ] as const;
  return (
    <Context.Provider
      value={{
        state,
        localAgent,
        mutate,
        base,
        openSource: setSource,
        notice: setMessage,
        refresh,
      }}
    >
      <div className="app-shell">
        {section === "agents" && <LiveTerminal state={state} compact />}
        <aside className="sidebar">
          <Link className="brand" href="/" aria-label="Alchemy home">
            <span className="brand-icon">✳</span>
            <span>Alchemy</span>
          </Link>
          <div className="workspace-label">YOUR WORKSPACE</div>
          <button
            className="program-switch"
            onClick={() => router.push(`${base}/settings`)}
          >
            <span className="program-icon">{state.name.slice(0, 1)}</span>
            <span>
              {state.name}
              <small>Customer trials</small>
            </span>
            <ChevronRight size={14} />
          </button>
          <nav aria-label="Main navigation">
            {nav.map(([id, label, Icon]) => (
              <Link
                key={id}
                aria-label={label}
                title={label}
                href={
                  id === "pilots"
                    ? base
                    : `${base}/${id}${partnerId && id !== "settings" ? `/${partnerId}` : ""}`
                }
                className={section === id ? "active" : ""}
              >
                <Icon size={19} />
                <span>{label}</span>
                {id === "pilots" && <small>{state.partners.length}</small>}
              </Link>
            ))}
          </nav>
          <div className="sidebar-bottom">
            <Link
              href={mode === "demo" ? "/login" : `${base}/settings`}
              className="profile"
            >
              <span>F</span>
              <div>
                {mode === "demo" ? "Demo founder" : "Your account"}
                <small>
                  {mode === "demo"
                    ? "Local fictional sandbox"
                    : "Authenticated workspace"}
                </small>
              </div>
              <LogOut size={16} />
            </Link>
          </div>
        </aside>
        <main className="main">
          <div className="mode-strip">
            <span>
              <span className="status-dot" />
              {mode === "demo" ? "DEMO WORKSPACE" : "LIVE RECORDS"}
            </span>
            <p>
              {mode === "demo"
                ? "FICTIONAL RECORDS / SOURCED RESULTS"
                : "Private partner records · scoped to this program"}
            </p>
            <Link href={mode === "demo" ? "/app" : "/demo"}>
              {mode === "demo" ? "Go to live records" : "Open demo"}{" "}
              <ArrowUpRight size={13} />
            </Link>
          </div>
          <div className="alchemy-tools">
            <span>SUPPORTING TOOLS</span>
            <Link href={`${base}/agents`}>Agents</Link>
            <Link href={`${base}/frontdesk`}>Frontdesk</Link>
            <Link href={`${base}/capacity`}>Capacity</Link>
            <Link href={`${base}/evidence`}>Evidence</Link>
            <Link href={`${base}/partners`}>Customer records</Link>
          </div>
          <header className="topbar">
            <div>
              <span className="eyebrow">
                {state.name} / {state.capacity.period}
              </span>
              <h1>
                {(
                  {
                    pilots: "From interest to evidence.",
                    plan: "The trial plan.",
                    tasks: "Work, with an owner.",
                    metrics: "Measure the difference.",
                    results: "Show the value.",
                    offer: "A clear commercial decision.",
                    town: "From interest to evidence.",
                    agents: "Good work starts with evidence.",
                    frontdesk: "Every conversation has a next step.",
                    partners: "Your first five.",
                    requests: "One product. Shared progress.",
                    capacity: "Choose what you build next.",
                    decisions: "Decisions with a paper trail.",
                    evidence: "Show your work.",
                    settings: "Your workspace, your boundaries.",
                  } as Record<string, string>
                )[section] ?? "Your workspace"}
              </h1>
            </div>
            <button
              className="button voice-button"
              onClick={() => setVoice(true)}
            >
              <Mic size={17} /> Ask Alchemy
            </button>
          </header>
          {[
            "pilots",
            "plan",
            "tasks",
            "metrics",
            "results",
            "offer",
            "town",
          ].includes(section) && (
            <TrialWorkspace
              section={
                (section === "town" ? "pilots" : section) as
                  "pilots" | "plan" | "tasks" | "metrics" | "results" | "offer"
              }
              selectedId={partnerId}
            />
          )}
          {section === "agents" && <AgentWorkspace />}
          {section === "frontdesk" && <Frontdesk />}
          {section === "partners" &&
            (selectedPartner ? (
              <PartnerPanel partner={selectedPartner} />
            ) : (
              <>
                <div className="section-heading">
                  <p>
                    {state.partners.length} partner relationships. Origin and
                    uncertainty stay visible.
                  </p>
                  <div className="inline">
                    <button
                      className="button"
                      onClick={() => setImporting(true)}
                    >
                      Import records
                    </button>
                    <button
                      className="button primary"
                      onClick={() => setCreate(true)}
                    >
                      <Plus size={16} /> Add partner
                    </button>
                  </div>
                </div>
                <div className="partner-cards">
                  {state.partners.map((p) => (
                    <PartnerCard key={p.id} partner={p} base={base} />
                  ))}
                </div>
                {!state.partners.length && (
                  <Empty title="Meet your first partner">
                    Create a record or preview a CSV import.
                  </Empty>
                )}
              </>
            ))}
          {section === "capacity" && <Capacity />}
          {section === "requests" && <Requests />}
          {section === "evidence" && <Evidence />}
          {section === "settings" && <SettingsPanel />}
          {section === "decisions" && (
            <>
              <div className="notice info">
                Commitments are internal work assignments. A saved plan is never
                delivery, partner acceptance, or payment.
              </div>
              {!state.decisions.length && (
                <Empty title="The next move is yours">
                  Compare a scenario and review it before committing your first
                  decision.
                </Empty>
              )}
              {state.decisions
                .slice()
                .reverse()
                .map((d) => (
                  <article className="panel decision-history" key={d.id}>
                    <div className="inline spread">
                      <Tag tone={d.stale ? "amber" : "green"}>
                        {d.stale ? "STALE · INPUTS CHANGED" : "COMMITTED"}
                      </Tag>
                      <span>{new Date(d.createdAt).toLocaleString()}</span>
                    </div>
                    <h2>
                      {d.selected
                        .map(
                          (id) =>
                            state.work.find((w) => w.id === id)?.title ?? id,
                        )
                        .join(" + ")}
                    </h2>
                    <p>{d.reason}</p>
                    {d.exception && (
                      <p className="notice amber">
                        Capacity exception: {d.exception}
                      </p>
                    )}
                    <div className="stat-row">
                      <span>{String(d.result.effort)} points allocated</span>
                      <span>
                        {money(d.result.value as number)} associated annual
                        opportunity
                      </span>
                      <span>{d.formula}</span>
                    </div>
                    <details>
                      <summary>
                        Reproducible inputs and decision receipt
                      </summary>
                      <pre>{JSON.stringify(d, null, 2)}</pre>
                    </details>
                  </article>
                ))}
              <h2 className="section-title">Version history</h2>
              <div className="panel">
                {state.history.length ? (
                  state.history
                    .slice()
                    .reverse()
                    .map((h) => (
                      <div className="history-row" key={h.id}>
                        <span>v{h.version}</span>
                        <strong>{h.action}</strong>
                        <span>{h.actor}</span>
                        <time>{new Date(h.at).toLocaleString()}</time>
                      </div>
                    ))
                ) : (
                  <p className="muted">No edits or decisions recorded yet.</p>
                )}
              </div>
            </>
          )}
          <footer className="app-footer">
            <span>
              ALCHEMY{" "}
              <span className="muted">
                / a little structure for the beginning
              </span>
            </span>
            <span>
              Saved version {state.version} ·{" "}
              {mode === "demo" ? "fictional sandbox" : "private program"}
            </span>
          </footer>
        </main>
      </div>
      {message && (
        <div role="status" className="toast">
          <span>{message}</span>
          <button onClick={() => setMessage("")} aria-label="Dismiss message">
            <X size={16} />
          </button>
        </div>
      )}
      {source && (
        <Modal
          title="Evidence, not an assumption"
          onClose={() => setSource("")}
          wide
        >
          <Evidence selectedId={source} />
        </Modal>
      )}
      {role && (
        <Modal
          title={`${role} · guild activity`}
          onClose={() => setRole(null)}
          wide
        >
          {localAgent.enabled ? (
            <AgentWorkspace initialRole={role} />
          ) : (
            <AgentPanel role={role} />
          )}
        </Modal>
      )}
      {voice && (
        <Modal title="Ask Alchemy" onClose={() => setVoice(false)}>
          <ConversationProvider>
            <VoicePanel onClose={() => setVoice(false)} />
          </ConversationProvider>
        </Modal>
      )}
      {create && (
        <Modal title="Add a design partner" onClose={() => setCreate(false)}>
          <PartnerEditor onDone={() => setCreate(false)} />
        </Modal>
      )}
      {importing && (
        <Modal
          title="Preview a partner import"
          onClose={() => setImporting(false)}
          wide
        >
          <ImportPanel onDone={() => setImporting(false)} />
        </Modal>
      )}
    </Context.Provider>
  );
}
function PartnerCard({ partner: p, base }: { partner: Partner; base: string }) {
  const r = readiness(p);
  return (
    <Link href={`${base}/partners/${p.id}`} className="partner-card">
      <div className="inline spread">
        <span className={`partner-initial ${p.id === "kite" ? "purple" : ""}`}>
          {p.name[0]}
        </span>
        <Tag>
          {p.origin === "fixture" ? "FICTIONAL" : p.origin.toUpperCase()}
        </Tag>
      </div>
      <h3>
        {p.name} <ArrowUpRight size={16} />
      </h3>
      <p>{p.segment || "Segment not yet confirmed"}</p>
      <div className="card-rule" />
      <div className="inline spread">
        <span>Conditional {p.basis} opportunity</span>
        <strong>{money(p.opportunityCents, p.currency)}</strong>
      </div>
      <div className="check-progress">
        <i style={{ width: `${r.percent ?? 0}%` }} />
      </div>
      <div className="inline spread">
        <span>
          {r.met}/{r.total} readiness checks
        </span>
        <span className="stage-label">{p.stage}</span>
      </div>
    </Link>
  );
}
