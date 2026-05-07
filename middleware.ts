import { NextRequest, NextResponse } from "next/server";
import { verifySessionJWT } from "@/lib/jwt";

const publicApiPaths = ["/api/auth/login", "/api/auth/logout"];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // TODO: Fix rate limiting - currently buggy with getClientIdentifier returning "unknown" for all users
  // Temporarily disabled to allow login access

  // Gestione autenticazione per le API routes
  if (pathname.startsWith("/api/")) {
    // Continua con l'autenticazione per le route protette
    if (!publicApiPaths.some((path) => pathname.startsWith(path))) {
      // Permetti GET senza autenticazione (lettura pubblica)
      if (request.method === "GET") {
        return NextResponse.next();
      }

      // POST, PUT, DELETE, PATCH richiedono autenticazione
      const sessionToken = request.cookies.get("session_token")?.value;

      if (!sessionToken) {
        return NextResponse.json(
          { error: "Autenticazione richiesta" },
          { status: 401 },
        );
      }

      const session = await verifySessionJWT(sessionToken);

      if (!session) {
        return NextResponse.json(
          { error: "Sessione non valida o scaduta" },
          { status: 401 },
        );
      }
    }

    return NextResponse.next();
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/api/:path*"],
};
