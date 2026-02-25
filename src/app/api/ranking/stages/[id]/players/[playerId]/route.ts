import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import pool from "@/lib/db";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string; playerId: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { playerId } = await params;
  const body = await request.json();
  const { name, points_awarded, t1, presenze } = body;

  try {
    await pool.execute(
      "UPDATE stage_ranking SET name = ?, points_awarded = ?, t1 = ?, presenze = ? WHERE id = ?",
      [name, points_awarded, t1, presenze, playerId]
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error updating stage ranking player:", error);
    return NextResponse.json({ error: "Failed to update player" }, { status: 500 });
  }
}
