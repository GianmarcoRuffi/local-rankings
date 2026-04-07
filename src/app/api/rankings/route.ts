import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/require-auth";
import { db } from "@/lib/db";
import { rankings } from "@/lib/db/schema";
import { eq, desc, asc, isNull } from "drizzle-orm";
import { z } from "zod";
import { logger } from "@/lib/logger";

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
      .where(isNull(rankings.deletedAt))
      .orderBy(desc(rankings.isDefault), asc(rankings.name));
    return NextResponse.json(rows);
  } catch (error) {
    logger.error("Failed to fetch rankings", {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    return NextResponse.json(
      { error: "Failed to fetch rankings" },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireAuth(request);
  if (!auth.authorized) {
    return auth.response;
  }

  try {
    const body = await request.json();
    const parsed = createRankingSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
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
      { status: 500 },
    );
  }
}
