import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { stages, rankings, stageRanking, generalRanking } from "@/lib/db/schema";
import { eq, and, or, isNull, sql } from "drizzle-orm";
import { z } from "zod";
import { sortRanking } from "@/lib/ranking-logic";

const revertMergeSchema = z.object({
  stageId: z.union([z.number().int().positive(), z.string()]),
});

function toPositiveInt(value: unknown): number | null {
  if (typeof value === "number" && Number.isInteger(value) && value > 0) {
    return value;
  }

  if (typeof value !== "string") {
    return null;
  }

  const parsed = Number.parseInt(value, 10);
  if (Number.isNaN(parsed) || parsed <= 0) {
    return null;
  }

  return parsed;
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const parsedBody = revertMergeSchema.safeParse(body);
  const stageId = parsedBody.success ? toPositiveInt(parsedBody.data.stageId) : null;

  if (!stageId) {
    return NextResponse.json({ error: "Valid stageId is required" }, { status: 400 });
  }

  try {
    const stageRows = await db
      .select()
      .from(stages)
      .where(eq(stages.id, stageId))
      .limit(1);

    if (stageRows.length === 0) {
      return NextResponse.json({ error: "Stage not found" }, { status: 404 });
    }

    const stage = stageRows[0];

    if (stage.status !== "merged") {
      return NextResponse.json({ error: "This stage has not been merged" }, { status: 409 });
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
      .where(eq(stageRanking.stageId, stageId))
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
          const newPoints = current.totalPoints - (player.pointsAwarded || 0);
          const newT1 = (current.t1 || 0) - (player.t1 || 0);
          const newPresenze = (current.presenze || 0) - (player.presenze || 1);

          if (newPoints <= 0 && newT1 === 0 && newPresenze <= 0) {
            await tx
              .delete(generalRanking)
              .where(eq(generalRanking.id, current.id));
          } else {
            await tx
              .update(generalRanking)
              .set({
                totalPoints: Math.max(0, newPoints),
                t1: newT1,
                presenze: Math.max(0, newPresenze),
                updatedAt: new Date(),
              })
              .where(eq(generalRanking.id, current.id));
          }
        }
      }

      await tx
        .update(stages)
        .set({ status: "active", updatedAt: new Date() })
        .where(eq(stages.id, stageId));

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

      if (allPlayers.length > 0) {
        const sorted = sortRanking(
          allPlayers.map((p) => ({
            id: p.id,
            total_points: p.totalPoints,
            t1: p.t1 || 0,
          }))
        );

        for (let i = 0; i < sorted.length; i++) {
          await tx
            .update(generalRanking)
            .set({ position: i + 1 })
            .where(eq(generalRanking.id, sorted[i].id));
        }
      }
    });

    return NextResponse.json({
      success: true,
      message: `Merge della tappa "${stage.name}" annullato`,
    });
  } catch (error) {
    console.error("Error reverting merge:", error);
    return NextResponse.json({ error: "Failed to revert merge" }, { status: 500 });
  }
}
