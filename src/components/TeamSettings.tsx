"use client";
import { useEffect, useState } from "react";
import { useGuild, Tag, Modal } from "./Workspace";
export function TeamSettings() {
  const { state, notice } = useGuild();
  const [share, setShare] = useState<{ url: string; tokenHash: string } | null>(
      null,
    ),
    [invite, setInvite] = useState(""),
    [deleting, setDeleting] = useState(false),
    [name, setName] = useState("");
  const [members, setMembers] = useState<{ user_id: string; role: string }[]>(
    [],
  );
  useEffect(() => {
    if (state.mode === "live")
      fetch(`/api/membership?programId=${encodeURIComponent(state.id)}`)
        .then((r) => r.json())
        .then((b) => setMembers(b.members ?? []))
        .catch(() => {});
  }, [state.id, state.mode]);
  const action = async (path: string, body: unknown) => {
    const r = await fetch(path, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const b = await r.json();
    if (!r.ok) throw Error(b.error);
    return b;
  };
  const perform = async (fn: () => Promise<void>) => {
    try {
      await fn();
    } catch (e) {
      notice(e instanceof Error ? e.message : "Operation failed");
    }
  };
  if (state.mode === "demo")
    return (
      <section className="panel">
        <h2>A separate place for real records</h2>
        <p>
          Team membership, revocable sharing and program deletion belong to
          authenticated live programs. The fictional town never creates a user
          or sends invitations.
        </p>
        <a className="button" href="/login">
          Sign in to your program →
        </a>
      </section>
    );
  return (
    <>
      <section className="panel">
        <h2>Team and ownership</h2>
        <p>
          Owner controls sharing and membership. Editors can change records;
          viewers can only read. Owner access cannot be removed through a
          member-revoke action.
        </p>
        {members.map((m) => (
          <div key={m.user_id} className="history-row">
            <span>{m.user_id}</span>
            <Tag>{m.role}</Tag>
            {m.role !== "owner" && (
              <button
                className="button small danger"
                onClick={() =>
                  void perform(async () => {
                    await action("/api/membership", {
                      action: "revoke",
                      programId: state.id,
                      userId: m.user_id,
                    });
                    setMembers(members.filter((x) => x.user_id !== m.user_id));
                    notice(
                      "Membership revoked. Future reads and writes are denied.",
                    );
                  })
                }
              >
                Revoke access
              </button>
            )}
          </div>
        ))}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            const f = new FormData(e.currentTarget);
            void perform(async () => {
              const b = await action("/api/membership", {
                action: "invite",
                programId: state.id,
                email: String(f.get("email")),
                role: String(f.get("role")),
              });
              setInvite(b.url);
            });
          }}
        >
          <div className="form-grid">
            <label>
              Invite verified email
              <input name="email" type="email" required />
            </label>
            <label>
              Role
              <select name="role">
                <option value="viewer">Viewer</option>
                <option value="editor">Editor</option>
              </select>
            </label>
          </div>
          <button className="button">Create copy-only invitation</button>
        </form>
        {invite && (
          <p className="notice info">
            Not sent. Share this invitation yourself:{" "}
            <a href={invite}>{invite}</a>
          </p>
        )}
      </section>
      <section className="panel">
        <h2>Revocable redacted sharing</h2>
        <p>
          Creates a seven-day read-only snapshot containing point allocations
          only. Partner identities, people, source text, commercial values and
          notes are excluded.
        </p>
        {share ? (
          <>
            <p>
              <a href={share.url} target="_blank" rel="noreferrer">
                Open redacted snapshot ↗
              </a>
            </p>
            <button
              className="button danger"
              onClick={() =>
                void perform(async () => {
                  await action("/api/shares", {
                    action: "revoke",
                    programId: state.id,
                    tokenHash: share.tokenHash,
                  });
                  setShare(null);
                  notice(
                    "Share revoked. The token no longer serves its snapshot.",
                  );
                })
              }
            >
              Revoke this share
            </button>
          </>
        ) : (
          <button
            className="button"
            onClick={() =>
              void perform(async () =>
                setShare(
                  await action("/api/shares", {
                    action: "create",
                    programId: state.id,
                  }),
                ),
              )
            }
          >
            Create redacted share link
          </button>
        )}
      </section>
      <section className="panel">
        <h2>Session and data</h2>
        <div className="inline">
          <button
            className="button"
            onClick={() =>
              void perform(async () => {
                await action("/api/signout", {});
                sessionStorage.clear();
                location.replace("/login");
              })
            }
          >
            Sign out and clear private view
          </button>
          <button className="button danger" onClick={() => setDeleting(true)}>
            Delete this program
          </button>
        </div>
      </section>
      {deleting && (
        <Modal
          title="Delete private program data"
          onClose={() => setDeleting(false)}
        >
          <p>
            This permanently deletes this program’s records, evidence, jobs,
            decisions, invitations and share links. Export your records first.
            Your authentication account is separate.
          </p>
          <label>
            Type {state.name} to confirm
            <input value={name} onChange={(e) => setName(e.target.value)} />
          </label>
          <button
            className="button danger"
            disabled={name !== state.name}
            onClick={() =>
              void perform(async () => {
                await action("/api/membership", {
                  action: "delete",
                  programId: state.id,
                  confirmation: name,
                });
                location.replace("/login");
              })
            }
          >
            Permanently delete this program
          </button>
        </Modal>
      )}
    </>
  );
}
