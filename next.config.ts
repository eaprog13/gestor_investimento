import type { NextConfig } from "next";
import path from "node:path";

const nextConfig: NextConfig = {
  // O repo tem outros projetos (e lockfiles) acima desta pasta; fixar a
  // raiz do workspace para o Turbopack não tentar inferi-la.
  turbopack: {
    root: path.resolve(__dirname),
  },
  // Sem isto, o Next manda sempre "X-Powered-By: Next.js" em toda a
  // resposta — não é uma vulnerabilidade em si, mas não há razão nenhuma
  // para anunciar a framework a quem estiver a sondar o site. Confirmado
  // com curl que o cabeçalho desaparece depois disto.
  poweredByHeader: false,
};

export default nextConfig;
