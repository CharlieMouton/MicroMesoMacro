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

async function igdbQuery<T>(endpoint: string, body: string): Promise<T> {
  const [token, clientId] = await Promise.all([getAccessToken(), Promise.resolve(requireEnv("IGDB_CLIENT_ID"))]);

  const res = await fetch(`${IGDB_BASE}/${endpoint}`, {
    method: "POST",
    headers: {
      "Client-ID": clientId,
      Authorization: `Bearer ${token}`,
      "Content-Type": "text/plain",
    },
    body,
  });
  if (!res.ok) throw new Error(`IGDB ${endpoint} request failed: ${res.status}`);
  return res.json();
}

export interface IgdbGame {
  id: number;
  name: string;
  summary?: string;
  cover?: { url: string };
  first_release_date?: number;
  genres?: { name: string }[];
}

export async function getGameByIgdbId(id: number): Promise<IgdbGame | null> {
  const games = await igdbQuery<IgdbGame[]>(
    "games",
    `fields name,summary,cover.url,first_release_date,genres.name; where id = ${id};`
  );
  return games[0] ?? null;
}

/**
 * Maps a Steam appid to an IGDB game id via IGDB's external_games table.
 * Category 1 = Steam, per IGDB's ExternalGameCategory enum.
 */
export async function resolveBySteamAppId(appId: number): Promise<number | null> {
  const matches = await igdbQuery<{ game: number }[]>(
    "external_games",
    `fields game; where category = 1 & uid = "${appId}"; limit 1;`
  );
  return matches[0]?.game ?? null;
}

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is not set`);
  return value;
}
