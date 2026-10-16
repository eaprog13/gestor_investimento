/**
 * Cabeçalhos de segurança equivalentes ao "helmet" do Express, aplicados via
 * src/proxy.ts a todas as respostas (Next.js/Vercel corre em ambiente
 * serverless/edge, onde o middleware do Express não se aplica — isto é o
 * mecanismo nativo recomendado para o mesmo efeito).
 *
 * "connect-src 'self'": o browser não fala com nenhum serviço externo — a
 * autenticação corre toda no servidor (ver src/composition/autenticacao.ts).
 */
export function construirCabecalhosSeguranca(nonce: string, isDev: boolean) {
  const csp = [
    "default-src 'self'",
    // 'nonce' permite os scripts inline gerados pelo próprio Next.js sem
    // abrir mão do CSP; 'unsafe-eval' só em dev — o React usa eval() para
    // stack traces mais úteis, nunca em produção (ver docs do Next.js sobre CSP).
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${isDev ? " 'unsafe-eval'" : ""}`,
    "style-src 'self' 'unsafe-inline'", // Tailwind injeta estilos inline
    "img-src 'self' data: blob:",
    "font-src 'self' data:",
    // o browser só fala com o próprio site: a autenticação (incluindo o
    // "esqueci a password") corre toda no servidor
    "connect-src 'self'",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "object-src 'none'",
    "upgrade-insecure-requests",
  ].join("; ");

  return {
    "Content-Security-Policy": csp,
    "X-Frame-Options": "DENY",
    "X-Content-Type-Options": "nosniff",
    "Referrer-Policy": "strict-origin-when-cross-origin",
    "Permissions-Policy": "camera=(), microphone=(), geolocation=(), payment=()",
    "Strict-Transport-Security": "max-age=63072000; includeSubDomains; preload",
    "X-DNS-Prefetch-Control": "off",
    "Cross-Origin-Opener-Policy": "same-origin",
    "Cross-Origin-Resource-Policy": "same-origin",
  };
}
