"use client";
import { State, roles } from "@/lib/domain";
export function Town({
  state,
  selected = [],
  onPartner,
  onRole,
  landing = false,
}: {
  state?: State;
  selected?: string[];
  onPartner?: (id: string) => void;
  onRole?: (role: (typeof roles)[number]) => void;
  landing?: boolean;
}) {
  const stations = [
    { x: 17, y: 30 },
    { x: 38, y: 24 },
    { x: 66, y: 29 },
    { x: 84, y: 51 },
    { x: 20, y: 53 },
  ];
  const plots = [
    { x: 35, y: 82 },
    { x: 57, y: 86 },
    { x: 79, y: 88 },
    { x: 45, y: 58 },
    { x: 68, y: 60 },
  ];
  return (
    <div className={`world-scroll ${landing ? "landing-world" : ""}`}>
      <div className="guild-world" aria-label="Pixel forest town">
        <img
          className="world-art"
          src="/art/guild-world.png"
          alt="An original pixel-art guild village with a stone hall, observatory, forge, wooded paths and partner cottages."
        />
        {!landing &&
          stations.map((p, i) => {
            const role = roles[i],
              run = state?.runs
                .filter((r) => r.role === role)
                .sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0];
            const working =
              run?.status === "working" || run?.status === "queued";
            return (
              <button
                key={role}
                className={`world-pin agent-pin ${working ? "is-working" : ""}`}
                style={{ left: `${p.x}%`, top: `${p.y}%` }}
                onClick={() => onRole?.(role)}
                aria-label={`${role} · ${run?.status ?? "ready"}`}
              >
                <span className="pin-dot" />
                <b>{role}</b>
                <span className="pin-status">
                  {working
                    ? "Working"
                    : run?.status === "needs-review"
                      ? "Review ready"
                      : run?.status === "failed"
                        ? "Failed"
                        : "Open"}
                </span>
                {working && (
                  <span className="working-beacon" aria-hidden="true" />
                )}
              </button>
            );
          })}
        {!landing &&
          state?.partners.slice(0, 5).map((p, i) => {
            const pos = plots[i],
              projected = state.work.some(
                (w) => selected.includes(w.id) && w.partnerIds.includes(p.id),
              );
            return (
              <button
                key={p.id}
                className={`world-pin partner-pin ${projected ? "projected" : ""}`}
                style={{ left: `${pos.x}%`, top: `${pos.y}%` }}
                onClick={() => onPartner?.(p.id)}
              >
                <span className="pin-dot" />
                <b>
                  {p.name.replace(/ (Logistics|Operations|Enterprise)$/, " ")}
                </b>
                <small>{projected ? "Scenario preview" : p.stage}</small>
              </button>
            );
          })}
        <span className="world-title">THE GUILD GROUNDS</span>
      </div>
    </div>
  );
}
