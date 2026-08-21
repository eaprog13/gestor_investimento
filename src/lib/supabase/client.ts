"use client";

import { createBrowserClient } from "@supabase/ssr";

/**
 * Cliente Supabase para uso no browser (Client Components) — usado só pelo
 * formulário de login (auth.signInWithPassword). O resto dos dados da app
 * nunca é lido/escrito diretamente do browser; passa sempre por Server
 * Actions com o cliente admin (ver src/lib/supabase/admin.ts).
 */
export function criarClienteSupabase() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
