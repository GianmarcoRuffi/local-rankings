import { db } from "@/lib/db";
import { sessions, users } from "@/lib/db/schema";
import { eq, lt } from "drizzle-orm";

const SESSION_DURATION_MS = 20 * 60 * 1000;

export function generateSessionToken(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, (byte) => byte.toString(16).padStart(2, "0")).join(
    "",
  );
}

export async function createSession(userId: number): Promise<string> {
  const token = generateSessionToken();
  const expiresAt = new Date(Date.now() + SESSION_DURATION_MS);

  await db.delete(sessions).where(eq(sessions.userId, userId));

  await db.insert(sessions).values({
    userId,
    token,
    expiresAt,
  });

  return token;
}

export async function validateSession(token: string): Promise<{
  valid: boolean;
  userId?: number;
  username?: string;
  displayName?: string;
}> {
  if (!token) {
    return { valid: false };
  }

  try {
    const sessionRows = await db
      .select({
        userId: sessions.userId,
        expiresAt: sessions.expiresAt,
        username: users.username,
        displayName: users.displayName,
      })
      .from(sessions)
      .innerJoin(users, eq(sessions.userId, users.id))
      .where(eq(sessions.token, token))
      .limit(1);

    if (sessionRows.length === 0) {
      return { valid: false };
    }

    const session = sessionRows[0];

    if (session.expiresAt <= new Date()) {
      await db.delete(sessions).where(eq(sessions.token, token));
      return { valid: false };
    }

    return {
      valid: true,
      userId: session.userId,
      username: session.username,
      displayName: session.displayName,
    };
  } catch {
    return { valid: false };
  }
}

export async function deleteSession(token: string): Promise<void> {
  try {
    await db.delete(sessions).where(eq(sessions.token, token));
  } catch {}
}

export async function cleanupExpiredSessions(): Promise<void> {
  try {
    await db.delete(sessions).where(lt(sessions.expiresAt, new Date()));
  } catch {}
}
