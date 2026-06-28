import type { NextAuthConfig } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { prisma } from "@/lib/prisma";
import { verifySteamTicket } from "@/lib/steam-ticket";

/**
 * Steam has no OAuth provider — login is via OpenID 2.0, verified manually in
 * /api/auth/steam. That route confirms the steamid with Steam directly, then
 * mints a short-lived signed ticket via createSteamTicket() and calls
 * signIn("steam", { ticket }).
 *
 * We deliberately do NOT accept a raw steamId/name/image here: NextAuth's
 * Credentials provider exposes a public POST endpoint
 * (/api/auth/callback/steam) that anyone can call directly, so trusting
 * unsigned input would let an attacker log in as any steamId they choose.
 * The ticket's HMAC signature (src/lib/steam-ticket.ts) is what actually
 * proves this request came from our own verified OpenID callback.
 */
export const authConfig: NextAuthConfig = {
  session: { strategy: "jwt" },
  // Required behind a reverse proxy (Vercel, or any custom-domain setup) so
  // Auth.js trusts the Host header it forwards instead of rejecting it.
  trustHost: true,
  providers: [
    Credentials({
      id: "steam",
      name: "Steam",
      credentials: {
        ticket: { label: "Ticket" },
      },
      async authorize(credentials) {
        const ticket = credentials?.ticket;
        if (typeof ticket !== "string" || !ticket) return null;

        const payload = verifySteamTicket(ticket);
        if (!payload) return null;

        const user = await prisma.user.upsert({
          where: { steamId: payload.steamId },
          update: { name: payload.name, image: payload.image },
          create: { steamId: payload.steamId, name: payload.name, image: payload.image },
        });

        return { id: user.id, name: user.name, image: user.image };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) token.sub = user.id;
      return token;
    },
    async session({ session, token }) {
      if (token.sub) session.user.id = token.sub;
      return session;
    },
  },
  pages: {
    signIn: "/api/auth/signin",
  },
};
