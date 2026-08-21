import "server-only";
import { criarClienteServidor } from "@/lib/supabase/server";

/**
 * Camada web: resolve quem está autenticado a partir da sessão Supabase Auth
 * do pedido atual (cookies HTTP-only, geridos pelo cliente de servidor —
 * ver src/lib/supabase/server.ts e src/proxy.ts, que a renova a cada pedido).
 */

export type SessionPayload = {
  sub: string;
  email: string;
  name: string;
};

export async function getSession(): Promise<SessionPayload | null> {
  const supabase = await criarClienteServidor();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user || !user.email) return null;

  const name = typeof user.user_metadata?.name === "string" ? user.user_metadata.name : user.email;
  return { sub: user.id, email: user.email, name };
}

/** Usado nas Server Actions: lança se não houver sessão válida. */
export async function requireSession(): Promise<SessionPayload> {
  const session = await getSession();
  if (!session) throw new Error("Não autenticado.");
  return session;
}

export async function destroySession() {
  const supabase = await criarClienteServidor();
  await supabase.auth.signOut();
}
