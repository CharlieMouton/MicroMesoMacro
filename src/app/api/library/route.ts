import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth/auth";
import { prisma } from "@/lib/prisma";

const PAGE_SIZE = 50;

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = session.user.id;

  const params = request.nextUrl.searchParams;
  const sort = params.get("sort") ?? "hours";
  const cursor = params.get("cursor") ? parseInt(params.get("cursor")!) : 0;

  const library = await prisma.steamLibraryLink.findUnique({
    where: { userId },
    select: { id: true },
  });
  if (!library) {
    return NextResponse.json({ rows: [], nextCursor: null, total: 0 });
  }

  // Fetch all owned game records with game metadata in one query.
  // This is ~100KB for 500 games and cheap compared to N+1 rating queries.
  const allOwned = await prisma.ownedGame.findMany({
    where: { libraryId: library.id, gameId: { not: null } },
    select: {
      gameId: true,
      playtimeMins: true,
      game: { select: { id: true, title: true, headerImage: true, steamAppId: true } },
    },
  });

  const valid = allOwned.filter((og) => og.game);

  // Sort in JS to avoid Prisma optional-relation orderBy limitations
  if (sort === "alpha") {
    valid.sort((a, b) => a.game!.title.localeCompare(b.game!.title));
  } else {
    valid.sort((a, b) => (b.playtimeMins ?? 0) - (a.playtimeMins ?? 0));
  }

  const total = valid.length;
  const page = valid.slice(cursor, cursor + PAGE_SIZE);
  const gameIds = page.map((og) => og.gameId!);

  // Batch fetch all ratings and aggregates for this page at once — no N+1
  const [ownRatings, aggregates] = await Promise.all([
    prisma.rating.findMany({
      where: { userId, gameId: { in: gameIds } },
      select: { gameId: true, micro: true, meso: true, macro: true },
    }),
    prisma.rating.groupBy({
      by: ["gameId"],
      where: { gameId: { in: gameIds } },
      _avg: { micro: true, meso: true, macro: true },
    }),
  ]);

  const ownRatingMap = new Map(ownRatings.map((r) => [r.gameId, r]));
  const aggregateMap = new Map(aggregates.map((a) => [a.gameId, a._avg]));

  const rows = page.map((og) => ({
    game: og.game!,
    playtimeMins: og.playtimeMins ?? 0,
    ownRating: ownRatingMap.get(og.gameId!) ?? null,
    crowd: aggregateMap.get(og.gameId!) ?? { micro: null, meso: null, macro: null },
  }));

  const nextCursor = cursor + page.length < total ? cursor + PAGE_SIZE : null;

  return NextResponse.json({ rows, nextCursor, total });
}
