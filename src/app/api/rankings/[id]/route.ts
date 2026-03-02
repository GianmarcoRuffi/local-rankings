import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { rankings, generalRanking, stages } from "@/lib/db/schema";
import { eq, and, ne } from "drizzle-orm";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const rankingId = parseInt(id);

  try {
    const rows = await db
      .select()
      .from(rankings)
      .where(eq(rankings.id, rankingId))
      .limit(1);

    if (rows.length === 0) {
      return NextResponse.json({ error: "Ranking not found" }, { status: 404 });
    }

    return NextResponse.json(rows[0]);
  } catch (error) {
    console.error("Error fetching ranking:", error);
    return NextResponse.json(
      { error: "Failed to fetch ranking" },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const rankingId = parseInt(id);
  const body = await request.json();
  const { name, description, is_default } = body;

  try {
    const existing = await db
      .select()
      .from(rankings)
      .where(eq(rankings.id, rankingId))
      .limit(1);

    if (existing.length === 0) {
      return NextResponse.json({ error: "Ranking not found" }, { status: 404 });
    }

    await db.transaction(async (tx) => {
      // If this is set as default, remove default from other rankings
      if (is_default) {
        await tx
          .update(rankings)
          .set({ isDefault: false })
          .where(and(eq(rankings.isDefault, true), ne(rankings.id, rankingId)));
      }

      await tx
        .update(rankings)
        .set({
          name: name?.trim(),
          description: description?.trim() || null,
          isDefault: !!is_default,
          updatedAt: new Date(),
        })
        .where(eq(rankings.id, rankingId));
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error updating ranking:", error);
    return NextResponse.json(
      { error: "Failed to update ranking" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const rankingId = parseInt(id);

  try {
    const existing = await db
      .select()
      .from(rankings)
      .where(eq(rankings.id, rankingId))
      .limit(1);

    if (existing.length === 0) {
      return NextResponse.json({ error: "Ranking not found" }, { status: 404 });
    }

    if (existing[0].isDefault) {
      return NextResponse.json(
        { error: "Cannot delete the default ranking" },
        { status: 400 }
      );
    }

    await db.transaction(async (tx) => {
      // Delete all general ranking entries for this ranking
      await tx
        .delete(generalRanking)
        .where(eq(generalRanking.rankingId, rankingId));

      // Set ranking_id to NULL for stages linked to this ranking
      await tx
        .update(stages)
        .set({ rankingId: null })
        .where(eq(stages.rankingId, rankingId));

      // Delete the ranking
      await tx.delete(rankings).where(eq(rankings.id, rankingId));
    });

    return NextResponse.json({
      success: true,
      message: "Ranking deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting ranking:", error);
    return NextResponse.json(
      { error: "Failed to delete ranking" },
      { status: 500 }
    );
  }
}
