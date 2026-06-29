import { prisma } from "@/lib/prisma";
import { getOwnedGames } from "@/lib/steam";
import { getGamesByIgdbIds, igdbImageUrl, IGDB_CATEGORY, resolveBySteamAppIds, type IgdbGame } from "@/lib/igdb";

// DLC and expansions get collapsed into their base game so the library
// shows one entry per game owned, not one per add-on. Standalone
// expansions are deliberately excluded — those are sold and played as
// their own game, so they stay as separate library entries.
const COLLAPSIBLE_CATEGORIES: ReadonlySet<number> = new Set([
  IGDB_CATEGORY.DLC_ADDON,
  IGDB_CATEGORY.EXPANSION,
]);

// Walks parent_game links (DLC -> base game) up to the first non-collapsible
// ancestor. Stops on a cycle or a missing parent rather than throwing, since
// a metadata gap here shouldn't fail the whole sync.
function resolveBaseGame(igdbGame: IgdbGame, gamesById: Map<number, IgdbGame>): IgdbGame {
  let current = igdbGame;
  const seen = new Set<number>([current.id]);
  while (
    current.parent_game !== undefined &&
    current.category !== undefined &&
    COLLAPSIBLE_CATEGORIES.has(current.category) &&
    !seen.has(current.parent_game)
  ) {
    const parent = gamesById.get(current.parent_game);
    if (!parent) break;
    seen.add(parent.id);
    current = parent;
  }
  return current;
}

async function logBatch(
  operation: "resolve_appids" | "fetch_games" | "fetch_parent_games",
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

    // DLC/expansions reference their base game via parent_game, which may
    // not be one of the ids we just fetched (the base game might not be a
    // separate Steam appid in this library at all). Fetch any missing
    // parents so resolveBaseGame can walk up to them.
    const missingParentIds = [...new Set(
      [...igdbGamesById.values()]
        .filter((g) => g.parent_game !== undefined && g.category !== undefined && COLLAPSIBLE_CATEGORIES.has(g.category))
        .map((g) => g.parent_game!)
        .filter((id) => !igdbGamesById.has(id))
    )];
    if (missingParentIds.length > 0) {
      const { games: parentGames, failedChunks: parentFailedChunks } =
        await getGamesByIgdbIds(missingParentIds);
      await logBatch("fetch_parent_games", missingParentIds.length, parentGames.size, parentFailedChunks);
      for (const [id, g] of parentGames) igdbGamesById.set(id, g);
    }

    // Two Steam appids (e.g. a base game + a demo, or a regional SKU) can
    // resolve to the same IGDB game. Reuse the existing Game row in that
    // case instead of creating a second one — `Game.igdbId` is unique, so
    // a second create() would throw and fail the whole sync.
    const newGameByAppId = new Map<number, { id: string; steamAppId: number | null }>();
    const gameByIgdbId = new Map<number, { id: string; steamAppId: number | null }>();
    for (const appid of newAppIds) {
      const igdbId = appIdToIgdbId.get(appid);
      const resolvedGame = igdbId ? igdbGamesById.get(igdbId) : undefined;
      const igdbGame = resolvedGame ? resolveBaseGame(resolvedGame, igdbGamesById) : undefined;
      const owned = ownedGames.find((g) => g.appid === appid)!;

      let game = igdbGame ? gameByIgdbId.get(igdbGame.id) : undefined;
      if (!game && igdbGame) {
        game = (await prisma.game.findUnique({ where: { igdbId: igdbGame.id } })) ?? undefined;
      }
      if (!game) {
        game = await prisma.game.create({
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
      }
      if (igdbGame) gameByIgdbId.set(igdbGame.id, game);
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
