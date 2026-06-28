import { NextRequest, NextResponse } from "next/server";
import { buildSteamLoginUrl, verifySteamCallback } from "@/lib/steam-openid";
import { getPlayerSummary } from "@/lib/steam";
import { signIn } from "@/auth/auth";

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

  return NextResponse.redirect(new URL("/", realm));
}
