import { NextResponse } from "next/server";
import { autenticacaoDoPedido } from "@/composition/autenticacaoPedido";
import { abrirRecuperacao } from "@/core/services/authService";
import { iniciarAtividade, marcarRecuperacao } from "@/lib/security/sessionCookies";

export const runtime = "nodejs";

/**
 * GET /auth/callback — destino do link de "recuperar password". O link traz
 * um parâmetro "code" (fluxo PKCE, pedido em src/app/forgot-password/actions.ts)
 * que se troca aqui, no servidor, por uma sessão em cookies HTTP-only — só
 * depois disso o /change-password (que exige sessão) aceita a nova password.
 *
 * Por ser PKCE, o "code_verifier" fica num cookie do browser que pediu a
 * recuperação; se o link for aberto noutro browser/dispositivo, a troca
 * falha e mandamos a pessoa pedir um novo link.
 */
export async function GET(pedido: Request) {
  const url = new URL(pedido.url);
  const codigo = url.searchParams.get("code");

  const urlErro = new URL("/forgot-password", url.origin);
  urlErro.searchParams.set("erro", "link_invalido");

  // Sem código não há sessão nova: não há nada a fazer aqui.
  if (!codigo) return NextResponse.redirect(urlErro);

  // só membros da família (ver abrirRecuperacao em core/services/authService.ts)
  const utilizador = await abrirRecuperacao(await autenticacaoDoPedido(), codigo);
  if (!utilizador) return NextResponse.redirect(urlErro);

  // A sessão do link de recuperação conta como um login (timeout de
  // inatividade a partir de agora) e pode definir a nova password sem a
  // atual durante 15 min — ver src/app/change-password/actions.ts.
  await iniciarAtividade(utilizador.id);
  await marcarRecuperacao(utilizador.id);

  return NextResponse.redirect(new URL("/change-password", url.origin));
}
