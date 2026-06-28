import type { NextAuthConfig } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { prisma } from "@/lib/prisma";

/**
 * Steam has no OAuth provider — login is via OpenID 2.0, verified manually in
 * /api/auth/steam. That route confirms the steamid with Steam directly, then
 * calls signIn("steam", { steamId, name, image }) so this Credentials
 * provider only ever receives an already-verified identity.
 */
export const authConfig: NextAuthConfig = {
  session: { strategy: "jwt" },
  providers: [
    Credentials({
      id: "steam",
      name: "Steam",
      credentials: {
        steamId: { label: "Steam ID" },
        name: { label: "Name" },
        image: { label: "Image" },
      },
      async authorize(credentials) {
        const steamId = credentials?.steamId;
        if (typeof steamId !== "string" || !steamId) return null;

        const name = typeof credentials.name === "string" ? credentials.name : undefined;
        const image = typeof credentials.image === "string" ? credentials.image : undefined;

        const user = await prisma.user.upsert({
          where: { steamId },
          update: { name, image },
          create: { steamId, name, image },
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
