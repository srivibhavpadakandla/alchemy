import { expect, it } from "vitest";
import {
  AUTH_RETURN_COOKIE,
  authCallbackReturn,
  authCallbackUrl,
  authClearReturnCookie,
  authRetryUrl,
  authReturnCookie,
} from "../src/lib/auth-next";

it("provider callback stays exact while an invitation return is held separately", () => {
  const destination = "/invite/example-token";
  const cookie = authReturnCookie(destination, false);
  expect(authCallbackUrl("http://localhost:3210")).toBe(
    "http://localhost:3210/auth/callback",
  );
  expect(cookie).toContain("Path=/auth/callback; Max-Age=600; SameSite=Lax");
  expect(cookie).not.toContain("Secure");
  const value = cookie.slice(`${AUTH_RETURN_COOKIE}=`.length).split(";")[0];
  expect(authCallbackReturn(value, null)).toBe(destination);
});

it("callback prefers the scoped cookie, supports old links and rejects unsafe returns", () => {
  expect(
    authCallbackReturn(
      encodeURIComponent("/customer/program/customer"),
      "/app",
    ),
  ).toBe("/customer/program/customer");
  expect(authCallbackReturn(undefined, "/invite/legacy-token")).toBe(
    "/invite/legacy-token",
  );
  for (const value of [
    "https://attacker.invalid",
    "//attacker.invalid",
    "/customer\\attacker",
    "/customer/\n",
  ]) {
    expect(authCallbackReturn(encodeURIComponent(value), null)).toBe("/app");
    expect(authReturnCookie(value, true)).toContain(
      `${AUTH_RETURN_COOKIE}=%2Fapp;`,
    );
  }
  expect(authCallbackReturn("%invalid", "/invite/legacy-token")).toBe("/app");
});

it("HTTPS callback return cookies are secure and contain no provider query data", () => {
  expect(
    authCallbackUrl("https://alchemy.example/app?next=/invite/token"),
  ).toBe("https://alchemy.example/auth/callback");
  expect(authReturnCookie("/app", true)).toContain("SameSite=Lax; Secure");
  expect(authClearReturnCookie(true)).toBe(
    `${AUTH_RETURN_COOKIE}=; Path=/auth/callback; Max-Age=0; SameSite=Lax; Secure`,
  );
});

it("failed exchanges preserve safe invitation intent without leaking the callback code", () => {
  const origin = "http://localhost:3210/auth/callback?code=expired-test-code";
  const next = authCallbackReturn(
    encodeURIComponent("/invite/example-token"),
    null,
  );
  const retry = authRetryUrl(origin, next);
  expect(retry.origin).toBe("http://localhost:3210");
  expect(retry.pathname).toBe("/login");
  expect(retry.searchParams.get("next")).toBe("/invite/example-token");
  expect(retry.searchParams.get("error")).toBe("invalid-or-expired");
  expect(retry.searchParams.has("code")).toBe(false);
  expect(
    authRetryUrl(origin, "https://attacker.invalid").searchParams.get("next"),
  ).toBe("/app");
});
