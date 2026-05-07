import { db } from "@/lib/db";
import { generalRanking } from "@/lib/db/schema";
import { eq, or, and, isNull, sql } from "drizzle-orm";
import { sortRanking } from "@/lib/ranking-logic";
import {
  GENERAL_RANKING_CACHE_TTL_SECONDS,
  MILLISECONDS_PER_SECOND,
} from "@/lib/constants";

export type GeneralRankingRow = {
  id: number;
  ranking_id: number | null;
  position: number;
  name: string;
  total_points: number;
  t1: number;
  presenze: number;
  created_at: string;
  updated_at: string;
};

/**
 * Fetches the general ranking from the database with a per-ranking cache key.
 */
export async function getCachedGeneralRanking(
  rankingId: number | null,
): Promise<GeneralRankingRow[]> {
  return getCachedData(
    `general-ranking:${rankingId ?? "all"}`,
    async () => {
      const rows = rankingId
        ? await db
            .select()
            .from(generalRanking)
            .where(
              and(
                isNull(generalRanking.deletedAt),
                or(
                  eq(generalRanking.rankingId, rankingId),
                  and(
                    isNull(generalRanking.rankingId),
                    sql`${rankingId} = (SELECT id FROM rankings WHERE is_default = true LIMIT 1)`,
                  ),
                ),
              ),
            )
        : await db
            .select()
            .from(generalRanking)
            .where(isNull(generalRanking.deletedAt));

      const sorted = sortRanking(
        rows.map((row) => ({
          ...row,
          total_points: row.totalPoints ?? 0,
          t1: row.t1 ?? 0,
        })),
      );

      return sorted.map((row, index) => ({
        id: row.id,
        ranking_id: row.rankingId,
        position: index + 1,
        name: row.name,
        total_points: row.totalPoints ?? 0,
        t1: row.t1 ?? 0,
        presenze: row.presenze,
        created_at: row.createdAt.toISOString(),
        updated_at: row.updatedAt.toISOString(),
      }));
    },
    GENERAL_RANKING_CACHE_TTL_SECONDS,
  );
}

/**
 * In-memory cache fallback (for environments where unstable_cache doesn't work)
 */
const memoryCache = new Map<string, { data: unknown; expiry: number }>();

export async function getCachedData<T>(
  key: string,
  fetchFn: () => Promise<T>,
  ttlSeconds: number = GENERAL_RANKING_CACHE_TTL_SECONDS,
): Promise<T> {
  const now = Date.now();
  const cached = memoryCache.get(key);

  if (cached && cached.expiry > now) {
    return cached.data as T;
  }

  const data = await fetchFn();
  memoryCache.set(key, {
    data,
    expiry: now + ttlSeconds * MILLISECONDS_PER_SECOND,
  });

  return data;
}

/**
 * Invalidate cache by key or pattern
 */
export function invalidateCache(keyPattern: string): void {
  const keysToDelete: string[] = [];
  for (const [key] of memoryCache.entries()) {
    if (key.includes(keyPattern)) {
      keysToDelete.push(key);
    }
  }
  keysToDelete.forEach((key) => memoryCache.delete(key));
}

/**
 * Clear all cache
 */
export function clearAllCache(): void {
  memoryCache.clear();
}
