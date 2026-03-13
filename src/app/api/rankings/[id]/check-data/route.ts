import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { rankings, generalRanking, stages } from "@/lib/db/schema";
import { eq, isNull, and } from "drizzle-orm";

function parsePositiveInt(value: string): number | null {
  const parsed = Number.parseInt(value, 10);
  if (Number.isNaN(parsed) || parsed <= 0) {
    return null;
  }

  return parsed;
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const rankingId = parsePositiveInt(id);

  if (!rankingId) {
    return NextResponse.json({ error: "Invalid ranking id" }, { status: 400 });
  }

  try {
    // Check if ranking exists
    const existing = await db
      .select()
      .from(rankings)
      .where(eq(rankings.id, rankingId))
      .limit(1);

    if (existing.length === 0) {
      return NextResponse.json({ error: "Ranking not found" }, { status: 404 });
    }

    // Check for active (non-deleted) general ranking entries
    const activeGeneralEntries = await db
      .select()
      .from(generalRanking)
      .where(
        and(
          eq(generalRanking.rankingId, rankingId),
          isNull(generalRanking.deletedAt)
        )
      )
      .limit(1);

    // Check for active (non-deleted) stages
    const activeStages = await db
      .select()
      .from(stages)
      .where(
        and(
          eq(stages.rankingId, rankingId),
          isNull(stages.deletedAt)
        )
      )
      .limit(1);

    const hasGeneralEntries = activeGeneralEntries.length > 0;
    const hasStages = activeStages.length > 0;
    const hasActiveData = hasGeneralEntries || hasStages;

    return NextResponse.json({
      hasActiveData,
      hasGeneralEntries,
      hasStages,
    });
  } catch (error) {
    console.error("Error checking active data:", error);
    return NextResponse.json(
      { error: "Failed to check active data" },
      { status: 500 }
    );
  }
}
