"use client";
import { useEffect, useState } from "react";
import { useGuild } from "./Workspace";
export function PrivateAttachments({ partnerId }: { partnerId: string }) {
  const { state, notice, refresh } = useGuild();
  const [files, setFiles] = useState<
      { id: string; filename: string; size_bytes: number }[]
    >([]),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [revision, setRevision] = useState(0);
  useEffect(() => {
    if (state.mode !== "live") return;
    let active = true;
    fetch(
      `/api/attachments?programId=${encodeURIComponent(state.id)}&partnerId=${encodeURIComponent(partnerId)}`,
      { cache: "no-store" },
    )
      .then(async (r) => {
        const b = await r.json();
        if (!r.ok) throw Error(b.error);
        if (active) {
          setFiles(b.attachments);
          setError("");
        }
      })
      .catch((e) => {
        if (active) setError(e.message);
      });
    return () => {
      active = false;
    };
  }, [state.mode, state.id, partnerId, revision]);
  if (state.mode !== "live")
    return (
      <p className="muted">
        Private attachments require the hosted authenticated workspace. No demo
        upload is simulated.
      </p>
    );
  return (
    <section className="private-attachments">
      <h4>Private evidence files</h4>
      {error && <p role="status">{error}</p>}
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          setError("");
          try {
            const f = new FormData(e.currentTarget);
            f.set("programId", state.id);
            f.set("partnerId", partnerId);
            const r = await fetch("/api/attachments", {
              method: "POST",
              body: f,
            });
            const b = await r.json();
            if (!r.ok) throw Error(b.error);
            notice(`Private file recorded: ${b.filename}.`);
            setRevision((n) => n + 1);
            await refresh();
          } catch (e) {
            setError(e instanceof Error ? e.message : "Upload failed");
          } finally {
            setBusy(false);
          }
        }}
      >
        <label>
          Evidence file · PDF, PNG or JPEG, up to 5 MB
          <input
            type="file"
            name="file"
            accept="application/pdf,image/png,image/jpeg"
            required
          />
        </label>
        <button className="button" disabled={busy}>
          {busy ? "Uploading…" : "Upload private evidence"}
        </button>
      </form>
      {files.map((f) => (
        <button
          key={f.id}
          className="evidence-row"
          onClick={async () => {
            try {
              const r = await fetch(
                `/api/attachments?id=${encodeURIComponent(f.id)}`,
              );
              const b = await r.json();
              if (!r.ok) throw Error(b.error);
              const a = document.createElement("a");
              a.href = b.url;
              a.rel = "noopener noreferrer";
              a.target = "_blank";
              a.click();
            } catch (e) {
              setError(e instanceof Error ? e.message : "Download failed");
            }
          }}
        >
          <strong>{f.filename}</strong>
          <span>{f.size_bytes} bytes · private download ↗</span>
        </button>
      ))}
    </section>
  );
}
