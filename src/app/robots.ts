import type { MetadataRoute } from "next";

// App privada — nunca deve ser rastreada/indexada. Complementa o
// "robots: { index: false }" em layout.tsx (esse cobre a meta tag em cada
// página; isto cobre o próprio /robots.txt, para bots que o leem antes de
// sequer pedir uma página).
export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", disallow: "/" },
  };
}
