"use client";
import Link from "next/link";
import { useState, useEffect } from "react";

import { browserClient } from "@/lib/supabase/browser";
export default function Login() {
  const [email, setEmail] = useState(""),
    [code, setCode] = useState(""),
    [sent, setSent] = useState(false),
    [message, setMessage] = useState(""),
    [busy, setBusy] = useState(false);
  useEffect(() => {
    if (new URLSearchParams(location.search).has("error"))
      setMessage(
        "This sign-in link is invalid or expired. Request a fresh email code.",
      );
  }, []);
  const perform = async (fn: () => Promise<void>) => {
    setBusy(true);
    setMessage("");
    try {
      await fn();
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Sign-in failed. Retry.");
    } finally {
      setBusy(false);
    }
  };
  return (
    <main className="login-page">
      <img className="login-office" src="/art/office-noir.png" alt="" />
      <Link className="brand" href="/">
        LaunchGuild
      </Link>
      <section className="login-card">
        <span className="eyebrow">YOUR NEXT CHAPTER</span>
        <h1>
          Welcome to
          <br />
          LaunchGuild.
        </h1>
        <p>One shared direction for your first design partners.</p>
        <button
          className="button"
          disabled={busy}
          onClick={() =>
            void perform(async () => {
              const { error } = await browserClient().auth.signInWithOAuth({
                provider: "google",
                options: { redirectTo: `${location.origin}/auth/callback` },
              });
              if (error) throw error;
            })
          }
        >
          <span className="google-icon">G</span> Continue with Google
        </button>
        <div className="login-divider">or use an email code</div>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void perform(async () => {
              if (sent) {
                const { error } = await browserClient().auth.verifyOtp({
                  email,
                  token: code,
                  type: "email",
                });
                if (error) throw error;
                location.assign("/app");
              } else {
                const { error } = await browserClient().auth.signInWithOtp({
                  email,
                  options: {
                    emailRedirectTo: `${location.origin}/auth/callback`,
                  },
                });
                if (error) throw error;
                setSent(true);
                setMessage(
                  "Check your email for the verified sign-in code. It expires according to your authentication policy.",
                );
              }
            });
          }}
        >
          <label>
            Email address
            <input
              type="email"
              autoComplete="email"
              placeholder="you@yourcompany.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={sent}
            />
          </label>
          {sent && (
            <label>
              Verification code
              <input
                value={code}
                onChange={(e) => setCode(e.target.value)}
                autoComplete="one-time-code"
                inputMode="numeric"
                required
              />
            </label>
          )}
          <button className="button primary" disabled={busy}>
            {busy
              ? "Connecting…"
              : sent
                ? "Verify code and enter"
                : "Email me a sign-in code"}{" "}
            <span>→</span>
          </button>
        </form>
        {sent && (
          <button
            className="text-button"
            onClick={() => {
              setSent(false);
              setCode("");
            }}
          >
            Use another email / request a new code
          </button>
        )}
        {message && (
          <p role="status" className="notice amber">
            {message}
          </p>
        )}
        <div className="login-divider">just exploring?</div>
        <Link href="/demo" className="button parchment">
          Explore the demo workspace ↗
        </Link>
        <small>
          No login needed for demo. Fictional records stay in this browser. Demo
          access does not create an authenticated account.
        </small>
      </section>
    </main>
  );
}
