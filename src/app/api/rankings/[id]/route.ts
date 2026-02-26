import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import pool from "@/lib/db";
import { RowDataPacket } from "mysql2";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    const [rows] = await pool.execute<RowDataPacket[]>(
      "SELECT * FROM rankings WHERE id = ?",
      [id]
    );

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
  const body = await request.json();
  const { name, description, is_default } = body;

  try {
    const [existing] = await pool.execute<RowDataPacket[]>(
      "SELECT * FROM rankings WHERE id = ?",
      [id]
    );

    if (existing.length === 0) {
      return NextResponse.json({ error: "Ranking not found" }, { status: 404 });
    }

    const connection = await pool.getConnection();
    await connection.beginTransaction();

    try {
      // If this is set as default, remove default from other rankings
      if (is_default) {
        await connection.execute(
          "UPDATE rankings SET is_default = 0 WHERE is_default = 1 AND id != ?",
          [id]
        );
      }

      await connection.execute(
        "UPDATE rankings SET name = ?, description = ?, is_default = ?, updated_at = NOW() WHERE id = ?",
        [name?.trim(), description?.trim() || null, is_default ? 1 : 0, id]
      );

      await connection.commit();
      connection.release();

      return NextResponse.json({ success: true });
    } catch (error) {
      await connection.rollback();
      connection.release();
      throw error;
    }
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

  try {
    const [existing] = await pool.execute<RowDataPacket[]>(
      "SELECT * FROM rankings WHERE id = ?",
      [id]
    );

    if (existing.length === 0) {
      return NextResponse.json({ error: "Ranking not found" }, { status: 404 });
    }

    if (existing[0].is_default) {
      return NextResponse.json(
        { error: "Cannot delete the default ranking" },
        { status: 400 }
      );
    }

    const connection = await pool.getConnection();
    await connection.beginTransaction();

    try {
      // Delete all general ranking entries for this ranking
      await connection.execute(
        "DELETE FROM general_ranking WHERE ranking_id = ?",
        [id]
      );

      // Set ranking_id to NULL for stages linked to this ranking
      await connection.execute(
        "UPDATE stages SET ranking_id = NULL WHERE ranking_id = ?",
        [id]
      );

      // Delete the ranking
      await connection.execute("DELETE FROM rankings WHERE id = ?", [id]);

      await connection.commit();
      connection.release();

      return NextResponse.json({
        success: true,
        message: "Ranking deleted successfully",
      });
    } catch (error) {
      await connection.rollback();
      connection.release();
      throw error;
    }
  } catch (error) {
    console.error("Error deleting ranking:", error);
    return NextResponse.json(
      { error: "Failed to delete ranking" },
      { status: 500 }
    );
  }
}
