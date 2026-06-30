import { redirect } from "next/navigation";
import { auth } from "@/auth/auth";
import { prisma } from "@/lib/prisma";
import { SyncButton } from "../sync-button";
import { SortSelect } from "../sort-select";
import { AXIS_COPY, AXES, type Axis } from "@/lib/axes";
import { LibraryGrid } from "./library-grid";

export default async function ProfilePage({
  searchParams,
}: {
  searchParams: Promise<{ sort?: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/");
  }
  const userId = session.user.id;
  const { sort = "hours" } = await searchParams;

  const [library, ratingStats] = await Promise.all([
    prisma.steamLibraryLink.findUnique({
      where: { userId },
      select: {
        id: true,
        _count: { select: { ownedGames: true } },
      },
    }),
    prisma.rating.findMany({
      where: { userId },
      select: { gameId: true, micro: true, meso: true, macro: true },
    }),
  ]);

  const gameCount = library?._count.ownedGames ?? 0;
  const ratedCount = ratingStats.length;

  // Compute bias tendencies from the user's own ratings vs crowd averages
  // in a single batched query rather than per-game queries.
  const tendencies: Record<Axis, number | null> = { micro: null, meso: null, macro: null };

  if (ratingStats.length > 0) {
    const ratedGameIds = ratingStats.map((r) => r.gameId);
    const crowdAverages = await prisma.rating.groupBy({
      by: ["gameId"],
      where: { gameId: { in: ratedGameIds } },
      _avg: { micro: true, meso: true, macro: true },
    });
    const crowdMap = new Map(crowdAverages.map((a) => [a.gameId, a._avg]));
    const ownRatingMap = new Map(ratingStats.map((r) => [r.gameId, r]));

    for (const axis of AXES) {
      const diffs = ratedGameIds
        .map((id) => {
          const crowd = crowdMap.get(id)?.[axis];
          const own = ownRatingMap.get(id)?.[axis];
          if (crowd == null || own == null) return null;
          return own - crowd;
        })
        .filter((d): d is number => d != null);
      tendencies[axis] = diffs.length > 0 ? diffs.reduce((a, b) => a + b, 0) / diffs.length : null;
    }
  }

  return (
    <main style={{ padding: "48px 44px 64px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
        {session.user.image && (
          // eslint-disable-next-line @next/next/no-img-element -- avatar from an arbitrary Steam CDN host
          <img src={session.user.image} alt="" width={72} height={72} style={{ borderRadius: 8 }} />
        )}
        <div>
          <h2 style={{ fontSize: 32, fontWeight: 800, letterSpacing: "-.02em" }}>{session.user.name ?? "Player"}</h2>
          <p style={{ fontSize: 13, color: "var(--text-faint)", marginTop: 6 }}>
            {gameCount} games in library · {ratedCount} rated
          </p>
        </div>
      </div>

      <section style={{ marginTop: 52, maxWidth: 640 }}>
        <h3 style={{ fontSize: 22, fontWeight: 800, letterSpacing: "-.02em" }}>How do your ratings compare?</h3>
        {ratedCount === 0 ? (
          <p style={{ marginTop: 12, fontSize: 14, color: "var(--text-dim)", lineHeight: 1.6 }}>
            Rate some games to see how your interpretation of games is unique to you.
          </p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 18, marginTop: 24 }}>
            {AXES.map((axis) => (
              <TendencyBar key={axis} axis={axis} value={tendencies[axis]} />
            ))}
          </div>
        )}
      </section>

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-end",
          gap: 24,
          flexWrap: "wrap",
          marginTop: 72,
          paddingTop: 36,
          borderTop: "1px solid var(--border-dim)",
        }}
      >
        <h3 style={{ fontSize: 14, fontWeight: 700, letterSpacing: ".06em", color: "var(--text-faint)" }}>LIBRARY</h3>
        {library ? (
          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            <SortSelect value={sort} />
            <SyncButton />
          </div>
        ) : null}
      </div>

      {!library ? (
        <div style={{ marginTop: 16 }}>
          <p style={{ color: "var(--text-dim)", fontSize: 13 }}>
            Connect your Steam account to see your library here.
          </p>
          {/* eslint-disable-next-line @next/next/no-html-link-for-pages -- full navigation into a route handler, not a page */}
          <a
            href="/api/auth/steam"
            style={{
              display: "inline-block",
              marginTop: 12,
              fontWeight: 800,
              fontSize: 13,
              letterSpacing: ".08em",
              padding: "15px 26px",
              borderRadius: 5,
              color: "var(--bg)",
              background: "linear-gradient(90deg, var(--micro), var(--meso), var(--macro))",
            }}
          >
            ▸ CONNECT STEAM LIBRARY
          </a>
        </div>
      ) : gameCount === 0 ? (
        <p style={{ marginTop: 16, color: "var(--text-dim)", fontSize: 13 }}>
          No games found yet — sync should normally run right after login. Try syncing manually above.
        </p>
      ) : (
        <LibraryGrid sort={sort} />
      )}
    </main>
  );
}

function TendencyBar({ axis, value }: { axis: Axis; value: number | null }) {
  const copy = AXIS_COPY[axis];
  if (value == null) {
    return (
      <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
        <span style={{ width: 68, fontSize: 13, letterSpacing: ".08em", color: `var(--${axis})`, fontWeight: 700 }}>
          {copy.label.toUpperCase()}
        </span>
        <span style={{ fontSize: 13, color: "var(--text-faint)" }}>not enough data</span>
      </div>
    );
  }

  const rounded = Math.round(value * 10) / 10;
  const offChart = Math.abs(rounded) > 15;
  const magnitude = Math.min(Math.abs(rounded), 15);
  const widthPct = (magnitude / 15) * 50;
  const direction = rounded > 3 ? "higher than" : rounded < -3 ? "lower than" : "similar to";
  const sign = rounded > 0 ? "+" : "";

  const axisColor = axis === "micro" ? "255,84,112" : axis === "meso" ? "199,125,255" : "76,201,240";
  const fill = `rgba(${axisColor},.75)`;

  const barStyle: React.CSSProperties = rounded >= 0
    ? { position: "absolute", top: 0, bottom: 0, left: "50%", width: `${widthPct}%`, background: fill, borderRadius: "0 4px 4px 0" }
    : offChart
      ? { position: "absolute", top: 0, bottom: 0, right: "50%", left: -10, background: fill, borderRadius: "4px 0 0 4px" }
      : { position: "absolute", top: 0, bottom: 0, right: "50%", width: `${widthPct}%`, background: fill, borderRadius: "4px 0 0 4px" };

  return (
    <div className="tendency-row">
      <span style={{ width: 68, fontSize: 13, letterSpacing: ".08em", color: `var(--${axis})`, fontWeight: 700, flexShrink: 0 }}>
        {copy.label.toUpperCase()}
      </span>
      <div style={{ flex: 1, height: 20, position: "relative", background: "#1c1c24", borderRadius: 4 }}>
        <div style={{ position: "absolute", left: "calc(50% - 4px)", top: -4, bottom: -4, width: 8, background: "#fff", borderRadius: 99, zIndex: 2 }} />
        <div style={barStyle} />
      </div>
      <span className="tendency-crowd">
        {sign}{rounded} pts {direction} crowd{offChart ? " · off the chart" : ""}
      </span>
    </div>
  );
}
