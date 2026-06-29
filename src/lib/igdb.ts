const TWITCH_TOKEN_URL = "https://id.twitch.tv/oauth2/token";
const IGDB_BASE = "https://api.igdb.com/v4";

let cachedToken: { token: string; expiresAt: number } | null = null;

async function getAccessToken(): Promise<string> {
  if (cachedToken && cachedToken.expiresAt > Date.now()) {
    return cachedToken.token;
  }

  const clientId = requireEnv("IGDB_CLIENT_ID");
  const clientSecret = requireEnv("IGDB_CLIENT_SECRET");

  const url = new URL(TWITCH_TOKEN_URL);
  url.searchParams.set("client_id", clientId);
  url.searchParams.set("client_secret", clientSecret);
  url.searchParams.set("grant_type", "client_credentials");

  const res = await fetch(url.toString(), { method: "POST" });
  if (!res.ok) throw new Error(`Twitch token request failed: ${res.status}`);
  const data = await res.json();

  cachedToken = {
    token: data.access_token,
    expiresAt: Date.now() + data.expires_in * 1000 - 60_000,
  };
  return cachedToken.token;
}

// IGDB's 4 req/sec limit is shared across every concurrent user of this
// app, so two people syncing at once can still get a 429 even though each
// sync now only sends a couple of batched requests. A short retry absorbs
// that collision instead of failing the whole sync.
const RATE_LIMIT_RETRIES = 3;
const RATE_LIMIT_BACKOFF_MS = 400;

async function igdbQuery<T>(endpoint: string, body: string): Promise<T> {
  const [token, clientId] = await Promise.all([getAccessToken(), Promise.resolve(requireEnv("IGDB_CLIENT_ID"))]);

  for (let attempt = 0; ; attempt++) {
    const res = await fetch(`${IGDB_BASE}/${endpoint}`, {
      method: "POST",
      headers: {
        "Client-ID": clientId,
        Authorization: `Bearer ${token}`,
        "Content-Type": "text/plain",
      },
      body,
    });
    if (res.ok) return res.json();
    if (res.status === 429 && attempt < RATE_LIMIT_RETRIES) {
      await new Promise((r) => setTimeout(r, RATE_LIMIT_BACKOFF_MS * (attempt + 1)));
      continue;
    }
    throw new Error(`IGDB ${endpoint} request failed: ${res.status}`);
  }
}

// IGDB's `category` enum (https://api-docs.igdb.com/#game-enums). Only the
// values relevant to collapsing DLC/expansions into their base game are
// named here — standalone_expansion is deliberately excluded from any
// "collapsible" set since those are sold/played as their own game.
export const IGDB_CATEGORY = {
  MAIN_GAME: 0,
  DLC_ADDON: 1,
  EXPANSION: 2,
  BUNDLE: 3,
  STANDALONE_EXPANSION: 4,
} as const;

export interface IgdbGame {
  id: number;
  name: string;
  summary?: string;
  cover?: { image_id: string };
  first_release_date?: number;
  genres?: { name: string }[];
  category?: number;
  parent_game?: number;
}

export async function getGameByIgdbId(id: number): Promise<IgdbGame | null> {
  const games = await igdbQuery<IgdbGame[]>(
    "games",
    `fields name,summary,cover.image_id,first_release_date,genres.name,category,parent_game; where id = ${id};`
  );
  return games[0] ?? null;
}

/**
 * Builds a sized IGDB CDN image URL from an image_id. Requesting the right
 * size upfront (rather than the default thumbnail or a full-res original)
 * avoids shipping oversized images to game cards. Size guide:
 * https://api-docs.igdb.com/#images
 */
export function igdbImageUrl(imageId: string, size: "t_cover_big" | "t_cover_small" = "t_cover_big"): string {
  return `https://images.igdb.com/igdb/image/upload/${size}/${imageId}.jpg`;
}

/**
 * Free-text title search, for adding games that don't come through a Steam
 * library sync (console exclusives, etc.). IGDB's relevance ranking is not
 * reliable for well-known titles — fan hacks/ROM mods/joke entries (e.g.
 * "Super Mario Odyssey F.L.U.D.D.", "...64", "...Online") regularly outrank
 * the real game. A wide limit gives callers enough candidates to find an
 * exact name match themselves rather than trusting result order.
 */
export async function searchGamesByName(name: string): Promise<IgdbGame[]> {
  const escaped = name.replace(/"/g, '\\"');
  return igdbQuery<IgdbGame[]>(
    "games",
    `search "${escaped}"; fields name,summary,cover.image_id,first_release_date,genres.name,category,parent_game; limit 20;`
  );
}

/**
 * Maps a Steam appid to an IGDB game id via IGDB's external_games table.
 * external_game_source 1 = Steam. (The older `category` enum field is
 * deprecated/unset on most rows now — filtering on it returns nothing.)
 */
export async function resolveBySteamAppId(appId: number): Promise<number | null> {
  const matches = await igdbQuery<{ game: number }[]>(
    "external_games",
    `fields game; where external_game_source = 1 & uid = "${appId}"; limit 1;`
  );
  return matches[0]?.game ?? null;
}

// IGDB caps `where field = (...)` lists in practice; chunk batched lookups
// so a large library doesn't produce one unbounded query string.
const BATCH_CHUNK_SIZE = 500;

function chunk<T>(items: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}

/**
 * Batched version of resolveBySteamAppId: maps many Steam appids to IGDB
 * game ids in one request per chunk instead of one request per appid.
 * Appids with no IGDB match are simply absent from the returned map.
 */
export async function resolveBySteamAppIds(
  appIds: number[]
): Promise<{ resolved: Map<number, number>; failedChunks: number }> {
  const resolved = new Map<number, number>();
  let failedChunks = 0;

  for (const batch of chunk(appIds, BATCH_CHUNK_SIZE)) {
    try {
      const uidList = batch.map((id) => `"${id}"`).join(",");
      const matches = await igdbQuery<{ uid: string; game: number }[]>(
        "external_games",
        `fields uid,game; where external_game_source = 1 & uid = (${uidList}); limit ${batch.length};`
      );
      for (const match of matches) resolved.set(Number(match.uid), match.game);
    } catch {
      failedChunks++;
    }
  }

  return { resolved, failedChunks };
}

/**
 * Batched version of getGameByIgdbId: fetches many games by id in one
 * request per chunk instead of one request per id.
 */
export async function getGamesByIgdbIds(
  ids: number[]
): Promise<{ games: Map<number, IgdbGame>; failedChunks: number }> {
  const games = new Map<number, IgdbGame>();
  let failedChunks = 0;

  for (const batch of chunk(ids, BATCH_CHUNK_SIZE)) {
    try {
      const idList = batch.join(",");
      const results = await igdbQuery<IgdbGame[]>(
        "games",
        `fields name,summary,cover.image_id,first_release_date,genres.name,category,parent_game; where id = (${idList}); limit ${batch.length};`
      );
      for (const g of results) games.set(g.id, g);
    } catch {
      failedChunks++;
    }
  }

  return { games, failedChunks };
}

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is not set`);
  return value;
}
