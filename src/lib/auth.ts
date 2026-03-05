import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { z } from "zod";
import pool from "@/lib/db";

interface UserRow {
  id: number;
  username: string;
  password_hash: string;
  display_name: string;
}

const MAX_FAILED_ATTEMPTS = 15;
const LOCK_WINDOW_MS = 15 * 60 * 1000;

const loginAttempts = new Map<string, { count: number; lockedUntil: number }>();

function isTemporarilyLocked(username: string): boolean {
  const record = loginAttempts.get(username);
  if (!record) {
    return false;
  }

  if (record.lockedUntil > Date.now()) {
    return true;
  }

  loginAttempts.delete(username);
  return false;
}

function registerFailedAttempt(username: string): void {
  const now = Date.now();
  const record = loginAttempts.get(username);

  if (!record) {
    loginAttempts.set(username, { count: 1, lockedUntil: 0 });
    return;
  }

  const nextCount = record.count + 1;
  if (nextCount >= MAX_FAILED_ATTEMPTS) {
    loginAttempts.set(username, { count: 0, lockedUntil: now + LOCK_WINDOW_MS });
    return;
  }

  loginAttempts.set(username, { count: nextCount, lockedUntil: 0 });
}

function clearAttempts(username: string): void {
  loginAttempts.delete(username);
}

const credentialSchema = z.object({
  username: z.string().trim().min(1),
  password: z.string().min(1),
  captchaToken: z.string().min(1),
});

async function verifyTurnstileToken(token: string, ip?: string | null): Promise<boolean> {
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
    const response = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
    });

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

        if (isTemporarilyLocked(username)) {
          return null;
        }

        const forwardedFor = req?.headers?.["x-forwarded-for"];
        const ip = typeof forwardedFor === "string" ? forwardedFor.split(",")[0]?.trim() : null;
        const isHuman = await verifyTurnstileToken(parsed.data.captchaToken, ip);
        if (!isHuman) {
          registerFailedAttempt(username);
          return null;
        }

        try {
          const result = await pool.query<UserRow>(
            "SELECT id, username, password_hash, display_name FROM users WHERE username = $1",
            [username]
          );

          if (result.rows.length === 0) {
            registerFailedAttempt(username);
            return null;
          }

          const user = result.rows[0];
          const isValid = await bcrypt.compare(password, user.password_hash);

          if (!isValid) {
            registerFailedAttempt(username);
            return null;
          }

          clearAttempts(username);

          return {
            id: String(user.id),
            name: user.display_name,
            email: user.username,
          };
        } catch {
          registerFailedAttempt(username);
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
