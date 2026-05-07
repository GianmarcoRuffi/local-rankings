import { NextRequest, NextResponse } from "next/server";
import { verifySessionJWT } from "@/lib/jwt";
import {
  checkRateLimit,
  getClientIdentifier,
  RATE_LIMITS,
} from "@/lib/rate-limit";

const publicApiPaths = ["/api/auth/login", "/api/auth/logout"];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Rate limiting per le API routes
  if (pathname.startsWith("/api/")) {
    const identifier = getClientIdentifier(request);
    let rateLimitConfig = RATE_LIMITS.READ;

    // Determina il tipo di rate limit in base al percorso e metodo
    if (pathname.includes("/auth/login")) {
      rateLimitConfig = RATE_LIMITS.AUTH;
    } else if (pathname.includes("/upload")) {
      rateLimitConfig = RATE_LIMITS.UPLOAD;
    } else if (request.method !== "GET") {
      rateLimitConfig = RATE_LIMITS.WRITE;
    }

    const rateLimitResult = checkRateLimit(identifier, rateLimitConfig);

    if (!rateLimitResult.success) {
      const resetDate = new Date(rateLimitResult.reset).toISOString();
      return NextResponse.json(
        {
          error: "Troppi tentativi. Riprova più tardi.",
          retryAfter: Math.ceil((rateLimitResult.reset - Date.now()) / 1000),
        },
        {
          status: 429,
          headers: {
            "X-RateLimit-Limit": rateLimitConfig.limit.toString(),
            "X-RateLimit-Remaining": "0",
            "X-RateLimit-Reset": resetDate,
            "Retry-After": Math.ceil(
              (rateLimitResult.reset - Date.now()) / 1000,
            ).toString(),
          },
        },
      );
    }

    // Aggiungi header rate limit alla risposta
    const response = NextResponse.next();
    response.headers.set(
      "X-RateLimit-Limit",
      rateLimitConfig.limit.toString(),
    );
    response.headers.set(
      "X-RateLimit-Remaining",
      rateLimitResult.remaining.toString(),
    );
    response.headers.set(
      "X-RateLimit-Reset",
      new Date(rateLimitResult.reset).toISOString(),
    );

    // Continua con l'autenticazione per le route protette
    if (!publicApiPaths.some((path) => pathname.startsWith(path))) {
      // Permetti GET senza autenticazione (lettura pubblica)
      if (request.method === "GET") {
        return response;
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

    return response;
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/api/:path*"],
};
