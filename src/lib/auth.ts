import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { env } from "@/lib/env";
import { logger } from "@/lib/logger";

// NOTE: loginAttempts table removed - rate limiting disabled
// TODO: Re-implement with Redis or session-based approach

async function isTemporarilyLocked(_username: string): Promise<boolean> {
  // Stub: rate limiting disabled after loginAttempts removal
  return false;
}

async function registerFailedAttempt(username: string): Promise<void> {
  // Stub: rate limiting disabled after loginAttempts removal
  logger.debug("Failed login attempt (tracking disabled):", { username });
}

async function clearAttempts(_username: string): Promise<void> {
  // Stub: rate limiting disabled after loginAttempts removal
}

async function cleanupOldAttempts(): Promise<void> {
  // Stub: rate limiting disabled after loginAttempts removal
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
