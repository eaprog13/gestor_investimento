import "server-only";
import { criarClienteServidor } from "@/lib/supabase/server";
import { ehMembro } from "@/lib/security/sessionActivity";
import { limparCookiesSessao } from "@/lib/security/sessionCookies";

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
  // Segunda linha de defesa (o proxy já fecha estas sessões): só membros da
  // família criados pela app — ver ehMembro() em src/lib/security/sessionActivity.ts.
  if (!ehMembro(user)) return null;

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
  await limparCookiesSessao();
}
