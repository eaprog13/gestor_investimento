import type { CookieOptions } from "@supabase/ssr";

/**
 * O @supabase/ssr define, por omissão, "httpOnly: false" nos cookies de
 * sessão (para o caso de o cliente de browser precisar de os ler via
 * document.cookie) — esta app nunca faz isso, a sessão só é lida no
 * servidor (ver src/lib/supabase/server.ts e src/proxy.ts). Reforçamos
 * aqui: "httpOnly" bloqueia leitura por JavaScript no browser (mitiga
 * roubo de sessão via XSS) sem quebrar nada, e "secure" impede o cookie
 * de ser enviado fora de HTTPS.
 */
export function comSegurancaReforcada(opcoes: CookieOptions): CookieOptions {
  return {
    ...opcoes,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
  };
}
