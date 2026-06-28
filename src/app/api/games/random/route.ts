import { NextResponse } from "next/server";
import { auth } from "@/auth/auth";
import { prisma } from "@/lib/prisma";

// Bias toward popularity by sampling randomly from the N most-rated
// candidates, rather than a uniform random pick across the whole table.
const POPULARITY_POOL_SIZE = 20;

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = session.user.id;

  const [ratedGames, library] = await Promise.all([
    prisma.rating.findMany({ where: { userId }, select: { gameId: true } }),
    prisma.steamLibraryLink.findUnique({
      where: { userId },
      include: { ownedGames: { where: { gameId: { not: null } }, select: { gameId: true } } },
    }),
  ]);

  const ratedGameIds = ratedGames.map((r) => r.gameId);
  const ownedGameIds = (library?.ownedGames.map((og) => og.gameId).filter(Boolean) ?? []) as string[];
  const unratedOwnedIds = ownedGameIds.filter((id) => !ratedGameIds.includes(id));

  // Prefer surfacing something from the user's own library if they have
  // unrated games there; otherwise fall back to popular games in general.
  const idFilter = unratedOwnedIds.length > 0 ? { in: unratedOwnedIds } : { notIn: ratedGameIds };

  const candidates = await prisma.game.findMany({
    where: { id: idFilter },
    orderBy: { ratings: { _count: "desc" } },
    take: POPULARITY_POOL_SIZE,
    select: { id: true, title: true, headerImage: true },
  });

  if (candidates.length === 0) {
    return NextResponse.json({ game: null });
  }

  const game = candidates[Math.floor(Math.random() * candidates.length)];
  return NextResponse.json({ game });
}
