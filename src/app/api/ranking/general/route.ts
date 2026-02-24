import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import pool from "@/lib/db";
import { RowDataPacket } from "mysql2";
import { sortRanking } from "@/lib/ranking-logic";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const [rows] = await pool.execute<RowDataPacket[]>(
      "SELECT * FROM general_ranking"
    );

    // Ordina usando il comparatore personalizzato
    const sorted = sortRanking(
      rows.map((row) => ({
        ...row,
        total_points: row.total_points ?? 0,
        t1: row.t1 ?? 0,
      }))
    );

    // Aggiungi la posizione
    const ranked = sorted.map((row, index) => ({
      ...row,
      position: index + 1,
    }));

    return NextResponse.json(ranked);
  } catch (error) {
    console.error("Error fetching general ranking:", error);
    return NextResponse.json(
      { error: "Failed to fetch ranking" },
      { status: 500 }
    );
  }
}
