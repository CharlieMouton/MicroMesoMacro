import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth/auth";
import { prisma } from "@/lib/prisma";
import { peekAnonUserId } from "@/lib/anon-user";

// Bias toward popularity by sampling randomly within a tier of most-rated
// candidates, rather than a uniform random pick across the whole table.
// The first tier is the most popular 40 games; once those are excluded
// (already seen this session), move to the next 60, then the next 60, etc.,
// so repeat visits widen the pool instead of repeating or running dry early.
const FIRST_TIER_SIZE = 40;
const NEXT_TIER_SIZE = 60;

function tierBounds(tierIndex: number): { skip: number; take: number } {
  if (tierIndex === 0) return { skip: 0, take: FIRST_TIER_SIZE };
  return { skip: FIRST_TIER_SIZE + (tierIndex - 1) * NEXT_TIER_SIZE, take: NEXT_TIER_SIZE };
}

export async function GET(request: NextRequest) {
  const session = await auth();
  const userId = session?.user?.id ?? (await peekAnonUserId());

  // Games already shown this session (passed by the client) so skipping
  // doesn't just re-roll the same small popularity pool over and over.
  const excludeIds = request.nextUrl.searchParams.getAll("exclude");

  // Anonymous visitors can still get a (less personalized) suggestion —
  // they just don't have a rated/owned-games history to bias against.
  const [ratedGames, library] = userId
    ? await Promise.all([
        prisma.rating.findMany({ where: { userId }, select: { gameId: true } }),
        prisma.steamLibraryLink.findUnique({
          where: { userId },
          include: { ownedGames: { where: { gameId: { not: null } }, select: { gameId: true } } },
        }),
      ])
    : [[], null];

  const ratedGameIds = ratedGames.map((r) => r.gameId);
  const ownedGameIds = (library?.ownedGames.map((og) => og.gameId).filter(Boolean) ?? []) as string[];
  const unratedOwnedIds = ownedGameIds.filter((id) => !ratedGameIds.includes(id));

  // Prefer surfacing something from the user's own library if they have
  // unrated games there; otherwise fall back to popular games in general.
  // This filter intentionally does NOT subtract excludeIds — that's applied
  // per-tier below, so tier boundaries stay fixed (ranks 1-40, 41-100, ...)
  // instead of shifting as games get excluded.
  const idFilter = unratedOwnedIds.length > 0 ? { in: unratedOwnedIds } : { notIn: ratedGameIds };

  // Walk tiers of decreasing popularity, picking randomly among the
  // not-yet-seen games within each, until one has a candidate or the
  // catalog runs out.
  for (let tierIndex = 0; ; tierIndex++) {
    const { skip, take } = tierBounds(tierIndex);
    const tier = await prisma.game.findMany({
      where: { id: idFilter },
      orderBy: { ratings: { _count: "desc" } },
      skip,
      take,
      select: { id: true, title: true, headerImage: true },
    });
    if (tier.length === 0) {
      return NextResponse.json({ game: null });
    }
    const unseen = tier.filter((g) => !excludeIds.includes(g.id));
    if (unseen.length > 0) {
      const game = unseen[Math.floor(Math.random() * unseen.length)];
      return NextResponse.json({ game });
    }
    if (tier.length < take) {
      // Reached the end of the catalog with nothing unseen left.
      return NextResponse.json({ game: null });
    }
  }
}
