"use client";

import { useMemo, useState } from "react";
import { createSupabaseBrowserClient, hasSupabaseBrowserConfig } from "@/lib/supabase/client";

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type LoginState = "idle" | "submitting" | "anonymous" | "sent" | "error";

function safeNextPath(value?: string) {
  if (!value || !value.startsWith("/") || value.startsWith("//")) {
    return "/dashboard";
  }

  return value;
}

function getRedirectUrl(nextPath?: string) {
  const configuredUrl = process.env.NEXT_PUBLIC_APP_URL;
  const origin = typeof window === "undefined" ? configuredUrl : window.location.origin;
  const baseUrl = configuredUrl || origin;
  const callbackUrl = new URL("/auth/callback", baseUrl);
  callbackUrl.searchParams.set("next", safeNextPath(nextPath));

  return callbackUrl.toString();
}

export function LoginForm({ nextPath = "/dashboard" }: Readonly<{ nextPath?: string }>) {
  const returnPath = safeNextPath(nextPath);
  const hasConfig = hasSupabaseBrowserConfig();
  const supabase = useMemo(() => (hasConfig ? createSupabaseBrowserClient() : null), [hasConfig]);
  const [email, setEmail] = useState("");
  const [state, setState] = useState<LoginState>("idle");
  const [message, setMessage] = useState("");

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const normalizedEmail = email.trim().toLowerCase();

    if (!emailPattern.test(normalizedEmail)) {
      setState("error");
      setMessage("Enter a valid email address to request a Supabase magic link.");
      return;
    }

    setState("submitting");
    setMessage("");

    if (!supabase) {
      setState("error");
      setMessage("Supabase public environment variables are not configured for this deployment yet.");
      return;
    }

    const { error } = await supabase.auth.signInWithOtp({
      email: normalizedEmail,
      options: {
        emailRedirectTo: getRedirectUrl(returnPath),
      },
    });

    if (error) {
      setState("error");
      setMessage("Supabase could not send a magic link. Check project configuration and try again.");
      return;
    }

    setState("sent");
    setMessage("Magic link requested. Check your email, then return through the Supabase callback.");
  }

  async function handleAnonymousLogin() {
    setState("submitting");
    setMessage("");

    if (!supabase) {
      setState("error");
      setMessage("Supabase public environment variables are not configured for this deployment yet.");
      return;
    }

    const { error } = await supabase.auth.signInAnonymously();

    if (error) {
      setState("error");
      setMessage("Anonymous login is not enabled for this Supabase project yet.");
      return;
    }

    setState("anonymous");
    setMessage("Anonymous operator session created. Redirecting…");
    window.location.assign(returnPath);
  }

  return (
    <form className="auth-form" onSubmit={handleSubmit}>
      <label htmlFor="email">Email address</label>
      <input
        autoComplete="email"
        id="email"
        inputMode="email"
        name="email"
        onChange={(event) => setEmail(event.target.value)}
        placeholder="you@example.com"
        required
        type="email"
        value={email}
      />
      <button className="button-link button-link--primary" disabled={state === "submitting" || !hasConfig} type="submit">
        {state === "submitting" ? "Sending…" : "Send magic link"}
      </button>
      <button className="button-link" disabled={state === "submitting" || !hasConfig} onClick={handleAnonymousLogin} type="button">
        Continue anonymously and return to memory browser
      </button>
      <p className="auth-note">Temporary anonymous sessions are only for internal operator proof work. Memory append still requires the internal operator token.</p>
      {!hasConfig ? <p className="auth-form__message auth-form__message--error">Supabase public environment variables are required before magic links can be sent.</p> : null}
      {message ? <p className={`auth-form__message auth-form__message--${state}`}>{message}</p> : null}
    </form>
  );
}
