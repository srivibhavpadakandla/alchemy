"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { Role, Run, State } from "@/lib/domain";
import { readDemo, mutateDemo } from "@/lib/demo-store";
export function useLocalAgents(
  mode: "demo" | "live",
  setState: (s: State) => void,
) {
  const [enabled, setEnabled] = useState(false),
    [error, setError] = useState(""),
    [connectionError, setConnectionError] = useState("");
  const serial = useRef(Promise.resolve());
  const sync = useCallback(
    (runs: Run[]) => {
      serial.current = serial.current
        .catch(() => {})
        .then(async () => {
          for (const run of runs) {
            for (let attempt = 0; attempt < 3; attempt++) {
              const state = await readDemo(),
                old = state.runs.find((r) => r.id === run.id);
              if (old?.updatedAt === run.updatedAt) break;
              try {
                setState(
                  await mutateDemo({
                    type: "run.save",
                    run,
                    key: `local-${run.id}-${run.updatedAt}`,
                    expectedVersion: state.version,
                  }),
                );
                break;
              } catch (e) {
                if (attempt === 2) throw e;
              }
            }
          }
        })
        .catch((e) =>
          setError(
            e instanceof Error ? e.message : "Unable to save agent result.",
          ),
        );
      return serial.current;
    },
    [setState],
  );
  useEffect(() => {
    if (mode !== "demo") return;
    let stopped = false,
      timer: ReturnType<typeof setTimeout>;
    const poll = async () => {
      let delay = 5000;
      try {
        const res = await fetch("/api/local-agent", { cache: "no-store" });
        if (!res.ok)
          throw Error("Local agent connection interrupted. Retrying…");
        const body = await res.json();
        if (stopped) return;
        setEnabled(body.enabled);
        setConnectionError("");
        if (body.enabled) {
          await sync(body.runs);
          if (
            body.runs.some((r: Run) => ["working", "queued"].includes(r.status))
          )
            delay = 1000;
        }
      } catch (e) {
        if (!stopped)
          setConnectionError(e instanceof Error ? e.message : "Local connection failed.");
      }
      if (!stopped) timer = setTimeout(poll, delay);
    };
    void poll();
    return () => {
      stopped = true;
      clearTimeout(timer);
    };
  }, [mode, sync]);
  const launch = async (role: Role) => {
    setError("");
    try {
      const state = await readDemo();
      const res = await fetch("/api/local-agent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ state, role, key: crypto.randomUUID() }),
      });
      const b = await res.json();
      if (!res.ok) throw Error(b.error);
      await sync([b.run]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Task failed to start.");
    }
  };
  const cancel = async (id: string) => {
    try {
      const res = await fetch("/api/local-agent", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      const b = await res.json();
      if (!res.ok) throw Error(b.error);
      await sync([b.run]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Cancel failed.");
    }
  };
  return { enabled, error: error || connectionError, launch, cancel };
}
