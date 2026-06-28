import { NextRequest, NextResponse } from "next/server";
import { buildSteamLoginUrl, verifySteamCallback } from "@/lib/steam-openid";
import { getPlayerSummary } from "@/lib/steam";
import { signIn } from "@/auth/auth";
import { prisma } from "@/lib/prisma";
import { syncSteamLibrary } from "@/lib/sync-steam-library";

export async function GET(request: NextRequest) {
  const realm = process.env.STEAM_REALM ?? new URL(request.url).origin;
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

  await signIn("steam", {
    steamId,
    name: summary?.personaname,
    image: summary?.avatarfull,
    redirect: false,
  });

  // authorize() in auth.config.ts upserts the User row keyed by steamId, so
  // it's guaranteed to exist by the time signIn() above resolves.
  const user = await prisma.user.findUnique({ where: { steamId } });
  if (user) {
    await syncSteamLibrary(user.id, steamId);
  }

  return NextResponse.redirect(new URL("/", realm));
}
