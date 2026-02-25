import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import pool from "@/lib/db";
import { RowDataPacket } from "mysql2";
import { sortRanking } from "@/lib/ranking-logic";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const body = await request.json();
  const { name, total_points, t1, presenze } = body;

  try {
    await pool.execute(
      "UPDATE general_ranking SET name = ?, total_points = ?, t1 = ?, presenze = ?, updated_at = NOW() WHERE id = ?",
      [name, total_points, t1, presenze, id]
    );

    const [allPlayers] = await pool.execute<RowDataPacket[]>(
      "SELECT id, total_points, t1 FROM general_ranking"
    );

    const sorted = sortRanking(
      allPlayers.map((p) => ({
        id: p.id,
        total_points: p.total_points,
        t1: p.t1 || 0,
      }))
    );

    const connection = await pool.getConnection();
    await connection.beginTransaction();
    try {
      for (let i = 0; i < sorted.length; i++) {
        await connection.execute(
          "UPDATE general_ranking SET position = ? WHERE id = ?",
          [i + 1, sorted[i].id]
        );
      }
      await connection.commit();
      connection.release();
    } catch (err) {
      await connection.rollback();
      connection.release();
      throw err;
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error updating general ranking player:", error);
    return NextResponse.json({ error: "Failed to update player" }, { status: 500 });
  }
}
