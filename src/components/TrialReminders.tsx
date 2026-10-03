"use client";
import { useEffect, useState } from "react";
export function TrialReminders({
  programId,
  partnerId,
}: {
  programId: string;
  partnerId: string;
}) {
  const [items, setItems] = useState<
      { task_id: string; day: string; summary: string }[]
    >([]),
    [error, setError] = useState("");
  useEffect(() => {
    let active = true;
    fetch(
      `/api/reminders?programId=${encodeURIComponent(programId)}&partnerId=${encodeURIComponent(partnerId)}`,
      { cache: "no-store" },
    )
      .then(async (r) => {
        const b = await r.json();
        if (!r.ok) throw Error(b.error);
        if (active) {
          setItems(b.reminders);
          setError("");
        }
      })
      .catch((e) => {
        if (active) setError(e.message);
      });
    return () => {
      active = false;
    };
  }, [programId, partnerId]);
  return (
    <section className="panel">
      <h3>In-app reminders</h3>
      {error ? (
        <p role="status">Reminders unavailable: {error}</p>
      ) : items.length ? (
        items.map((r, i) => (
          <p key={`${r.task_id}/${r.day}/${i}`}>
            <small>{r.day}</small>
            <br />
            {r.summary}
          </p>
        ))
      ) : (
        <p className="muted">
          No delivered reminders. Scheduled execution requires the connected job
          service.
        </p>
      )}
    </section>
  );
}
