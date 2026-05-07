import { NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import { generalRankingQuerySchema } from "@/lib/validations";
import { getCachedGeneralRanking } from "@/lib/cache";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);

    // Valida i parametri query
    const validation = generalRankingQuerySchema.safeParse({
      rankingId: searchParams.get("rankingId"),
      page: searchParams.get("page"),
      limit: searchParams.get("limit"),
    });

    if (!validation.success) {
      const firstError = validation.error.issues[0];
      return NextResponse.json(
        { error: firstError?.message || "Parametri non validi" },
        { status: 400 },
      );
    }

    const { rankingId, page, limit } = validation.data;
    const offset = (page - 1) * limit;

    // Usa la funzione cached
    const ranked = await getCachedGeneralRanking(rankingId);

    const total = ranked.length;
    const paginatedRanked = ranked.slice(offset, offset + limit);

    return NextResponse.json({
      data: paginatedRanked,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    logger.error("Failed to fetch general ranking", { error });
    return NextResponse.json(
      { error: "Failed to fetch ranking" },
      { status: 500 },
    );
  }
}
