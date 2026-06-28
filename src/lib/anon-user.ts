import { cookies } from "next/headers";
import { randomUUID } from "crypto";
import { prisma } from "./prisma";

const COOKIE_NAME = "mimema_anon_id";
const COOKIE_MAX_AGE = 60 * 60 * 24 * 365; // 1 year

/**
 * Anonymous visitors can rate games without connecting Steam. We track them
 * with a random id in a cookie and a "shadow" User row (no steamId/email)
 * keyed by that id, so a Rating can still satisfy its userId foreign key.
 */
export async function getOrCreateAnonUserId(): Promise<string> {
  const jar = await cookies();
  let anonId = jar.get(COOKIE_NAME)?.value;
  if (!anonId) {
    anonId = randomUUID();
    jar.set(COOKIE_NAME, anonId, {
      httpOnly: true,
      sameSite: "lax",
      maxAge: COOKIE_MAX_AGE,
      path: "/",
    });
  }
  const user = await prisma.user.upsert({
    where: { anonId },
    update: {},
    create: { anonId },
  });
  return user.id;
}

/** Read-only lookup — used by GET routes that shouldn't mint a new guest
 * identity just because someone viewed a page. */
export async function peekAnonUserId(): Promise<string | null> {
  const jar = await cookies();
  const anonId = jar.get(COOKIE_NAME)?.value;
  if (!anonId) return null;
  const user = await prisma.user.findUnique({ where: { anonId }, select: { id: true } });
  return user?.id ?? null;
}
