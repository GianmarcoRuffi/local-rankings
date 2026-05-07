import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/require-auth";
import { db } from "@/lib/db";
import { rankings, generalRanking, stages } from "@/lib/db/schema";
import { not, isNull, sql } from "drizzle-orm";

export async function GET(request: NextRequest) {
  const auth = await requireAuth(request);
  if (!auth.authorized) {
    return auth.response;
  }

  try {
    // Conta le classifiche eliminate
    const deletedRankingsResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(rankings)
      .where(not(isNull(rankings.deletedAt)));

    // Conta le voci della classifica generale eliminate
    const deletedGeneralEntriesResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(generalRanking)
      .where(not(isNull(generalRanking.deletedAt)));

    // Conta le tappe eliminate
    const deletedStagesResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(stages)
      .where(not(isNull(stages.deletedAt)));

    const rankingsCount = deletedRankingsResult[0]?.count || 0;
    const generalEntriesCount = deletedGeneralEntriesResult[0]?.count || 0;
    const stagesCount = deletedStagesResult[0]?.count || 0;

    const count = rankingsCount + generalEntriesCount + stagesCount;

    return NextResponse.json({
      count,
      rankings: rankingsCount,
      generalEntries: generalEntriesCount,
      stages: stagesCount,
    });
  } catch (error) {
    console.error("Error fetching trash count:", error);
    return NextResponse.json(
      { error: "Failed to fetch trash count" },
      { status: 500 },
    );
  }
}
