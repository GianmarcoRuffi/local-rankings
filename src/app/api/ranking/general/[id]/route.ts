import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { generalRanking } from "@/lib/db/schema";
import { eq, or, and, isNull, sql } from "drizzle-orm";
import { sortRanking } from "@/lib/ranking-logic";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const playerId = parseInt(id);
  const body = await request.json();
  const { name, total_points, t1, presenze, ranking_id } = body;

  try {
    // Get the ranking_id from the player if not provided
    let effectiveRankingId = ranking_id ? parseInt(ranking_id) : null;
    if (!effectiveRankingId) {
      const playerRow = await db
        .select({ rankingId: generalRanking.rankingId })
        .from(generalRanking)
        .where(eq(generalRanking.id, playerId))
        .limit(1);
      if (playerRow.length > 0) {
        effectiveRankingId = playerRow[0].rankingId;
      }
    }

    await db
      .update(generalRanking)
      .set({
        name,
        totalPoints: total_points,
        t1,
        presenze,
        updatedAt: new Date(),
      })
      .where(eq(generalRanking.id, playerId));

    // Fetch all players in the same ranking
    const query = db
      .select({ id: generalRanking.id, totalPoints: generalRanking.totalPoints, t1: generalRanking.t1 })
      .from(generalRanking);
    
    if (effectiveRankingId) {
      query.where(
        or(
          eq(generalRanking.rankingId, effectiveRankingId),
          and(
            isNull(generalRanking.rankingId),
            sql`${effectiveRankingId} = (SELECT id FROM rankings WHERE is_default = true LIMIT 1)`
          )
        )
      );
    }

    const allPlayers = await query;

    const sorted = sortRanking(
      allPlayers.map((p) => ({
        id: p.id,
        total_points: p.totalPoints,
        t1: p.t1 || 0,
      }))
    );

    await db.transaction(async (tx) => {
      for (let i = 0; i < sorted.length; i++) {
        await tx
          .update(generalRanking)
          .set({ position: i + 1 })
          .where(eq(generalRanking.id, sorted[i].id));
      }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error updating general ranking player:", error);
    return NextResponse.json({ error: "Failed to update player" }, { status: 500 });
  }
}
