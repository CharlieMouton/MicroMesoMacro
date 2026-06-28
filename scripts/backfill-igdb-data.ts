/**
 * One-off backfill for Game rows created before the IGDB resolution fix
 * (external_games.category was deprecated/unset; the working filter is
 * external_game_source = 1 for Steam). Re-resolves igdbId/headerImage/
 * description for any Game with a steamAppId but no igdbId yet.
 *
 * Run with: npx tsx scripts/backfill-igdb-data.ts
 */
import { prisma } from "@/lib/prisma";
import { getGameByIgdbId, igdbImageUrl, resolveBySteamAppId } from "@/lib/igdb";

async function main() {
  const games = await prisma.game.findMany({
    where: { igdbId: null, steamAppId: { not: null } },
  });

  console.log(`Backfilling ${games.length} games...`);

  let updated = 0;
  for (const game of games) {
    const igdbId = await resolveBySteamAppId(game.steamAppId!);
    const igdbGame = igdbId ? await getGameByIgdbId(igdbId) : null;

    if (!igdbGame) {
      console.log(`  skip (no IGDB match): ${game.title}`);
      continue;
    }

    await prisma.game.update({
      where: { id: game.id },
      data: {
        igdbId: igdbGame.id,
        title: igdbGame.name,
        description: igdbGame.summary,
        headerImage: igdbGame.cover?.image_id ? igdbImageUrl(igdbGame.cover.image_id, "t_cover_big") : undefined,
        metadata: JSON.parse(JSON.stringify(igdbGame)),
      },
    });
    updated++;
    console.log(`  updated: ${igdbGame.name}`);

    // IGDB enforces 4 req/sec; this backfill does 2 requests per game.
    await new Promise((r) => setTimeout(r, 600));
  }

  console.log(`Done. Updated ${updated}/${games.length}.`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
