import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { rankings, generalRanking, stages } from "@/lib/db/schema";
import { eq, not, isNull, desc } from "drizzle-orm";
import { z } from "zod";

const restoreRankingSchema = z.object({
  rankingId: z.number().positive(),
});

const restoreGeneralEntrySchema = z.object({
  entryId: z.number().positive(),
});

const deletePermanentlyRankingSchema = z.object({
  rankingId: z.number().positive(),
});

const deletePermanentlyGeneralEntrySchema = z.object({
  entryId: z.number().positive(),
});

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Get deleted rankings
    const deletedRankings = await db
      .select()
      .from(rankings)
      .where(not(isNull(rankings.deletedAt)))
      .orderBy(desc(rankings.deletedAt));

    // Get deleted general ranking entries
    const deletedGeneralEntries = await db
      .select()
      .from(generalRanking)
      .where(not(isNull(generalRanking.deletedAt)))
      .orderBy(desc(generalRanking.deletedAt));

    // Get deleted stages
    const deletedStages = await db
      .select()
      .from(stages)
      .where(not(isNull(stages.deletedAt)))
      .orderBy(desc(stages.deletedAt));

    return NextResponse.json({
      rankings: deletedRankings,
      generalRanking: deletedGeneralEntries,
      stages: deletedStages,
    });
  } catch (error) {
    console.error("Error fetching trash:", error);
    return NextResponse.json(
      { error: "Failed to fetch trash" },
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
    const { action } = body;

    if (action === "restoreRanking") {
      const parsed = restoreRankingSchema.safeParse(body);
      if (!parsed.success) {
        return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
      }

      const { rankingId } = parsed.data;

      // Check if ranking exists in trash
      const existing = await db
        .select()
        .from(rankings)
        .where(eq(rankings.id, rankingId))
        .limit(1);

      if (existing.length === 0 || !existing[0].deletedAt) {
        return NextResponse.json({ error: "Ranking not found in trash" }, { status: 404 });
      }

      // Restore the ranking
      await db
        .update(rankings)
        .set({ deletedAt: null })
        .where(eq(rankings.id, rankingId));

      // Also restore any associated data
      await db
        .update(generalRanking)
        .set({ deletedAt: null })
        .where(eq(generalRanking.rankingId, rankingId));

      await db
        .update(stages)
        .set({ deletedAt: null })
        .where(eq(stages.rankingId, rankingId));

      return NextResponse.json({ success: true, message: "Classifica ripristinata" });
    }

    if (action === "restoreGeneralEntry") {
      const parsed = restoreGeneralEntrySchema.safeParse(body);
      if (!parsed.success) {
        return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
      }

      const { entryId } = parsed.data;

      // Restore the general ranking entry
      await db
        .update(generalRanking)
        .set({ deletedAt: null })
        .where(eq(generalRanking.id, entryId));

      return NextResponse.json({ success: true, message: "Entry ripristinata" });
    }

    if (action === "deletePermanentlyRanking") {
      const parsed = deletePermanentlyRankingSchema.safeParse(body);
      if (!parsed.success) {
        return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
      }

      const { rankingId } = parsed.data;

      // First delete all related data permanently
      await db
        .delete(generalRanking)
        .where(eq(generalRanking.rankingId, rankingId));

      await db
        .delete(stages)
        .where(eq(stages.rankingId, rankingId));

      // Then delete the ranking
      await db
        .delete(rankings)
        .where(eq(rankings.id, rankingId));

      return NextResponse.json({ success: true, message: "Classifica eliminata definitivamente" });
    }

    if (action === "deletePermanentlyGeneralEntry") {
      const parsed = deletePermanentlyGeneralEntrySchema.safeParse(body);
      if (!parsed.success) {
        return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
      }

      const { entryId } = parsed.data;

      // Delete permanently
      await db
        .delete(generalRanking)
        .where(eq(generalRanking.id, entryId));

      return NextResponse.json({ success: true, message: "Entry eliminata definitivamente" });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    console.error("Error in trash operation:", error);
    return NextResponse.json(
      { error: "Failed to perform trash operation" },
      { status: 500 }
    );
  }
}
