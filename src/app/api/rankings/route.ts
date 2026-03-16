import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { rankings } from "@/lib/db/schema";
import { eq, desc, asc } from "drizzle-orm";
import { z } from "zod";

const createRankingSchema = z.object({
  name: z.string().trim().min(1),
  description: z.string().nullable().optional(),
  is_default: z.boolean().optional(),
});

export async function GET() {
  try {
    const rows = await db
      .select()
      .from(rankings)
      .orderBy(desc(rankings.isDefault), asc(rankings.name));
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
    const parsed = createRankingSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid payload" },
        { status: 400 }
      );
    }

    const { name, description, is_default } = parsed.data;

    const result = await db.transaction(async (tx) => {
      // If this is set as default, remove default from other rankings
      if (is_default) {
        await tx
          .update(rankings)
          .set({ isDefault: false })
          .where(eq(rankings.isDefault, true));
      }

      const [inserted] = await tx
        .insert(rankings)
        .values({
          name: name.trim(),
          description: description?.trim() || null,
          isDefault: !!is_default,
        })
        .returning();

      return inserted;
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("Error creating ranking:", error);
    return NextResponse.json(
      { error: "Failed to create ranking" },
      { status: 500 }
    );
  }
}
