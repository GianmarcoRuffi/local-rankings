import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import { requireAuth } from "@/lib/require-auth";
import { db } from "@/lib/db";
import { generalRanking } from "@/lib/db/schema";
import { eq, or, and, isNull, sql } from "drizzle-orm";

export async function POST(request: NextRequest) {
  const auth = await requireAuth(request);
  if (!auth.authorized) {
    return auth.response;
  }

  try {
    const { searchParams } = new URL(request.url);
    const rankingIdStr = searchParams.get("rankingId");
    const rankingId = rankingIdStr ? Number.parseInt(rankingIdStr, 10) : null;

    if (
      rankingIdStr &&
      (rankingId === null || Number.isNaN(rankingId) || rankingId <= 0)
    ) {
      return NextResponse.json({ error: "Invalid rankingId" }, { status: 400 });
    }

    if (rankingId) {
      // Soft delete only the specified ranking (move to trash)
      await db
        .update(generalRanking)
        .set({ deletedAt: new Date() })
        .where(
          and(
            or(
              eq(generalRanking.rankingId, rankingId),
              and(
                isNull(generalRanking.rankingId),
                sql`${rankingId} = (SELECT id FROM rankings WHERE is_default = true LIMIT 1)`,
              ),
            ),
            isNull(generalRanking.deletedAt),
          ),
        );
      return NextResponse.json({
        success: true,
        message: "Classifica azzerata",
      });
    } else {
      // Soft delete all rankings (move to trash)
      await db
        .update(generalRanking)
        .set({ deletedAt: new Date() })
        .where(isNull(generalRanking.deletedAt));
      return NextResponse.json({
        success: true,
        message: "Tutte le classifiche azzerate",
      });
    }
  } catch (error) {
    logger.error("Error resetting general ranking:", { error });
    return NextResponse.json(
      { error: "Failed to reset ranking" },
      { status: 500 },
    );
  }
}
