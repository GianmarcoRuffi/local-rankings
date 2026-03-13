import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { generalRanking } from "@/lib/db/schema";
import { eq, or, and, isNull, sql } from "drizzle-orm";
import { sortRanking } from "@/lib/ranking-logic";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const rankingIdStr = searchParams.get("rankingId");
    const rankingId = rankingIdStr ? parseInt(rankingIdStr) : null;

    const query = db.select().from(generalRanking);

    // Exclude soft-deleted entries
    query.where(isNull(generalRanking.deletedAt));

    if (rankingId) {
      // Include entries for this specific ranking
      query.where(
        or(
          eq(generalRanking.rankingId, rankingId),
          and(
            isNull(generalRanking.rankingId),
            sql`${rankingId} = (SELECT id FROM rankings WHERE is_default = true LIMIT 1)`
          )
        )
      );
    }

    const rows = await query;

    // Ordina usando il comparatore personalizzato
    const sorted = sortRanking(
      rows.map((row) => ({
        ...row,
        total_points: row.totalPoints ?? 0,
        t1: row.t1 ?? 0,
      }))
    );

    // Aggiungi la posizione
    const ranked = sorted.map((row, index) => ({
      ...row,
      position: index + 1,
    }));

    return NextResponse.json(ranked);
  } catch (error) {
    console.error("Error fetching general ranking:", error);
    return NextResponse.json(
      { error: "Failed to fetch ranking" },
      { status: 500 }
    );
  }
}
