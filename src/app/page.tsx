import Link from "next/link";
import { auth } from "@/auth/auth";
import { prisma } from "@/lib/prisma";

export default async function HomePage() {
  const session = await auth();

  if (!session?.user?.id) {
    return (
      <main style={{ padding: 24 }}>
        <h1>MicroMesoMacro</h1>
        <p>Rate games on Micro (execution), Meso (reading), and Macro (strategy).</p>
        {/* eslint-disable-next-line @next/next/no-html-link-for-pages -- full navigation into a route handler, not a page */}
        <a href="/api/auth/steam">Connect Steam Library</a>
      </main>
    );
  }

  const library = await prisma.steamLibraryLink.findUnique({
    where: { userId: session.user.id },
    include: { ownedGames: { include: { game: true } } },
  });

  if (!library) {
    return (
      <main style={{ padding: 24 }}>
        <h1>MicroMesoMacro</h1>
        <p>No Steam library linked yet.</p>
        {/* eslint-disable-next-line @next/next/no-html-link-for-pages -- full navigation into a route handler, not a page */}
        <a href="/api/auth/steam">Connect Steam Library</a>
      </main>
    );
  }

  const games = library.ownedGames.filter((og) => og.game);

  const rows = await Promise.all(
    games.map(async (owned) => {
      const game = owned.game!;
      const [aggregate, ownRating] = await Promise.all([
        prisma.rating.aggregate({
          where: { gameId: game.id },
          _avg: { micro: true, meso: true, macro: true },
        }),
        prisma.rating.findUnique({
          where: { userId_gameId: { userId: session.user.id, gameId: game.id } },
        }),
      ]);
      return { game, crowd: aggregate._avg, ownRating };
    })
  );

  return (
    <main style={{ padding: 24 }}>
      <h1>MicroMesoMacro</h1>
      <form action="/api/steam/sync" method="post">
        <button type="submit">Sync Steam Library</button>
      </form>
      <table>
        <thead>
          <tr>
            <th>Game</th>
            <th>Crowd Micro</th>
            <th>Crowd Meso</th>
            <th>Crowd Macro</th>
            <th>Your Micro</th>
            <th>Your Meso</th>
            <th>Your Macro</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {rows.map(({ game, crowd, ownRating }) => (
            <tr key={game.id}>
              <td>{game.title}</td>
              <td>{crowd.micro?.toFixed(1) ?? "—"}</td>
              <td>{crowd.meso?.toFixed(1) ?? "—"}</td>
              <td>{crowd.macro?.toFixed(1) ?? "—"}</td>
              <td>{ownRating?.micro ?? "—"}</td>
              <td>{ownRating?.meso ?? "—"}</td>
              <td>{ownRating?.macro ?? "—"}</td>
              <td>
                <Link href={`/games/${game.id}`}>{ownRating ? "Update rating" : "Rate"}</Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </main>
  );
}
