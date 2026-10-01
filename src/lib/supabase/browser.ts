"use client";

import { createBrowserClient } from "@supabase/ssr";
import { requirePublicEnvironment } from "@/lib/env";

export function createSupabaseBrowserClient() {
  const environment = requirePublicEnvironment();

  return createBrowserClient(
    environment.NEXT_PUBLIC_SUPABASE_URL,
    environment.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  );
}
