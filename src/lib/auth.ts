import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { db } from "@/lib/db";
import { users, loginAttempts } from "@/lib/db/schema";
import { eq, and, gt, lt } from "drizzle-orm";

const MAX_FAILED_ATTEMPTS = 15;
const LOCK_WINDOW_MS = 15 * 60 * 1000;
const CLEANUP_WINDOW_MS = 24 * 60 * 60 * 1000;

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

    if (nextCount >= MAX_FAILED_ATTEMPTS) {
      await db
        .update(loginAttempts)
        .set({
          failedCount: 0,
          lockedUntil: new Date(now.getTime() + LOCK_WINDOW_MS),
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
    console.error("Error registering failed attempt:", error);
  }
}

async function clearAttempts(username: string): Promise<void> {
  try {
    await db.delete(loginAttempts).where(eq(loginAttempts.username, username));
  } catch (error) {
    console.error("Error clearing attempts:", error);
  }
}

async function cleanupOldAttempts(): Promise<void> {
  try {
    const cutoff = new Date(Date.now() - CLEANUP_WINDOW_MS);
    await db
      .delete(loginAttempts)
      .where(
        and(
          lt(loginAttempts.lastAttempt, cutoff),
          eq(loginAttempts.failedCount, 0),
        ),
      );
  } catch (error) {
    console.error("Error cleaning up old attempts:", error);
  }
}

const credentialSchema = z.object({
  username: z.string().trim().min(1),
  password: z.string().min(1),
  captchaToken: z.string().min(1),
});

async function verifyTurnstileToken(
  token: string,
  ip?: string | null,
): Promise<boolean> {
  const secret = process.env.TURNSTILE_SECRET_KEY;
  if (!secret) {
    return false;
  }

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

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        username: { label: "Username", type: "text" },
        password: { label: "Password", type: "password" },
        captchaToken: { label: "Captcha Token", type: "text" },
      },
      async authorize(credentials, req) {
        const parsed = credentialSchema.safeParse(credentials);
        if (!parsed.success) {
          return null;
        }

        const username = parsed.data.username;
        const password = parsed.data.password;

        await cleanupOldAttempts();

        if (await isTemporarilyLocked(username)) {
          return null;
        }

        const forwardedFor = req?.headers?.["x-forwarded-for"];
        const ip =
          typeof forwardedFor === "string"
            ? forwardedFor.split(",")[0]?.trim()
            : null;
        const isHuman = await verifyTurnstileToken(
          parsed.data.captchaToken,
          ip,
        );
        if (!isHuman) {
          await registerFailedAttempt(username);
          return null;
        }

        try {
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
            return null;
          }

          const user = userRows[0];
          const isValid = await bcrypt.compare(password, user.passwordHash);

          if (!isValid) {
            await registerFailedAttempt(username);
            return null;
          }

          await clearAttempts(username);

          return {
            id: String(user.id),
            name: user.displayName,
            email: user.username,
          };
        } catch {
          await registerFailedAttempt(username);
          return null;
        }
      },
    }),
  ],
  session: {
    strategy: "jwt",
  },
  pages: {
    signIn: "/login",
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
      }
      return token;
    },
    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.id as string;
      }
      return session;
    },
  },
};
