import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import { requireAuth } from "@/lib/require-auth";
import { db } from "@/lib/db";
import { generalRanking } from "@/lib/db/schema";
import { eq, or, and, isNull, sql } from "drizzle-orm";
import { sortRanking } from "@/lib/ranking-logic";
import { toPositiveInt } from "@/lib/utils";
import { invalidateCache } from "@/lib/cache";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireAuth(request);
  if (!auth.authorized) {
    return auth.response;
  }

  const { id } = await params;
  const playerId = toPositiveInt(id);

  if (!playerId) {
    return NextResponse.json({ error: "Invalid player id" }, { status: 400 });
  }

  const body = await request.json();
  const { name, total_points, t1, presenze, ranking_id } = body;

  if (typeof name !== "string" || !name.trim()) {
    return NextResponse.json({ error: "Name is required" }, { status: 400 });
  }

  try {
    // Get the ranking_id from the player if not provided
    let effectiveRankingId = ranking_id
      ? Number.parseInt(ranking_id, 10)
      : null;
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

    const allPlayers = effectiveRankingId
      ? await db
          .select({
            id: generalRanking.id,
            totalPoints: generalRanking.totalPoints,
            t1: generalRanking.t1,
          })
          .from(generalRanking)
          .where(
            or(
              eq(generalRanking.rankingId, effectiveRankingId),
              and(
                isNull(generalRanking.rankingId),
                sql`${effectiveRankingId} = (SELECT id FROM rankings WHERE is_default = true LIMIT 1)`,
              ),
            ),
          )
      : await db
          .select({
            id: generalRanking.id,
            totalPoints: generalRanking.totalPoints,
            t1: generalRanking.t1,
          })
          .from(generalRanking);

    const sorted = sortRanking(
      allPlayers.map((p) => ({
        id: p.id,
        total_points: p.totalPoints,
        t1: p.t1 || 0,
      })),
    );

    await db.transaction(async (tx) => {
      for (let i = 0; i < sorted.length; i++) {
        await tx
          .update(generalRanking)
          .set({ position: i + 1 })
          .where(eq(generalRanking.id, sorted[i].id));
      }
    });

    invalidateCache(`general-ranking:${effectiveRankingId ?? "all"}`);

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error("Error updating general ranking player:", { error });
    return NextResponse.json(
      { error: "Failed to update player" },
      { status: 500 },
    );
  }
}
