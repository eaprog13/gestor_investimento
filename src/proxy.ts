import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { construirCabecalhosSeguranca } from "@/lib/security/headers";
import { comSegurancaReforcada } from "@/lib/security/cookies";
import {
  COOKIE_ATIVIDADE,
  COOKIE_RECUPERACAO,
  MAX_AGE_ATIVIDADE_S,
  criarValorAtividade,
  ehMembro,
  verificarAtividade,
} from "@/lib/security/sessionActivity";

const PUBLIC_PATHS = ["/login", "/forgot-password", "/auth/callback"];

// Um NextResponse.redirect novo não leva os cookies escritos em "resposta"
// (a sessão renovada, ou os cookies apagados pelo signOut) — sem isto, uma
// sessão terminada aqui continuava com os cookies antigos no browser.
function redirecionarComCookies(destino: URL, resposta: NextResponse) {
  const redirecionamento = NextResponse.redirect(destino);
  for (const cookie of resposta.cookies.getAll()) {
    redirecionamento.cookies.set(cookie);
  }
  return redirecionamento;
}

function ehCaminhoPublico(caminho: string) {
  return PUBLIC_PATHS.some((p) => caminho === p || caminho.startsWith(`${p}/`));
}

/**
 * 1) Aplica cabeçalhos de segurança (CSP com nonce, HSTS, etc. — ver
 *    src/lib/security/headers.ts) a todas as respostas.
 * 2) Renova a sessão Supabase a cada pedido (necessário para manter os
 *    cookies atualizados em Server Components — ver
 *    https://supabase.com/docs/guides/auth/server-side/nextjs) e protege
 *    as rotas privadas.
 *
 * Substitui o antigo "middleware.ts": no Next.js 16 essa convenção foi
 * renomeada para "proxy.ts" (ver
 * node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/proxy.md).
 */
export async function proxy(pedido: NextRequest) {
  const nonce = Buffer.from(crypto.randomUUID()).toString("base64");
  const cabecalhosSeguranca = construirCabecalhosSeguranca(nonce, process.env.NODE_ENV === "development");

  const pedidoComNonce = new Headers(pedido.headers);
  pedidoComNonce.set("x-nonce", nonce);
  pedidoComNonce.set("Content-Security-Policy", cabecalhosSeguranca["Content-Security-Policy"]);

  const resposta = NextResponse.next({ request: { headers: pedidoComNonce } });
  for (const [chave, valor] of Object.entries(cabecalhosSeguranca)) {
    resposta.headers.set(chave, valor);
  }

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(nome: string) {
          return pedido.cookies.get(nome)?.value;
        },
        set(nome: string, valor: string, opcoes: CookieOptions) {
          resposta.cookies.set({ name: nome, value: valor, ...comSegurancaReforcada(opcoes) });
        },
        remove(nome: string, opcoes: CookieOptions) {
          resposta.cookies.set({ name: nome, value: "", ...comSegurancaReforcada(opcoes) });
        },
      },
    }
  );

  const {
    data: { user: userSupabase },
  } = await supabase.auth.getUser();
  let user = userSupabase;

  // ── Timeout de sessão e membros da família ─────────────────────────────
  // O Supabase, por si só, não desloga por inatividade — o refresh token
  // renova-se sozinho enquanto o browser continuar a fazer pedidos. A sessão
  // termina aqui se: a conta não for de um membro (signup público), o cookie
  // de atividade faltar, for adulterado ou de outro utilizador, a sessão
  // estiver parada há mais de 30 min ou tiver mais de 12 h — ver
  // src/lib/security/sessionActivity.ts.
  if (user) {
    const agora = Date.now();
    const atividade = verificarAtividade(pedido.cookies.get(COOKIE_ATIVIDADE)?.value, user.id, agora);

    if (!ehMembro(user) || !atividade.valida) {
      await supabase.auth.signOut();
      user = null;
      resposta.cookies.delete(COOKIE_ATIVIDADE);
      resposta.cookies.delete(COOKIE_RECUPERACAO);
    } else {
      resposta.cookies.set({
        name: COOKIE_ATIVIDADE,
        value: criarValorAtividade(user.id, atividade.inicio, agora),
        ...comSegurancaReforcada({ path: "/", sameSite: "lax", maxAge: MAX_AGE_ATIVIDADE_S }),
      });
    }
  }

  const { pathname: caminho } = pedido.nextUrl;

  if (!user && !ehCaminhoPublico(caminho)) {
    const urlLogin = new URL("/login", pedido.url);
    urlLogin.searchParams.set("from", caminho);
    return redirecionarComCookies(urlLogin, resposta);
  }

  if (user && caminho === "/login") {
    return redirecionarComCookies(new URL("/dashboard", pedido.url), resposta);
  }

  return resposta;
}

export const config = {
  matcher: [
    {
      // Exclui também ficheiros estáticos por extensão (public/, fontes,
      // etc.) e as rotas de metadata GERADAS POR CÓDIGO do App Router
      // (icon.tsx, apple-icon.tsx, opengraph-image.tsx, twitter-image.tsx) —
      // estas servem em /icon, /apple-icon, etc., SEM extensão no URL, por
      // isso não bastava excluir por ".png$" (confirmado: sem isto, /icon
      // era redirecionado para /login em produção, exatamente como o bug do
      // /logo.png encontrado no helpdesk_smartcreative, que partilha este
      // mesmo padrão de proxy — só se manifesta em produção, nunca em
      // `next dev`/Turbopack).
      source:
        "/((?!_next/static|_next/image|favicon\\.ico|icon|apple-icon|opengraph-image|twitter-image|.*\\.(?:png|jpg|jpeg|gif|svg|webp|ico|css|js|map|txt|xml|woff2?|ttf)$).*)",
      missing: [
        { type: "header", key: "next-router-prefetch" },
        { type: "header", key: "purpose", value: "prefetch" },
      ],
    },
  ],
};
