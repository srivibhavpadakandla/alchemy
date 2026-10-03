import Link from "next/link";
import { createHash } from "node:crypto";
import { adminClient } from "@/lib/supabase/admin";
export const dynamic = "force-dynamic";
export default async function Share({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  let payload: unknown;
  try {
    const { token } = await params;
    const { data } = await adminClient()
      .from("share_links")
      .select("payload,expires_at,revoked_at")
      .eq("token_hash", createHash("sha256").update(token).digest("hex"))
      .single();
    if (data && !data.revoked_at && new Date(data.expires_at) > new Date())
      payload = data.payload;
  } catch {}
  return (
    <main className="loading-screen">
      <Link className="brand" href="/">
        ALCHEMY
      </Link>
      {payload ? (
        <>
          <h1>A shared direction.</h1>
          <p>
            Read-only redacted planning summary. This snapshot executes nothing.
          </p>
          <pre>{JSON.stringify(payload, null, 2)}</pre>
        </>
      ) : (
        <>
          <h1>This shared record is unavailable.</h1>
          <p>
            The link is invalid, expired, or revoked. Ask the program owner for
            a current redacted export.
          </p>
        </>
      )}
      <Link className="button" href="/login">
        Return to sign in
      </Link>
    </main>
  );
}
