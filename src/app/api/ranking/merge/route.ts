import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { stages, rankings, stageRanking, generalRanking } from "@/lib/db/schema";
import { eq, and, or, isNull, sql } from "drizzle-orm";
import { sortRanking } from "@/lib/ranking-logic";

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { stageId } = body;

    if (!stageId) {
      return NextResponse.json(
        { error: "stageId is required" },
        { status: 400 }
      );
    }

    const stageRows = await db
      .select()
      .from(stages)
      .where(eq(stages.id, parseInt(stageId)))
      .limit(1);

    if (stageRows.length === 0) {
      return NextResponse.json({ error: "Stage not found" }, { status: 404 });
    }

    const stage = stageRows[0];

    if (stage.status === "merged") {
      return NextResponse.json(
        { error: "This stage has already been merged" },
        { status: 409 }
      );
    }

    // Get the ranking_id from the stage
    let rankingId = stage.rankingId;
    if (!rankingId) {
      const defaultRanking = await db
        .select({ id: rankings.id })
        .from(rankings)
        .where(eq(rankings.isDefault, true))
        .limit(1);
      if (defaultRanking.length > 0) {
        rankingId = defaultRanking[0].id;
      }
    }

    const stagePlayers = await db
      .select()
      .from(stageRanking)
      .where(eq(stageRanking.stageId, parseInt(stageId)))
      .orderBy(stageRanking.position);

    await db.transaction(async (tx) => {
      for (const player of stagePlayers) {
        const existing = await tx
          .select()
          .from(generalRanking)
          .where(
            and(
              sql`LOWER(${generalRanking.name}) = LOWER(${player.name})`,
              or(
                eq(generalRanking.rankingId, rankingId!),
                and(
                  isNull(generalRanking.rankingId),
                  sql`${rankingId} = (SELECT id FROM rankings WHERE is_default = true LIMIT 1)`
                )
              )
            )
          )
          .limit(1);

        if (existing.length > 0) {
          const current = existing[0];
          await tx
            .update(generalRanking)
            .set({
              totalPoints: current.totalPoints + (player.pointsAwarded || 0),
              t1: (current.t1 || 0) + (player.t1 || 0),
              presenze: (current.presenze || 0) + (player.presenze || 1),
              updatedAt: new Date(),
            })
            .where(eq(generalRanking.id, current.id));
        } else {
          await tx.insert(generalRanking).values({
            name: player.name,
            rankingId: rankingId,
            totalPoints: player.pointsAwarded || 0,
            t1: player.t1 || 0,
            presenze: player.presenze || 1,
            updatedAt: new Date(),
          });
        }
      }

      await tx
        .update(stages)
        .set({ status: "merged", updatedAt: new Date() })
        .where(eq(stages.id, parseInt(stageId)));

      // Riordina la classifica generale per questo ranking
      const allPlayers = await tx
        .select({ id: generalRanking.id, totalPoints: generalRanking.totalPoints, t1: generalRanking.t1 })
        .from(generalRanking)
        .where(
          or(
            eq(generalRanking.rankingId, rankingId!),
            and(
              isNull(generalRanking.rankingId),
              sql`${rankingId} = (SELECT id FROM rankings WHERE is_default = true LIMIT 1)`
            )
          )
        );

      const sorted = sortRanking(
        allPlayers.map((p) => ({
          id: p.id,
          total_points: p.totalPoints,
          t1: p.t1 || 0,
        }))
      );

      // Aggiorna le posizioni
      for (let i = 0; i < sorted.length; i++) {
        await tx
          .update(generalRanking)
          .set({ position: i + 1 })
          .where(eq(generalRanking.id, sorted[i].id));
      }
    });

    return NextResponse.json({
      success: true,
      message: `Stage "${stage.name}" merged successfully`,
      playersUpdated: stagePlayers.length,
    });
  } catch (error) {
    console.error("Error merging stage:", error);
    return NextResponse.json(
      { error: "Failed to merge stage" },
      { status: 500 }
    );
  }
}
