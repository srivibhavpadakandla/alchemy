import { NextRequest, NextResponse } from "next/server";
import { serverClient } from "@/lib/supabase/server";
export async function GET(req: NextRequest) {
  try {
    const code = req.nextUrl.searchParams.get("code");
    if (!code) throw Error("Missing authorization code");
    const { error } = await (
      await serverClient()
    ).auth.exchangeCodeForSession(code);
    if (error) throw error;
    return NextResponse.redirect(new URL("/app", req.url));
  } catch {
    return NextResponse.redirect(
      new URL("/login?error=invalid-or-expired", req.url),
    );
  }
}
