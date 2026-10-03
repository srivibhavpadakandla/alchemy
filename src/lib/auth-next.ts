export function authNext(value: string | null) {
  return value &&
    /^\/(?:customer|invite|app)(?:\/|$)/.test(value) &&
    !value.includes("\\") &&
    !/[\x00-\x1f]/.test(value)
    ? value
    : "/app";
}

export const AUTH_CALLBACK_PATH = "/auth/callback";
export const AUTH_RETURN_COOKIE = "alchemy_auth_return";

export function authCallbackUrl(origin: string) {
  return new URL(AUTH_CALLBACK_PATH, origin).toString();
}

export function authRetryUrl(origin: string, returnPath: string | null) {
  const url = new URL("/login", origin);
  url.searchParams.set("error", "invalid-or-expired");
  url.searchParams.set("next", authNext(returnPath));
  return url;
}

export function authReturnCookie(value: string | null, secure: boolean) {
  return `${AUTH_RETURN_COOKIE}=${encodeURIComponent(authNext(value))}; Path=${AUTH_CALLBACK_PATH}; Max-Age=600; SameSite=Lax${secure ? "; Secure" : ""}`;
}

export function authClearReturnCookie(secure: boolean) {
  return `${AUTH_RETURN_COOKIE}=; Path=${AUTH_CALLBACK_PATH}; Max-Age=0; SameSite=Lax${secure ? "; Secure" : ""}`;
}

export function authCallbackReturn(
  cookie: string | undefined,
  legacyQuery: string | null,
) {
  if (cookie !== undefined) {
    try {
      return authNext(decodeURIComponent(cookie));
    } catch {
      return "/app";
    }
  }
  return authNext(legacyQuery);
}
