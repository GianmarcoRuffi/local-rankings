import { db } from "@/lib/db";
import { loginAttempts } from "@/lib/db/schema";
import { eq, and, lt } from "drizzle-orm";
import {
  MAX_FAILED_LOGIN_ATTEMPTS,
  LOGIN_LOCK_WINDOW_MS,
  LOGIN_ATTEMPTS_CLEANUP_MS,
} from "@/lib/constants";
import { logger } from "@/lib/logger";

/**
 * Verifica se un utente è temporaneamente bloccato a causa di troppi tentativi falliti
 */
export async function isTemporarilyLocked(username: string): Promise<boolean> {
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

    // Se esiste una data di sblocco e non è ancora passata, l'utente è bloccato
    if (record.lockedUntil && record.lockedUntil > new Date()) {
      return true;
    }

    // Se la data di sblocco è passata, rimuovi il blocco
    if (record.lockedUntil && record.lockedUntil <= new Date()) {
      await db
        .delete(loginAttempts)
        .where(eq(loginAttempts.username, username));
      return false;
    }

    return false;
  } catch (error) {
    logger.error("Failed to check if user is locked", { username, error });
    return false;
  }
}

/**
 * Registra un tentativo di login fallito
 * Dopo MAX_FAILED_LOGIN_ATTEMPTS, l'utente viene bloccato per LOGIN_LOCK_WINDOW_MS
 */
export async function registerFailedAttempt(username: string): Promise<void> {
  try {
    const now = new Date();
    const records = await db
      .select()
      .from(loginAttempts)
      .where(eq(loginAttempts.username, username))
      .limit(1);

    if (records.length === 0) {
      // Primo tentativo fallito
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
      // Blocca l'utente
      await db
        .update(loginAttempts)
        .set({
          failedCount: 0,
          lockedUntil: new Date(now.getTime() + LOGIN_LOCK_WINDOW_MS),
          lastAttempt: now,
        })
        .where(eq(loginAttempts.username, username));

      logger.warn("User locked due to too many failed attempts", {
        username,
        attempts: nextCount,
      });
      return;
    }

    // Incrementa il contatore
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

/**
 * Pulisce tutti i tentativi di login per un utente (dopo login riuscito)
 */
export async function clearAttempts(username: string): Promise<void> {
  try {
    await db.delete(loginAttempts).where(eq(loginAttempts.username, username));
  } catch (error) {
    logger.error("Failed to clear login attempts", { username, error });
  }
}

/**
 * Pulisce i vecchi tentativi di login dal database
 * Rimuove record con failedCount = 0 più vecchi di LOGIN_ATTEMPTS_CLEANUP_MS
 */
export async function cleanupOldAttempts(): Promise<void> {
  try {
    const cutoff = new Date(Date.now() - LOGIN_ATTEMPTS_CLEANUP_MS);
    const result = await db
      .delete(loginAttempts)
      .where(
        and(
          lt(loginAttempts.lastAttempt, cutoff),
          eq(loginAttempts.failedCount, 0),
        ),
      );

    logger.debug("Cleaned up old login attempts", { result });
  } catch (error) {
    logger.error("Failed to cleanup old login attempts", { error });
  }
}

/**
 * Ottieni il numero di tentativi falliti rimasti prima del blocco
 */
export async function getRemainingAttempts(username: string): Promise<number> {
  try {
    const records = await db
      .select()
      .from(loginAttempts)
      .where(eq(loginAttempts.username, username))
      .limit(1);

    if (records.length === 0) {
      return MAX_FAILED_LOGIN_ATTEMPTS;
    }

    const record = records[0];
    return Math.max(0, MAX_FAILED_LOGIN_ATTEMPTS - record.failedCount);
  } catch (error) {
    logger.error("Failed to get remaining attempts", { username, error });
    return MAX_FAILED_LOGIN_ATTEMPTS;
  }
}
