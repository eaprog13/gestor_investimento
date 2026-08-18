import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jwtVerify } from "jose";

const COOKIE_NAME = "gi_session";
const PUBLIC_PATHS = ["/login"];

function getSecretKey() {
  const secret = process.env.SESSION_SECRET;
  if (!secret) return null;
  return new TextEncoder().encode(secret);
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (PUBLIC_PATHS.some((path) => pathname.startsWith(path))) {
    return NextResponse.next();
  }

  const token = request.cookies.get(COOKIE_NAME)?.value;
  const secretKey = getSecretKey();

  if (token && secretKey) {
    try {
      await jwtVerify(token, secretKey);
      return NextResponse.next();
    } catch {
      // sessão inválida/expirada, cai para o redirect abaixo
    }
  }

  const loginUrl = new URL("/login", request.url);
  loginUrl.searchParams.set("from", pathname);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: [
    /*
     * Corre em tudo exceto:
     * - _next/static, _next/image (assets do Next.js)
     * - favicon.ico e outros ficheiros estáticos em /public
     */
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
