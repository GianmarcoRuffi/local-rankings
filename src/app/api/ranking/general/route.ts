import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { generalRanking } from "@/lib/db/schema";
import { eq, or, and, isNull, sql } from "drizzle-orm";
import { sortRanking } from "@/lib/ranking-logic";
import { logger } from "@/lib/logger";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const rankingIdStr = searchParams.get("rankingId");
    const rankingId = rankingIdStr ? parseInt(rankingIdStr) : null;
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const limit = Math.min(
      1000,
      Math.max(1, parseInt(searchParams.get("limit") || "1000", 10)),
    );
    const offset = (page - 1) * limit;

    let query = db.select().from(generalRanking).$dynamic();

    // Exclude soft-deleted entries
    query = query.where(isNull(generalRanking.deletedAt));

    if (rankingId) {
      // Include entries for this specific ranking
      query = query.where(
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

    const total = ranked.length;
    const paginatedRanked = ranked.slice(offset, offset + limit);

    return NextResponse.json({
      data: paginatedRanked,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    logger.error("Failed to fetch general ranking", { error });
    return NextResponse.json(
      { error: "Failed to fetch ranking" },
      { status: 500 },
    );
  }
}
