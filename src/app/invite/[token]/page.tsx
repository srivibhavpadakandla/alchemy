"use client";
import { use, useState } from "react";
import Link from "next/link";
export default function Invite({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = use(params),
    [message, setMessage] = useState("");
  return (
    <main className="loading-screen">
      <Link className="brand" href="/">
        ALCHEMY
      </Link>
      <h1>Join a shared trial.</h1>
      <p>
        Sign in with the verified email this invitation was addressed to.
        Invitations expire after seven days.
      </p>
      <Link
        href={`/login?next=${encodeURIComponent(`/invite/${token}`)}`}
        className="button"
      >
        Sign in first
      </Link>
      <button
        className="button primary"
        onClick={async () => {
          const r = await fetch("/api/membership", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ action: "accept", token }),
          });
          const b = await r.json();
          if (r.ok)
            location.assign(
              b.partnerId
                ? `/customer/${encodeURIComponent(b.programId)}/${encodeURIComponent(b.partnerId)}`
                : `/app/programs/${b.programId}/pilots`,
            );
          else setMessage(b.error);
        }}
      >
        Accept this invitation
      </button>
      <p role="status">{message}</p>
    </main>
  );
}
