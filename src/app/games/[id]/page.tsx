import Link from "next/link";
import Image from "next/image";
import { RatingForm } from "./rating-form";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth/auth";
import { peekAnonUserId } from "@/lib/anon-user";
import { notFound } from "next/navigation";

export default async function GamePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await auth();
  const userId = session?.user?.id ?? (await peekAnonUserId());

  const game = await prisma.game.findUnique({ where: { id } });
  if (!game) notFound();

  const [aggregate, ratingCount, ownRating] = await Promise.all([
    prisma.rating.aggregate({
      where: { gameId: id },
      _avg: { micro: true, meso: true, macro: true },
    }),
    prisma.rating.count({ where: { gameId: id } }),
    userId
      ? prisma.rating.findUnique({
          where: { userId_gameId: { userId, gameId: id } },
        })
      : null,
  ]);

  return (
    <main style={{ maxWidth: 860, margin: "0 auto", padding: "34px 40px 80px" }}>
      <Link
        href="/library"
        style={{
          fontSize: 12,
          letterSpacing: ".1em",
          fontWeight: 700,
          color: "var(--text-dim)",
        }}
      >
        ← LIBRARY
      </Link>

      <div style={{ display: "flex", gap: 18, marginTop: 22, alignItems: "center" }}>
        <div
          style={{
            width: 72,
            height: 72,
            borderRadius: 6,
            flex: "none",
            position: "relative",
            overflow: "hidden",
            background: "linear-gradient(135deg, var(--micro-dim) -20%, #0e0e14 65%)",
          }}
        >
          {game.headerImage && (
            <Image src={game.headerImage} alt="" fill sizes="72px" style={{ objectFit: "cover" }} />
          )}
        </div>
        <div>
          <h2 style={{ fontSize: 26, fontWeight: 800, letterSpacing: "-.02em" }}>{game.title}</h2>
          {game.description && (
            <div style={{ fontSize: 12, color: "var(--text-dim)", marginTop: 6, maxWidth: 500 }}>
              {game.description}
            </div>
          )}
        </div>
      </div>

      <RatingForm
        gameId={game.id}
        initial={
          ownRating
            ? { micro: ownRating.micro, meso: ownRating.meso, macro: ownRating.macro }
            : { micro: 50, meso: 50, macro: 50 }
        }
        // Crowd ratings stay hidden until the viewer has rated this game
        // themselves — submitting unlocks it via a follow-up fetch.
        crowdAverage={
          ownRating
            ? {
                micro: aggregate._avg.micro,
                meso: aggregate._avg.meso,
                macro: aggregate._avg.macro,
                ratingCount,
              }
            : null
        }
        alreadyRated={!!ownRating}
      />
    </main>
  );
}
