import { NextResponse } from "next/server";
import { criarClienteServidor } from "@/lib/supabase/server";
import { ehMembro } from "@/lib/security/sessionActivity";
import { iniciarAtividade, marcarRecuperacao } from "@/lib/security/sessionCookies";

export const runtime = "nodejs";

/**
 * GET /auth/callback — destino do link de "recuperar password" enviado pelo
 * Supabase Auth. O cliente Supabase do browser usa o fluxo PKCE (ver
 * src/lib/supabase/client.ts), por isso o link de recuperação traz um
 * parâmetro "code" que precisa de ser trocado aqui, no servidor, por uma
 * sessão válida (cookies HTTP-only) — só depois disso é que
 * /change-password (que exige sessão) consegue aceitar o pedido de nova
 * password.
 *
 * Nota: por ser PKCE, o "code_verifier" fica guardado num cookie no browser
 * que pediu a recuperação (ver ForgotPasswordForm.tsx); se o link for
 * aberto noutro browser/dispositivo, a troca falha e mandamos a pessoa
 * pedir um novo link.
 */
export async function GET(pedido: Request) {
  const url = new URL(pedido.url);
  const codigo = url.searchParams.get("code");

  const urlErro = new URL("/forgot-password", url.origin);
  urlErro.searchParams.set("erro", "link_invalido");

  // Sem código não há sessão nova: não há nada a fazer aqui.
  if (!codigo) return NextResponse.redirect(urlErro);

  const supabase = await criarClienteServidor();
  const { data, error } = await supabase.auth.exchangeCodeForSession(codigo);
  if (error || !data.user) {
    console.error("[/auth/callback] falha ao trocar o código por sessão:", error?.message);
    return NextResponse.redirect(urlErro);
  }
  // Só membros da família (ver ehMembro em src/lib/security/sessionActivity.ts).
  if (!ehMembro(data.user)) {
    await supabase.auth.signOut();
    return NextResponse.redirect(urlErro);
  }

  // A sessão do link de recuperação conta como um login (timeout de
  // inatividade a partir de agora) e pode definir a nova password sem a
  // atual durante 15 min — ver src/app/change-password/actions.ts.
  await iniciarAtividade(data.user.id);
  await marcarRecuperacao(data.user.id);

  return NextResponse.redirect(new URL("/change-password", url.origin));
}
