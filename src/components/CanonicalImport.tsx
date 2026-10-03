"use client";
import { useState } from "react";
import { State, StateSchema } from "@/lib/domain";
import { useGuild } from "./Workspace";
export function CanonicalImport() {
  const { state, mutate, notice } = useGuild();
  const [incoming, setIncoming] = useState<State | null>(null);
  const supported = ["fit", "problem", "segment", "workaround"];
  const changes = incoming
    ? incoming.partners.flatMap((p) => {
        const current = state.partners.find((x) => x.id === p.id);
        if (!current) return [];
        return supported
          .filter(
            (field) =>
              String(current[field as keyof typeof current]) !==
              String(p[field as keyof typeof p]),
          )
          .map((field) => ({
            partner: current,
            field,
            before: current[field as keyof typeof current],
            after: p[field as keyof typeof p],
          }));
      })
    : [];
  return (
    <section className="panel">
      <h2>Reimport as proposed versions</h2>
      <p>
        Load a canonical export. Matching stable IDs produce reviewed field
        corrections, never silent overwrites. Agreement, milestone and financial
        changes must use their dedicated evidence workflows.
      </p>
      <label>
        Canonical JSON export
        <input
          type="file"
          accept=".json,application/json"
          onChange={async (e) => {
            try {
              const f = e.target.files?.[0];
              if (!f) return;
              if (f.size > 1e6) throw Error("Export exceeds 1 MB");
              const parsed = StateSchema.parse(JSON.parse(await f.text()));
              if (parsed.mode !== state.mode)
                throw Error("Demo and live exports cannot cross modes");
              setIncoming(parsed);
            } catch (e) {
              notice(
                e instanceof Error ? e.message : "Invalid canonical export",
              );
            }
          }}
        />
      </label>
      {incoming && (
        <>
          <p>
            {changes.length} editable field differences.{" "}
            {
              incoming.partners.filter(
                (p) => !state.partners.some((x) => x.id === p.id),
              ).length
            }{" "}
            unmatched partner IDs require a reviewed CSV/new-record import.
          </p>
          {changes.map((c) => (
            <div className="source-quote" key={`${c.partner.id}-${c.field}`}>
              <h3>
                {c.partner.name} / {c.field}
              </h3>
              <p>
                {String(c.before)} → {String(c.after)}
              </p>
              <button
                className="button"
                onClick={async () => {
                  await mutate({
                    type: "proposal.create",
                    proposal: {
                      id: crypto.randomUUID(),
                      entity: "partner",
                      entityId: c.partner.id,
                      field: c.field,
                      before: c.before,
                      after: c.after,
                      expectedVersion: c.partner.version,
                      reason: `Canonical reimport from version ${incoming.version}; founder review required`,
                      sourceIds: [],
                      state: "pending",
                      createdAt: new Date().toISOString(),
                      version: 1,
                    },
                  });
                }}
              >
                Create scoped proposal
              </button>
            </div>
          ))}
        </>
      )}
    </section>
  );
}
