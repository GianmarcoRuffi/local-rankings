import { NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import { generalRankingQuerySchema } from "@/lib/validations";
import { db } from "@/lib/db";
import { generalRanking } from "@/lib/db/schema";
import { eq, or, and, isNull, sql } from "drizzle-orm";
import { sortRanking } from "@/lib/ranking-logic";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);

    // Valida i parametri query
    const validation = generalRankingQuerySchema.safeParse({
      rankingId: searchParams.get("rankingId"),
      page: searchParams.get("page"),
      limit: searchParams.get("limit"),
    });

    if (!validation.success) {
      const firstError = validation.error.issues[0];
      return NextResponse.json(
        { error: firstError?.message || "Parametri non validi" },
        { status: 400 },
      );
    }

    const { rankingId, page, limit } = validation.data;
    const offset = (page - 1) * limit;

    // Query diretta al database (cache temporaneamente rimossa)
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
