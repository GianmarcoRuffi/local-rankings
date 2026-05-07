import { unstable_cache } from "next/cache";
import { db } from "@/lib/db";
import { generalRanking } from "@/lib/db/schema";
import { eq, or, and, isNull, sql } from "drizzle-orm";
import { sortRanking } from "@/lib/ranking-logic";

/**
 * Cache duration in seconds
 */
const GENERAL_RANKING_CACHE_DURATION = 300; // 5 minuti

export type GeneralRankingRow = {
  id: number;
  rankingId: number | null;
  position: number | null;
  name: string;
  totalPoints: number;
  t1: number | null;
  presenze: number;
  createdAt: Date;
  updatedAt: Date;
};

/**
 * Fetches the general ranking from the database with caching
 * TODO: Fix cache key to support dynamic rankingId parameter
 * Temporarily disabled due to unstable_cache key limitations
 */
/*
export const getCachedGeneralRanking = unstable_cache(
  async (rankingId: number | null) => {
    const query = db.select().from(generalRanking);

    if (rankingId) {
      query.where(
        or(
          eq(generalRanking.rankingId, rankingId),
          and(
            isNull(generalRanking.rankingId),
            sql`${rankingId} = (SELECT id FROM rankings WHERE is_default = true LIMIT 1)`,
          ),
        ),
      );
    }

    const rows = await query;

    // Ordina usando il comparatore personalizzato
    const sorted = sortRanking(
      rows.map((row) => ({
        ...row,
        total_points: row.totalPoints ?? 0,
        t1: row.t1 ?? 0,
      })),
    );

    // Aggiungi la posizione
    const ranked = sorted.map((row, index) => ({
      ...row,
      position: index + 1,
    }));

    return ranked;
  },
  (rankingId) => [`general-ranking-${rankingId ?? "all"}`],
  {
    revalidate: GENERAL_RANKING_CACHE_DURATION,
    tags: ["general-ranking"],
  },
);
*/

/**
 * In-memory cache fallback (for environments where unstable_cache doesn't work)
 */
const memoryCache = new Map<string, { data: unknown; expiry: number }>();

export async function getCachedData<T>(
  key: string,
  fetchFn: () => Promise<T>,
  ttlSeconds: number = 300,
): Promise<T> {
  const now = Date.now();
  const cached = memoryCache.get(key);

  if (cached && cached.expiry > now) {
    return cached.data as T;
  }

  const data = await fetchFn();
  memoryCache.set(key, {
    data,
    expiry: now + ttlSeconds * 1000,
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
