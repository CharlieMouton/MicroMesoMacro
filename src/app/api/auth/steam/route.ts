import { NextRequest, NextResponse } from "next/server";
import { buildSteamLoginUrl, verifySteamCallback } from "@/lib/steam-openid";
import { getPlayerSummary } from "@/lib/steam";
import { signIn } from "@/auth/auth";
import { prisma } from "@/lib/prisma";
import { syncSteamLibrary } from "@/lib/sync-steam-library";
import { createSteamTicket } from "@/lib/steam-ticket";
import { mergeAnonRatingsInto } from "@/lib/anon-user";

export async function GET(request: NextRequest) {
  // Deliberately not falling back to `new URL(request.url).origin` here:
  // that derives from the incoming Host header, which a client can send
  // arbitrary values for unless the deployment strictly validates it —
  // using it would let a forged Host header redirect the OpenID realm/
  // return_to to an attacker-controlled origin.
  const realm = process.env.STEAM_REALM;
  if (!realm) {
    return NextResponse.json({ error: "STEAM_REALM is not configured" }, { status: 500 });
  }
  const returnTo = `${realm}/api/auth/steam`;

  const hasOpenIdResponse = request.nextUrl.searchParams.has("openid.mode");
  if (!hasOpenIdResponse) {
    return NextResponse.redirect(buildSteamLoginUrl(returnTo, realm));
  }

  const steamId = await verifySteamCallback(request.nextUrl.searchParams);
  if (!steamId) {
    return NextResponse.redirect(new URL("/?error=steam_verification_failed", realm));
  }

  const summary = await getPlayerSummary(steamId);

  const ticket = createSteamTicket({
    steamId,
    name: summary?.personaname,
    image: summary?.avatarfull,
  });

  await signIn("steam", { ticket, redirect: false });

  // authorize() in auth.config.ts upserts the User row keyed by steamId, so
  // it's guaranteed to exist by the time signIn() above resolves.
  const user = await prisma.user.findUnique({ where: { steamId } });
  if (user) {
    await mergeAnonRatingsInto(user.id);
    await syncSteamLibrary(user.id, steamId);
  }

  return NextResponse.redirect(new URL("/", realm));
}
