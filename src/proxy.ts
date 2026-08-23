import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { construirCabecalhosSeguranca } from "@/lib/security/headers";
import { comSegurancaReforcada } from "@/lib/security/cookies";

const PUBLIC_PATHS = ["/login", "/forgot-password", "/auth/callback"];

// 30 minutos sem nenhum pedido — ver secção "Timeout de sessão por
// inatividade" abaixo.
const INACTIVITY_TIMEOUT_MS = 30 * 60 * 1000;

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

  // ── Timeout de sessão por inatividade ─────────────────────────────────
  // O Supabase, por si só, não desloga por inatividade — o refresh token
  // renova-se sozinho enquanto o browser continuar a fazer pedidos, mesmo
  // ao fim de dias. Guardamos a hora do último pedido autenticado num
  // cookie próprio; se passar mais de INACTIVITY_TIMEOUT_MS sem nenhum
  // pedido, força logout e exige novo login, mesmo que o token Supabase em
  // si ainda fosse válido.
  if (user) {
    const ultimaAtividade = Number(pedido.cookies.get("last_activity")?.value ?? 0);
    const inativoDemasiadoTempo = ultimaAtividade > 0 && Date.now() - ultimaAtividade > INACTIVITY_TIMEOUT_MS;

    if (inativoDemasiadoTempo) {
      await supabase.auth.signOut();
      user = null;
      resposta.cookies.delete("last_activity");
    } else {
      resposta.cookies.set({
        name: "last_activity",
        value: String(Date.now()),
        ...comSegurancaReforcada({ path: "/", maxAge: INACTIVITY_TIMEOUT_MS / 1000 }),
      });
    }
  }

  const { pathname: caminho } = pedido.nextUrl;

  if (!user && !ehCaminhoPublico(caminho)) {
    const urlLogin = new URL("/login", pedido.url);
    urlLogin.searchParams.set("from", caminho);
    return NextResponse.redirect(urlLogin);
  }

  if (user && caminho === "/login") {
    return NextResponse.redirect(new URL("/dashboard", pedido.url));
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
