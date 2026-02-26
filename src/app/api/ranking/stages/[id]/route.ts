import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import pool from "@/lib/db";
import { RowDataPacket } from "mysql2";

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const body = await request.json();
  const { name, date } = body;

  try {
    const [stageRows] = await pool.execute<RowDataPacket[]>(
      "SELECT status FROM stages WHERE id = ?",
      [id]
    );

    if (stageRows.length === 0) {
      return NextResponse.json({ error: "Stage not found" }, { status: 404 });
    }

    if (stageRows[0].status !== "active") {
      return NextResponse.json(
        { error: "Impossibile modificare una tappa non attiva" },
        { status: 400 }
      );
    }

    await pool.execute(
      "UPDATE stages SET name = ?, date = ? WHERE id = ?",
      [name, date || null, id]
    );

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

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  try {
    const [stageRows] = await pool.execute<RowDataPacket[]>(
      "SELECT * FROM stages WHERE id = ?",
      [id]
    );

    if (stageRows.length === 0) {
      return NextResponse.json({ error: "Stage not found" }, { status: 404 });
    }

    const connection = await pool.getConnection();
    await connection.beginTransaction();
    try {
      await connection.execute("DELETE FROM stage_ranking WHERE stage_id = ?", [id]);
      await connection.execute("DELETE FROM stages WHERE id = ?", [id]);
      await connection.commit();
      connection.release();
    } catch (err) {
      await connection.rollback();
      connection.release();
      throw err;
    }

    return NextResponse.json({ success: true, message: "Tappa eliminata" });
  } catch (error) {
    console.error("Error deleting stage:", error);
    return NextResponse.json({ error: "Failed to delete stage" }, { status: 500 });
  }
}
