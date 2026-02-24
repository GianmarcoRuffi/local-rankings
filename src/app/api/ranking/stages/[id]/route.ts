import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import pool from "@/lib/db";
import { RowDataPacket } from "mysql2";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  try {
    const [players] = await pool.execute<RowDataPacket[]>(
      "SELECT * FROM stage_ranking WHERE stage_id = ? ORDER BY position ASC",
      [id]
    );
    return NextResponse.json(players);
  } catch (error) {
    console.error("Error fetching stage ranking:", error);
    return NextResponse.json(
      { error: "Failed to fetch stage ranking" },
      { status: 500 }
    );
  }
}
