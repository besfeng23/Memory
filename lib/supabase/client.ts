"use client";

import { createBrowserClient } from "@supabase/ssr";

function getPublicEnv(name: "NEXT_PUBLIC_SUPABASE_URL" | "NEXT_PUBLIC_SUPABASE_ANON_KEY") {
  return process.env[name];
}

function getRequiredPublicEnv(name: "NEXT_PUBLIC_SUPABASE_URL" | "NEXT_PUBLIC_SUPABASE_ANON_KEY") {
  const value = getPublicEnv(name);

  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}

export function hasSupabaseBrowserConfig() {
  return Boolean(getPublicEnv("NEXT_PUBLIC_SUPABASE_URL") && getPublicEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY"));
}

export function createSupabaseBrowserClient() {
  return createBrowserClient(
    getRequiredPublicEnv("NEXT_PUBLIC_SUPABASE_URL"),
    getRequiredPublicEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY"),
  );
}
