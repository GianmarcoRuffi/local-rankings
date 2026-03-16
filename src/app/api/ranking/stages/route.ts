import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { stages, rankings, stageRanking } from "@/lib/db/schema";
import { eq, or, and, isNull, desc, sql } from "drizzle-orm";
import { z } from "zod";

const stagePlayerSchema = z.object({
  position: z.number().int().positive(),
  name: z.string().trim().min(1),
  score: z.union([z.number(), z.string(), z.null()]).optional(),
  points_awarded: z.number().int().nonnegative(),
  t1: z.number().int().optional().nullable(),
  presenze: z.number().int().positive().optional().nullable(),
});

const createStageSchema = z.object({
  name: z.string().trim().min(1),
  date: z.string().optional().nullable(),
  rankingId: z.union([z.number().int().positive(), z.string()]).optional().nullable(),
  players: z.array(stagePlayerSchema).optional(),
});

type StagePlayerInput = z.infer<typeof stagePlayerSchema>;

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

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const rankingIdStr = searchParams.get("rankingId");
    const rankingId = rankingIdStr ? toPositiveInt(rankingIdStr) : null;

    if (rankingIdStr && !rankingId) {
      return NextResponse.json({ error: "Invalid rankingId" }, { status: 400 });
    }

    const query = db.select().from(stages);

    if (rankingId) {
      // WHERE ranking_id = ? OR (ranking_id IS NULL AND ? = (SELECT id FROM rankings WHERE is_default = 1 LIMIT 1))
      query.where(
        or(
          eq(stages.rankingId, rankingId),
          and(
            isNull(stages.rankingId),
            sql`${rankingId} = (SELECT id FROM rankings WHERE is_default = true LIMIT 1)`
          )
        )
      );
    }

    const rows = await query.orderBy(desc(stages.createdAt));
    return NextResponse.json(rows);
  } catch (error) {
    console.error("Error fetching stages:", error);
    return NextResponse.json(
      { error: "Failed to fetch stages" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const parsedBody = createStageSchema.safeParse(body);

    if (!parsedBody.success) {
      return NextResponse.json({ error: "Invalid stage payload" }, { status: 400 });
    }

    const { name, date, players, rankingId } = parsedBody.data;

    let effectiveRankingId = rankingId !== undefined && rankingId !== null ? toPositiveInt(rankingId) : null;
    if (rankingId !== undefined && rankingId !== null && !effectiveRankingId) {
      return NextResponse.json({ error: "Invalid rankingId" }, { status: 400 });
    }

    // Get the default ranking if no rankingId provided
    if (!effectiveRankingId) {
      const defaultRanking = await db
        .select({ id: rankings.id })
        .from(rankings)
        .where(eq(rankings.isDefault, true))
        .limit(1);
      
      if (defaultRanking.length > 0) {
        effectiveRankingId = defaultRanking[0].id;
      }
    }

    const result = await db.transaction(async (tx) => {
      const [insertedStage] = await tx
        .insert(stages)
        .values({
          name: name.trim(),
          date: date ? new Date(date).toISOString().split('T')[0] : null,
          rankingId: effectiveRankingId,
          status: "active",
        })
        .returning();

      const stageId = insertedStage.id;

      // If players are provided, insert them
      if (players && Array.isArray(players) && players.length > 0) {
        const playersToInsert = players.map((player: StagePlayerInput) => ({
          stageId,
          position: player.position,
          name: player.name,
          score: player.score?.toString() ?? null,
          pointsAwarded: player.points_awarded,
          t1: player.t1 ?? 0,
          presenze: player.presenze ?? 1,
        }));

        await tx.insert(stageRanking).values(playersToInsert);
      }

      return { stageId, effectiveRankingId };
    });

    return NextResponse.json({
      id: result.stageId,
      name,
      date,
      ranking_id: result.effectiveRankingId,
      playersCount: players?.length ?? 0,
    });
  } catch (error) {
    console.error("Error creating stage:", error);
    return NextResponse.json(
      { error: "Failed to create stage" },
      { status: 500 }
    );
  }
}
