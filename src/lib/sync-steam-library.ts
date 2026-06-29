import { prisma } from "@/lib/prisma";
import { getOwnedGames } from "@/lib/steam";
import { getGamesByIgdbIds, igdbImageUrl, resolveBySteamAppIds } from "@/lib/igdb";

async function logBatch(
  operation: "resolve_appids" | "fetch_games",
  requestedIds: number,
  resolvedCount: number,
  failedChunks: number
) {
  await prisma.igdbBatchLog.create({
    data: {
      operation,
      requestedIds,
      resolvedCount,
      ok: failedChunks === 0,
      error: failedChunks > 0 ? `${failedChunks} chunk(s) failed` : null,
    },
  });
}

export async function syncSteamLibrary(userId: string, steamId: string) {
  const library = await prisma.steamLibraryLink.upsert({
    where: { userId },
    update: { syncStatus: "syncing", syncError: null },
    create: { userId, steamId, syncStatus: "syncing" },
  });

  try {
    const ownedGames = await getOwnedGames(steamId);

    const existingGames = await prisma.game.findMany({
      where: { steamAppId: { in: ownedGames.map((g) => g.appid) } },
    });
    const existingByAppId = new Map(existingGames.map((g) => [g.steamAppId!, g]));

    const newAppIds = ownedGames
      .map((g) => g.appid)
      .filter((appid) => !existingByAppId.has(appid));

    const { resolved: appIdToIgdbId, failedChunks: resolveFailedChunks } =
      await resolveBySteamAppIds(newAppIds);
    await logBatch("resolve_appids", newAppIds.length, appIdToIgdbId.size, resolveFailedChunks);

    const igdbIds = [...new Set(appIdToIgdbId.values())];
    const { games: igdbGamesById, failedChunks: fetchFailedChunks } =
      await getGamesByIgdbIds(igdbIds);
    await logBatch("fetch_games", igdbIds.length, igdbGamesById.size, fetchFailedChunks);

    const newGameByAppId = new Map<number, { id: string; steamAppId: number | null }>();
    for (const appid of newAppIds) {
      const igdbId = appIdToIgdbId.get(appid);
      const igdbGame = igdbId ? igdbGamesById.get(igdbId) : undefined;
      const owned = ownedGames.find((g) => g.appid === appid)!;

      const game = await prisma.game.create({
        data: {
          steamAppId: appid,
          igdbId: igdbGame?.id,
          slug: `steam-${appid}`,
          title: igdbGame?.name ?? owned.name,
          description: igdbGame?.summary,
          headerImage: igdbGame?.cover?.image_id
            ? igdbImageUrl(igdbGame.cover.image_id, "t_cover_big")
            : undefined,
          metadata: igdbGame ? JSON.parse(JSON.stringify(igdbGame)) : undefined,
        },
      });
      newGameByAppId.set(appid, game);
    }

    for (const owned of ownedGames) {
      const game = existingByAppId.get(owned.appid) ?? newGameByAppId.get(owned.appid);

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
