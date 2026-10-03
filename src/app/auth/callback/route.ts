import { NextRequest, NextResponse } from "next/server";
import { authNext } from "@/lib/auth-next";
import { serverClient } from "@/lib/supabase/server";
export async function GET(req: NextRequest) {
  try {
    const code = req.nextUrl.searchParams.get("code");
    if (!code) throw Error("Missing authorization code");
    const { error } = await (
      await serverClient()
    ).auth.exchangeCodeForSession(code);
    if (error) throw error;
    return NextResponse.redirect(
      new URL(authNext(req.nextUrl.searchParams.get("next")), req.url),
    );
  } catch {
    return NextResponse.redirect(
      new URL("/login?error=invalid-or-expired", req.url),
    );
  }
}
