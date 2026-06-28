import { NextResponse } from "next/server";
import { auth } from "@/auth/auth";
import { prisma } from "@/lib/prisma";
import { syncSteamLibrary } from "@/lib/sync-steam-library";

export async function POST() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({ where: { id: session.user.id } });
  if (!user?.steamId) {
    return NextResponse.json({ error: "No linked Steam account" }, { status: 400 });
  }

  const result = await syncSteamLibrary(user.id, user.steamId);
  if (!result.ok) {
    return NextResponse.json({ error: "Sync failed" }, { status: 500 });
  }
  return NextResponse.json(result);
}
