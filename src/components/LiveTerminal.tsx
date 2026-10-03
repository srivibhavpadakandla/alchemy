"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Run, State } from "@/lib/domain";
const eventText: Record<string, string> = {
  read_pinned_program: "Program evidence pinned",
  codex_session: "Authenticated model session opened",
  analysis_started: "Reading partner evidence…",
  validated_result: "Analysis validated. Awaiting founder review.",
  task_failed: "Task failed validation",
};
export function LiveTerminal({
  state,
  compact = false,
}: {
  state?: State;
  compact?: boolean;
}) {
  const [remote, setRemote] = useState<Run[]>([]),
    [loaded, setLoaded] = useState(false),
    [error, setError] = useState("");
  useEffect(() => {
    if (state) return;
    let stopped = false,
      timer: ReturnType<typeof setTimeout>;
    const poll = async () => {
      try {
        const res = await fetch("/api/local-agent", { cache: "no-store" });
        if (!res.ok) throw Error("Execution log unavailable");
        const body = await res.json();
        if (!stopped) {
          setRemote(body.runs || []);
          setLoaded(true);
          setError("");
        }
      } catch {
        if (!stopped) setError("Execution log unavailable");
      }
      if (!stopped) timer = setTimeout(poll, 10000);
    };
    void poll();
    return () => {
      stopped = true;
      clearTimeout(timer);
    };
  }, [state]);
  const runs = state?.runs ?? remote;
  const active = runs.filter((r) => ["working", "queued"].includes(r.status));
  const events = runs
    .flatMap((r) => r.receipts.map((e) => ({ ...e, role: r.role })))
    .sort((a, b) => a.at.localeCompare(b.at))
    .slice(-3);
  const ready = runs.filter((r) => r.status === "needs-review").length;
  return (
    <div
      className={`execution-terminal ${compact ? "compact-terminal" : ""}`}
      aria-label="Actual agent execution log"
    >
      <div className="terminal-lines">
        {events.length ? (
          events.map((e, i) => (
            <div key={`${e.at}-${i}`}>
              <span className="terminal-chevron">&gt;</span>
              <time>
                {new Date(e.at).toLocaleTimeString("en-GB", {
                  hour: "2-digit",
                  minute: "2-digit",
                  second: "2-digit",
                })}
              </time>
              <span className="terminal-role">{e.role.toLowerCase()}</span>
              <span>{eventText[e.tool] ?? e.summary}</span>
            </div>
          ))
        ) : (
          <>
            <div>
              <span className="terminal-chevron">&gt;</span>
              <span>Welcome to LaunchGuild</span>
            </div>
            <div>
              <span className="terminal-chevron">&gt;</span>
              <span>
                {error ||
                  (!state && !loaded
                    ? "Opening execution log…"
                    : "Five specialists. Ready when you are.")}
              </span>
            </div>
          </>
        )}
        <div className="terminal-current">
          <span className="terminal-chevron">&gt;</span>
          <span>
            {active.length
              ? `${active.map((r) => r.role).join(" + ")} working on your program`
              : ready
                ? `${ready} validated analyses recorded. Standing by.`
                : "Standing by for your first task."}
          </span>
          <span className="terminal-cursor" aria-hidden="true" />
        </div>
      </div>
      <Link
        className="terminal-link"
        href={`${state?.mode === "live" ? `/app/programs/${state.id}` : "/demo"}/agents`}
      >
        {active.length ? "LIVE EXECUTION" : "OPEN AGENT LOG"}
        <span
          className={
            active.length ? "terminal-led working-led" : "terminal-led"
          }
        />
      </Link>
    </div>
  );
}
