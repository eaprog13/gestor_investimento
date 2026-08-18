import type { NextConfig } from "next";
import path from "node:path";

const nextConfig: NextConfig = {
  output: "standalone",
  // O repo tem outros projetos (e lockfiles) acima desta pasta; fixar a
  // raiz do workspace para o Turbopack não tentar inferi-la.
  turbopack: {
    root: path.resolve(__dirname),
  },
};

export default nextConfig;
