const STEAM_API_BASE = "https://api.steampowered.com";

export interface SteamOwnedGame {
  appid: number;
  name: string;
  playtime_forever: number;
}

export async function getOwnedGames(steamId: string): Promise<SteamOwnedGame[]> {
  const url = new URL(`${STEAM_API_BASE}/IPlayerService/GetOwnedGames/v1/`);
  url.searchParams.set("key", requireApiKey());
  url.searchParams.set("steamid", steamId);
  url.searchParams.set("include_appinfo", "1");
  url.searchParams.set("include_played_free_games", "1");

  const res = await fetch(url.toString());
  if (!res.ok) throw new Error(`Steam GetOwnedGames failed: ${res.status}`);
  const data = await res.json();
  return data.response?.games ?? [];
}

export interface SteamPlayerSummary {
  steamid: string;
  personaname: string;
  avatarfull: string;
}

export async function getPlayerSummary(steamId: string): Promise<SteamPlayerSummary | null> {
  const url = new URL(`${STEAM_API_BASE}/ISteamUser/GetPlayerSummaries/v2/`);
  url.searchParams.set("key", requireApiKey());
  url.searchParams.set("steamids", steamId);

  const res = await fetch(url.toString());
  if (!res.ok) throw new Error(`Steam GetPlayerSummaries failed: ${res.status}`);
  const data = await res.json();
  return data.response?.players?.[0] ?? null;
}

function requireApiKey(): string {
  const key = process.env.STEAM_API_KEY;
  if (!key) throw new Error("STEAM_API_KEY is not set");
  return key;
}
