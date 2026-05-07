import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { env } from "@/lib/env";
import { logger } from "@/lib/logger";
import { createSession, cleanupExpiredSessions } from "@/lib/session";
import { createSessionJWT } from "@/lib/jwt";
import { loginSchema } from "@/lib/validations";
import {
  isTemporarilyLocked,
  registerFailedAttempt,
  clearAttempts,
  cleanupOldAttempts,
} from "@/lib/login-attempts";
import { SESSION_DURATION_SECONDS } from "@/lib/constants";

async function verifyTurnstileToken(
  token: string,
  ip?: string | null,
): Promise<boolean> {
  const secret = env.TURNSTILE_SECRET_KEY;

  const body = new URLSearchParams();
  body.set("secret", secret);
  body.set("response", token);
  if (ip) {
    body.set("remoteip", ip);
  }

  try {
    const response = await fetch(
      "https://challenges.cloudflare.com/turnstile/v0/siteverify",
      {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body,
      },
    );

    if (!response.ok) {
      return false;
    }

    const result = await response.json();
    return result?.success === true;
  } catch {
    return false;
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = loginSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: "Dati non validi" }, { status: 400 });
    }

    const { username, password, captchaToken } = parsed.data;

    await cleanupOldAttempts();
    await cleanupExpiredSessions();

    if (await isTemporarilyLocked(username)) {
      return NextResponse.json(
        { error: "Account temporaneamente bloccato. Riprova più tardi." },
        { status: 429 },
      );
    }

    const forwardedFor = request.headers.get("x-forwarded-for");
    const ip = forwardedFor ? forwardedFor.split(",")[0]?.trim() : null;

    const isHuman = await verifyTurnstileToken(captchaToken, ip);
    if (!isHuman) {
      await registerFailedAttempt(username);
      return NextResponse.json(
        { error: "Verifica anti-bot fallita" },
        { status: 400 },
      );
    }

    const userRows = await db
      .select({
        id: users.id,
        username: users.username,
        passwordHash: users.passwordHash,
        displayName: users.displayName,
      })
      .from(users)
      .where(eq(users.username, username))
      .limit(1);

    if (userRows.length === 0) {
      await registerFailedAttempt(username);
      return NextResponse.json(
        { error: "Username o password non corretti" },
        { status: 401 },
      );
    }

    const user = userRows[0];
    const isValid = await bcrypt.compare(password, user.passwordHash);

    if (!isValid) {
      await registerFailedAttempt(username);
      return NextResponse.json(
        { error: "Username o password non corretti" },
        { status: 401 },
      );
    }

    await clearAttempts(username);

    // Crea JWT per il middleware (Edge Runtime compatible)
    const jwt = await createSessionJWT(
      user.id,
      user.username,
      user.displayName,
    );

    logger.info("JWT created successfully", {
      userId: user.id,
      username: user.username,
      tokenLength: jwt.length,
    });

    // Salva anche nel database per tracking (opzionale)
    try {
      await createSession(user.id);
    } catch (dbError) {
      logger.error("Failed to save session to database", { dbError });
      // Non bloccare il login se il database fallisce
    }

    const response = NextResponse.json({
      success: true,
      user: {
        username: user.username,
        displayName: user.displayName,
      },
    });

    // Imposta il cookie con il JWT usando sia cookies.set che header
    const isProduction = process.env.NODE_ENV === "production";
    const cookieValue = `session_token=${jwt}; Path=/; HttpOnly; ${isProduction ? "Secure; " : ""}SameSite=Lax; Max-Age=${SESSION_DURATION_SECONDS}`;

    response.headers.set("Set-Cookie", cookieValue);

    logger.info("Login successful, cookie set", {
      username: user.username,
      cookieMaxAge: SESSION_DURATION_SECONDS,
      isProduction,
      cookieLength: jwt.length,
    });

    return response;
  } catch (error) {
    logger.error("Login error", { error });
    return NextResponse.json(
      { error: "Errore durante il login" },
      { status: 500 },
    );
  }
}
