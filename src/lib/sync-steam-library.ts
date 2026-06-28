import { prisma } from "@/lib/prisma";
import { getOwnedGames } from "@/lib/steam";
import { getGameByIgdbId, resolveBySteamAppId } from "@/lib/igdb";

// IGDB enforces 4 req/sec; resolving + fetching a new game costs 2 requests,
// so cap how many unresolved appids we look up per sync call.
const MAX_NEW_GAMES_PER_SYNC = 20;

export async function syncSteamLibrary(userId: string, steamId: string) {
  const library = await prisma.steamLibraryLink.upsert({
    where: { userId },
    update: { syncStatus: "syncing", syncError: null },
    create: { userId, steamId, syncStatus: "syncing" },
  });

  try {
    const ownedGames = await getOwnedGames(steamId);

    let newGamesResolved = 0;
    for (const owned of ownedGames) {
      let game = await prisma.game.findUnique({ where: { steamAppId: owned.appid } });

      if (!game && newGamesResolved < MAX_NEW_GAMES_PER_SYNC) {
        newGamesResolved++;
        const igdbId = await resolveBySteamAppId(owned.appid);
        const igdbGame = igdbId ? await getGameByIgdbId(igdbId) : null;

        game = await prisma.game.create({
          data: {
            steamAppId: owned.appid,
            igdbId: igdbGame?.id,
            slug: `steam-${owned.appid}`,
            title: igdbGame?.name ?? owned.name,
            description: igdbGame?.summary,
            headerImage: igdbGame?.cover?.url,
            metadata: igdbGame ? JSON.parse(JSON.stringify(igdbGame)) : undefined,
          },
        });
      }

      await prisma.ownedGame.upsert({
        where: { libraryId_steamAppId: { libraryId: library.id, steamAppId: owned.appid } },
        update: { playtimeMins: owned.playtime_forever, gameId: game?.id },
        create: {
          libraryId: library.id,
          steamAppId: owned.appid,
          playtimeMins: owned.playtime_forever,
          gameId: game?.id,
        },
      });
    }

    await prisma.steamLibraryLink.update({
      where: { id: library.id },
      data: { syncStatus: "idle", lastSyncAt: new Date() },
    });

    return { ok: true as const, gamesSynced: ownedGames.length };
  } catch (err) {
    await prisma.steamLibraryLink.update({
      where: { id: library.id },
      data: { syncStatus: "error", syncError: String(err) },
    });
    return { ok: false as const, error: String(err) };
  }
}
