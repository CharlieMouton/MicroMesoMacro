import { NextResponse } from "next/server";
import { auth } from "@/auth/auth";
import { prisma } from "@/lib/prisma";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = await auth();

  const game = await prisma.game.findUnique({ where: { id } });
  if (!game) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const [aggregate, count, ownRating] = await Promise.all([
    prisma.rating.aggregate({
      where: { gameId: id },
      _avg: { micro: true, meso: true, macro: true },
    }),
    prisma.rating.count({ where: { gameId: id } }),
    session?.user?.id
      ? prisma.rating.findUnique({
          where: { userId_gameId: { userId: session.user.id, gameId: id } },
        })
      : null,
  ]);

  // Crowd ratings stay hidden from anyone who hasn't rated this game
  // themselves yet, to encourage rating before peeking at the consensus.
  const canSeeCrowd = !!ownRating;

  return NextResponse.json({
    game,
    crowdAverage: {
      micro: canSeeCrowd ? aggregate._avg.micro ?? null : null,
      meso: canSeeCrowd ? aggregate._avg.meso ?? null : null,
      macro: canSeeCrowd ? aggregate._avg.macro ?? null : null,
      ratingCount: count,
    },
    ownRating,
  });
}
