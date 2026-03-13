import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { rankings, generalRanking, stages } from "@/lib/db/schema";
import { eq, and, ne, isNull } from "drizzle-orm";
import { z } from "zod";

const updateRankingSchema = z.object({
  name: z.string().trim().min(1),
  description: z.string().nullable().optional(),
  is_default: z.boolean().optional(),
});

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
  const { id } = await params;
  const rankingId = parsePositiveInt(id);

  if (!rankingId) {
    return NextResponse.json({ error: "Invalid ranking id" }, { status: 400 });
  }

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
  const rankingId = parsePositiveInt(id);

  if (!rankingId) {
    return NextResponse.json({ error: "Invalid ranking id" }, { status: 400 });
  }

  const body = await request.json();
  const parsedBody = updateRankingSchema.safeParse(body);

  if (!parsedBody.success) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const { name, description, is_default } = parsedBody.data;

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
  const rankingId = parsePositiveInt(id);

  if (!rankingId) {
    return NextResponse.json({ error: "Invalid ranking id" }, { status: 400 });
  }

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

    // Check for active (non-deleted) data in the circuit
    // Check general ranking entries not soft-deleted
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

    // Check stages not soft-deleted
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

    // If there is active data, prevent deletion
    if (activeGeneralEntries.length > 0 || activeStages.length > 0) {
      return NextResponse.json(
        { 
          error: "Non è possibile cancellare un circuito contenente dei dati. Rimuovi prima tutte le tappe e i dati della classifica generale.",
          hasActiveData: true,
        },
        { status: 400 }
      );
    }

    // Perform soft delete on the ranking
    await db
      .update(rankings)
      .set({ deletedAt: new Date() })
      .where(eq(rankings.id, rankingId));

    // Also soft delete any remaining data (even if already soft-deleted, we can update their deletedAt if null)
    await db
      .update(generalRanking)
      .set({ deletedAt: new Date() })
      .where(
        and(
          eq(generalRanking.rankingId, rankingId),
          isNull(generalRanking.deletedAt)
        )
      );

    await db
      .update(stages)
      .set({ deletedAt: new Date() })
      .where(
        and(
          eq(stages.rankingId, rankingId),
          isNull(stages.deletedAt)
        )
      );

    return NextResponse.json({
      success: true,
      message: "Ranking spostato nel cestino",
    });
  } catch (error) {
    console.error("Error deleting ranking:", error);
    return NextResponse.json(
      { error: "Failed to delete ranking" },
      { status: 500 }
    );
  }
}
