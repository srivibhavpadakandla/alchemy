import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { StateSchema, roles } from "@/lib/domain";
import { localRuns, startLocal, cancelLocal } from "@/lib/local-agent";
export const runtime = "nodejs";
const cookie = "launchguild-local-session";
function allowed(req: NextRequest, write = false) {
  const url = new URL(req.url);
  if (
    process.env.LOCAL_CODEX_ENABLED !== "1" ||
    !["localhost", "127.0.0.1"].includes(url.hostname)
  )
    return false;
  if (req.headers.get("sec-fetch-site") === "cross-site") return false;
  const origin = req.headers.get("origin");
  return (!write && !origin) || origin === url.origin;
}
const owner = (req: NextRequest) => {
  const value = req.cookies.get(cookie)?.value;
  return value && /^[a-f0-9-]{36}$/.test(value) ? value : "";
};
export async function GET(req: NextRequest) {
  if (!allowed(req)) return NextResponse.json({ enabled: false, runs: [] });
  const session = owner(req) || crypto.randomUUID();
  const res = NextResponse.json(
    { enabled: true, runs: await localRuns(session) },
    { headers: { "Cache-Control": "no-store" } },
  );
  res.cookies.set(cookie, session, {
    httpOnly: true,
    sameSite: "strict",
    path: "/api/local-agent",
    maxAge: 604800,
  });
  return res;
}
export async function POST(req: NextRequest) {
  if (!allowed(req, true) || !owner(req))
    return NextResponse.json(
      { error: "Local session required." },
      { status: 403 },
    );
  try {
    const raw = await req.text();
    if (raw.length > 1_000_000) throw Error("Task input too large.");
    const b = z
      .object({
        role: z.enum(roles),
        key: z.string().uuid(),
        state: StateSchema,
      })
      .parse(JSON.parse(raw));
    if (b.state.mode !== "demo" || b.state.id !== "demo")
      throw Error("Local tasks are restricted to the demo program.");
    return NextResponse.json(
      { run: await startLocal(owner(req), b.key, b.state, b.role) },
      { status: 202 },
    );
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Task failed." },
      { status: 400 },
    );
  }
}
export async function DELETE(req: NextRequest) {
  if (!allowed(req, true) || !owner(req))
    return NextResponse.json(
      { error: "Local session required." },
      { status: 403 },
    );
  try {
    const b = z.object({ id: z.string().uuid() }).parse(await req.json());
    return NextResponse.json({ run: await cancelLocal(owner(req), b.id) });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Cancel failed." },
      { status: 400 },
    );
  }
}
