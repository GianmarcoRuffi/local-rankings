import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import pool from "@/lib/db";
import { RowDataPacket, ResultSetHeader } from "mysql2";

export async function GET() {
  try {
    const [rows] = await pool.execute<RowDataPacket[]>(
      "SELECT * FROM rankings ORDER BY is_default DESC, name ASC"
    );
    return NextResponse.json(rows);
  } catch (error) {
    console.error("Error fetching rankings:", error);
    return NextResponse.json(
      { error: "Failed to fetch rankings" },
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
    const { name, description, is_default } = body;

    if (!name || !name.trim()) {
      return NextResponse.json(
        { error: "Name is required" },
        { status: 400 }
      );
    }

    const connection = await pool.getConnection();
    await connection.beginTransaction();

    try {
      // If this is set as default, remove default from other rankings
      if (is_default) {
        await connection.execute(
          "UPDATE rankings SET is_default = 0 WHERE is_default = 1"
        );
      }

      const [result] = await connection.execute<ResultSetHeader>(
        "INSERT INTO rankings (name, description, is_default) VALUES (?, ?, ?)",
        [name.trim(), description?.trim() || null, is_default ? 1 : 0]
      );

      await connection.commit();
      connection.release();

      return NextResponse.json({
        id: result.insertId,
        name: name.trim(),
        description: description?.trim() || null,
        is_default: !!is_default,
      });
    } catch (error) {
      await connection.rollback();
      connection.release();
      throw error;
    }
  } catch (error) {
    console.error("Error creating ranking:", error);
    return NextResponse.json(
      { error: "Failed to create ranking" },
      { status: 500 }
    );
  }
}
