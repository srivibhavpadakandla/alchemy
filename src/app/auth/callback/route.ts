import { NextRequest, NextResponse } from "next/server";
import {
  AUTH_CALLBACK_PATH,
  AUTH_RETURN_COOKIE,
  authCallbackReturn,
  authRetryUrl,
} from "@/lib/auth-next";
import { serverClient } from "@/lib/supabase/server";
export async function GET(req: NextRequest) {
  const returnPath = authCallbackReturn(
    req.cookies.get(AUTH_RETURN_COOKIE)?.value,
    req.nextUrl.searchParams.get("next"),
  );
  let response: NextResponse;
  try {
    const code = req.nextUrl.searchParams.get("code");
    if (!code) throw Error("Missing authorization code");
    const { error } = await (
      await serverClient()
    ).auth.exchangeCodeForSession(code);
    if (error) throw error;
    response = NextResponse.redirect(new URL(returnPath, req.url));
  } catch {
    response = NextResponse.redirect(authRetryUrl(req.url, returnPath));
  }
  response.cookies.set(AUTH_RETURN_COOKIE, "", {
    path: AUTH_CALLBACK_PATH,
    maxAge: 0,
    sameSite: "lax",
    secure: req.nextUrl.protocol === "https:",
  });
  return response;
}
