import { redirect } from "next/navigation";
import { auth } from "@/auth/auth";
import { prisma } from "@/lib/prisma";

export default async function ProfilePage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/");
  }

  const [ratedCount, library] = await Promise.all([
    prisma.rating.count({ where: { userId: session.user.id } }),
    prisma.steamLibraryLink.findUnique({
      where: { userId: session.user.id },
      include: { ownedGames: true },
    }),
  ]);

  return (
    <main style={{ maxWidth: 700, margin: "0 auto", padding: "48px 24px 64px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
        {session.user.image && (
          // eslint-disable-next-line @next/next/no-img-element -- avatar from an arbitrary Steam CDN host
          <img src={session.user.image} alt="" width={56} height={56} style={{ borderRadius: 6 }} />
        )}
        <div>
          <h2 style={{ fontSize: 24, fontWeight: 800 }}>{session.user.name ?? "Player"}</h2>
          <p style={{ fontSize: 12, color: "var(--text-faint)", marginTop: 4 }}>
            {library?.ownedGames.length ?? 0} games in library · {ratedCount} rated
          </p>
        </div>
      </div>

      <p style={{ marginTop: 28, color: "var(--text-dim)", fontSize: 13, lineHeight: 1.6 }}>
        Bias analysis, archetypes, and deeper profile stats are coming in a later update — for now this
        is just your basic stats.
      </p>
    </main>
  );
}
