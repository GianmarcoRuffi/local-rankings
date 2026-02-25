import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import pool from "@/lib/db";
import { RowDataPacket } from "mysql2";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const [rows] = await pool.execute<RowDataPacket[]>(
      "SELECT * FROM stages ORDER BY created_at DESC"
    );
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
    const { name, date, players } = body;

    const [result] = await pool.execute(
      "INSERT INTO stages (name, date, status) VALUES (?, ?, 'active')",
      [name, date || null]
    );

    const insertResult = result as { insertId: number };
    const stageId = insertResult.insertId;

    // If players are provided, insert them
    if (players && Array.isArray(players) && players.length > 0) {
      for (const player of players) {
        await pool.execute(
          "INSERT INTO stage_ranking (stage_id, position, name, score, points_awarded, t1, presenze) VALUES (?, ?, ?, ?, ?, ?, ?)",
          [
            stageId,
            player.position,
            player.name,
            player.score ?? null,
            player.points_awarded,
            player.t1 ?? 0,
            player.presenze ?? 1,
          ]
        );
      }
    }

    return NextResponse.json({ 
      id: stageId, 
      name, 
      date,
      playersCount: players?.length ?? 0
    });
  } catch (error) {
    console.error("Error creating stage:", error);
    return NextResponse.json(
      { error: "Failed to create stage" },
      { status: 500 }
    );
  }
}
