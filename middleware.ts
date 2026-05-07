import { NextRequest, NextResponse } from "next/server";
import { verifySessionJWT } from "@/lib/jwt";
import {
  checkRateLimit,
  getClientIdentifier,
  RATE_LIMITS,
  type RateLimitConfig,
} from "@/lib/rate-limit";
import { MILLISECONDS_PER_SECOND } from "@/lib/constants";

const publicApiPaths = ["/api/auth/login", "/api/auth/logout"];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const rateLimitConfig = getRateLimitConfig(pathname, request.method);
  if (rateLimitConfig) {
    const identifier = `${pathname}:${getClientIdentifier(request)}`;
    const rateLimit = checkRateLimit(identifier, rateLimitConfig);

    if (!rateLimit.success) {
      return NextResponse.json(
        { error: "Troppi tentativi. Riprova più tardi." },
        {
          status: 429,
          headers: rateLimitHeaders(rateLimit),
        },
      );
    }
  }

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

function getRateLimitConfig(
  pathname: string,
  method: string,
): RateLimitConfig | null {
  if (pathname.startsWith("/api/auth/")) {
    return RATE_LIMITS.AUTH;
  }

  if (pathname.startsWith("/api/ranking/upload")) {
    return RATE_LIMITS.UPLOAD;
  }

  if (method === "GET") {
    return RATE_LIMITS.READ;
  }

  return RATE_LIMITS.WRITE;
}

function rateLimitHeaders(rateLimit: {
  limit: number;
  remaining: number;
  reset: number;
}): HeadersInit {
  return {
    "X-RateLimit-Limit": String(rateLimit.limit),
    "X-RateLimit-Remaining": String(rateLimit.remaining),
    "X-RateLimit-Reset": String(
      Math.ceil(rateLimit.reset / MILLISECONDS_PER_SECOND),
    ),
    "Retry-After": String(
      Math.max(
        1,
        Math.ceil((rateLimit.reset - Date.now()) / MILLISECONDS_PER_SECOND),
      ),
    ),
  };
}

export const config = {
  matcher: ["/api/:path*"],
};
