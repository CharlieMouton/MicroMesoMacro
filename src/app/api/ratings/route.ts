import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth/auth";
import { prisma } from "@/lib/prisma";
import { ratingInputSchema } from "@/lib/validation";
import { getOrCreateAnonUserId } from "@/lib/anon-user";

export async function POST(request: NextRequest) {
  const session = await auth();
  // Anonymous visitors can still rate — they get a cookie-backed guest
  // identity instead of a real Steam-linked account.
  const userId = session?.user?.id ?? (await getOrCreateAnonUserId());

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = ratingInputSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { gameId, micro, meso, macro } = parsed.data;

  const game = await prisma.game.findUnique({ where: { id: gameId }, select: { id: true } });
  if (!game) {
    return NextResponse.json({ error: "Game not found" }, { status: 404 });
  }

  const rating = await prisma.rating.upsert({
    where: { userId_gameId: { userId, gameId } },
    update: { micro, meso, macro },
    create: { userId, gameId, micro, meso, macro },
  });

  return NextResponse.json(rating);
}
