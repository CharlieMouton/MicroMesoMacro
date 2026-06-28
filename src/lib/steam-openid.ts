const STEAM_OPENID_ENDPOINT = "https://steamcommunity.com/openid/login";
const CLAIMED_ID_RE = /^https:\/\/steamcommunity\.com\/openid\/id\/(\d+)$/;

export function buildSteamLoginUrl(returnTo: string, realm: string): string {
  const url = new URL(STEAM_OPENID_ENDPOINT);
  url.searchParams.set("openid.ns", "http://specs.openid.net/auth/2.0");
  url.searchParams.set("openid.mode", "checkid_setup");
  url.searchParams.set("openid.return_to", returnTo);
  url.searchParams.set("openid.realm", realm);
  url.searchParams.set("openid.identity", "http://specs.openid.net/auth/2.0/identifier_select");
  url.searchParams.set("openid.claimed_id", "http://specs.openid.net/auth/2.0/identifier_select");
  return url.toString();
}

/**
 * Verifies a Steam OpenID 2.0 callback by replaying the signed params back to
 * Steam with mode=check_authentication, then extracts the 64-bit SteamID
 * from openid.claimed_id. Returns null if verification fails.
 */
export async function verifySteamCallback(params: URLSearchParams): Promise<string | null> {
  const claimedId = params.get("openid.claimed_id");
  if (!claimedId) return null;
  const match = CLAIMED_ID_RE.exec(claimedId);
  if (!match) return null;

  const verifyParams = new URLSearchParams(params);
  verifyParams.set("openid.mode", "check_authentication");

  const res = await fetch(STEAM_OPENID_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: verifyParams.toString(),
  });
  if (!res.ok) return null;

  const text = await res.text();
  if (!/is_valid\s*:\s*true/.test(text)) return null;

  return match[1];
}
