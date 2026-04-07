import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { db } from "@/lib/db";
import { users, loginAttempts } from "@/lib/db/schema";
import { eq, and, lt } from "drizzle-orm";
import { env } from "@/lib/env";
import {
  MAX_FAILED_LOGIN_ATTEMPTS,
  LOGIN_LOCK_WINDOW_MS,
  LOGIN_ATTEMPTS_CLEANUP_MS,
} from "@/lib/constants";
import { logger } from "@/lib/logger";
import { createSession, cleanupExpiredSessions } from "@/lib/session";
import { createSessionJWT } from "@/lib/jwt";

const loginSchema = z.object({
  username: z.string().trim().min(1),
  password: z.string().min(1),
  captchaToken: z.string().min(1),
});

async function isTemporarilyLocked(username: string): Promise<boolean> {
  try {
    const records = await db
      .select()
      .from(loginAttempts)
      .where(eq(loginAttempts.username, username))
      .limit(1);

    if (records.length === 0) {
      return false;
    }

    const record = records[0];

    if (record.lockedUntil && record.lockedUntil > new Date()) {
      return true;
    }

    if (record.lockedUntil && record.lockedUntil <= new Date()) {
      await db
        .delete(loginAttempts)
        .where(eq(loginAttempts.username, username));
      return false;
    }

    return false;
  } catch {
    return false;
  }
}

async function registerFailedAttempt(username: string): Promise<void> {
  try {
    const now = new Date();
    const records = await db
      .select()
      .from(loginAttempts)
      .where(eq(loginAttempts.username, username))
      .limit(1);

    if (records.length === 0) {
      await db.insert(loginAttempts).values({
        username,
        failedCount: 1,
        lastAttempt: now,
      });
      return;
    }

    const record = records[0];
    const nextCount = record.failedCount + 1;

    if (nextCount >= MAX_FAILED_LOGIN_ATTEMPTS) {
      await db
        .update(loginAttempts)
        .set({
          failedCount: 0,
          lockedUntil: new Date(now.getTime() + LOGIN_LOCK_WINDOW_MS),
          lastAttempt: now,
        })
        .where(eq(loginAttempts.username, username));
      return;
    }

    await db
      .update(loginAttempts)
      .set({
        failedCount: nextCount,
        lastAttempt: now,
      })
      .where(eq(loginAttempts.username, username));
  } catch (error) {
    logger.error("Failed to register login attempt", { username, error });
  }
}

async function clearAttempts(username: string): Promise<void> {
  try {
    await db.delete(loginAttempts).where(eq(loginAttempts.username, username));
  } catch (error) {
    logger.error("Failed to clear login attempts", { username, error });
  }
}

async function cleanupOldAttempts(): Promise<void> {
  try {
    const cutoff = new Date(Date.now() - LOGIN_ATTEMPTS_CLEANUP_MS);
    await db
      .delete(loginAttempts)
      .where(
        and(
          lt(loginAttempts.lastAttempt, cutoff),
          eq(loginAttempts.failedCount, 0),
        ),
      );
  } catch (error) {
    logger.error("Failed to cleanup old login attempts", { error });
  }
}

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
    const cookieValue = `session_token=${jwt}; Path=/; HttpOnly; ${isProduction ? "Secure; " : ""}SameSite=Lax; Max-Age=${20 * 60}`;

    response.headers.set("Set-Cookie", cookieValue);

    logger.info("Login successful, cookie set", {
      username: user.username,
      cookieMaxAge: 20 * 60,
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
