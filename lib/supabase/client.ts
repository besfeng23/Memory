"use client";

import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "@/lib/supabase/database.types";

const browserSupabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const browserSupabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

export function hasSupabaseBrowserConfig() {
  return Boolean(browserSupabaseUrl && browserSupabaseKey);
}

export function createSupabaseBrowserClient() {
  if (!browserSupabaseUrl || !browserSupabaseKey) {
    throw new Error("Missing public Supabase browser configuration.");
  }

  return createBrowserClient<Database>(browserSupabaseUrl, browserSupabaseKey);
}
