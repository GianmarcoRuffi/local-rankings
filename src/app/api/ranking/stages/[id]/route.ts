import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { stages, stageRanking } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

function parsePositiveInt(value: string): number | null {
  const parsed = Number.parseInt(value, 10);
  if (Number.isNaN(parsed) || parsed <= 0) {
    return null;
  }

  return parsed;
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
  const stageId = parsePositiveInt(id);

  if (!stageId) {
    return NextResponse.json({ error: "Invalid stage id" }, { status: 400 });
  }

  const body = await request.json();
  const { name, date, ranking_id } = body;

  if (typeof name !== "string" || !name.trim()) {
    return NextResponse.json({ error: "Name is required" }, { status: 400 });
  }

  try {
    const stageRows = await db
      .select({ status: stages.status })
      .from(stages)
      .where(eq(stages.id, stageId))
      .limit(1);

    if (stageRows.length === 0) {
      return NextResponse.json({ error: "Stage not found" }, { status: 404 });
    }

    if (stageRows[0].status !== "active") {
      return NextResponse.json(
        { error: "Impossibile modificare una tappa non attiva" },
        { status: 400 }
      );
    }

    await db
      .update(stages)
      .set({
        name,
        date: date ? new Date(date).toISOString().split('T')[0] : null,
        rankingId: ranking_id ? parseInt(ranking_id) : null,
        updatedAt: new Date(),
      })
      .where(eq(stages.id, stageId));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error updating stage:", error);
    return NextResponse.json({ error: "Failed to update stage" }, { status: 500 });
  }
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const stageId = parsePositiveInt(id);

  if (!stageId) {
    return NextResponse.json({ error: "Invalid stage id" }, { status: 400 });
  }

  try {
    const players = await db
      .select()
      .from(stageRanking)
      .where(eq(stageRanking.stageId, stageId))
      .orderBy(stageRanking.position);
    return NextResponse.json(players);
  } catch (error) {
    console.error("Error fetching stage ranking:", error);
    return NextResponse.json(
      { error: "Failed to fetch stage ranking" },
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
  const stageId = parsePositiveInt(id);

  if (!stageId) {
    return NextResponse.json({ error: "Invalid stage id" }, { status: 400 });
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

    // Soft delete della tappa
    await db
      .update(stages)
      .set({ deletedAt: new Date() })
      .where(eq(stages.id, stageId));

    return NextResponse.json({ success: true, message: "Tappa spostata nel cestino" });
  } catch (error) {
    console.error("Error deleting stage:", error);
    return NextResponse.json({ error: "Failed to delete stage" }, { status: 500 });
  }
}