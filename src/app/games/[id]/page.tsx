import { RatingForm } from "./rating-form";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth/auth";
import { notFound } from "next/navigation";

export default async function GamePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await auth();

  const game = await prisma.game.findUnique({ where: { id } });
  if (!game) notFound();

  const [aggregate, ownRating] = await Promise.all([
    prisma.rating.aggregate({
      where: { gameId: id },
      _avg: { micro: true, meso: true, macro: true },
    }),
    session?.user?.id
      ? prisma.rating.findUnique({
          where: { userId_gameId: { userId: session.user.id, gameId: id } },
        })
      : null,
  ]);

  return (
    <main style={{ padding: 24 }}>
      <h1>{game.title}</h1>
      {game.description && <p>{game.description}</p>}

      <h2>Crowd average</h2>
      <p>
        Micro: {aggregate._avg.micro?.toFixed(1) ?? "—"} · Meso: {aggregate._avg.meso?.toFixed(1) ?? "—"} · Macro:{" "}
        {aggregate._avg.macro?.toFixed(1) ?? "—"}
      </p>

      <RatingForm
        gameId={game.id}
        initial={
          ownRating
            ? { micro: ownRating.micro, meso: ownRating.meso, macro: ownRating.macro }
            : { micro: 50, meso: 50, macro: 50 }
        }
        crowdAverage={{
          micro: aggregate._avg.micro,
          meso: aggregate._avg.meso,
          macro: aggregate._avg.macro,
        }}
      />
    </main>
  );
}
