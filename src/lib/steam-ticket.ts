import { createHmac, timingSafeEqual } from "crypto";

const TICKET_TTL_MS = 60_000;

interface SteamTicketPayload {
  steamId: string;
  name?: string;
  image?: string;
  exp: number;
}

function secret(): string {
  const value = process.env.AUTH_SECRET;
  if (!value) throw new Error("AUTH_SECRET is not set");
  return value;
}

function sign(data: string): string {
  return createHmac("sha256", secret()).update(data).digest("base64url");
}

/**
 * Mints a short-lived, HMAC-signed ticket so the Credentials provider in
 * auth.config.ts can trust a steamId without re-verifying OpenID itself.
 *
 * This exists because NextAuth's Credentials provider exposes a public
 * POST endpoint (/api/auth/callback/steam) that anyone can call directly
 * with an arbitrary steamId — bypassing our actual Steam OpenID
 * verification entirely. Only code holding AUTH_SECRET can produce a
 * ticket with a valid signature, so authorize() only needs to check the
 * signature and expiry, not re-derive trust from the raw fields.
 */
export function createSteamTicket(payload: Omit<SteamTicketPayload, "exp">): string {
  const data: SteamTicketPayload = { ...payload, exp: Date.now() + TICKET_TTL_MS };
  const encoded = Buffer.from(JSON.stringify(data)).toString("base64url");
  return `${encoded}.${sign(encoded)}`;
}

export function verifySteamTicket(ticket: string): SteamTicketPayload | null {
  const [encoded, signature] = ticket.split(".");
  if (!encoded || !signature) return null;

  const expected = sign(encoded);
  const a = Buffer.from(signature);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;

  let payload: SteamTicketPayload;
  try {
    payload = JSON.parse(Buffer.from(encoded, "base64url").toString("utf-8"));
  } catch {
    return null;
  }

  if (typeof payload.steamId !== "string" || !payload.steamId) return null;
  if (typeof payload.exp !== "number" || payload.exp < Date.now()) return null;

  return payload;
}
