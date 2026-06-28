import Link from "next/link";
import Image from "next/image";
import { auth } from "@/auth/auth";
import { prisma } from "@/lib/prisma";
import { SyncButton } from "./sync-button";
import { SortSelect } from "./sort-select";
import { Wordmark } from "./wordmark";
import { AXIS_COPY, type Axis } from "@/lib/axes";

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ sort?: string }>;
}) {
  const session = await auth();
  const { sort = "hours" } = await searchParams;

  if (!session?.user?.id) {
    return (
      <main
        style={{
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: "56px 24px",
        }}
      >
        <div style={{ width: "100%", maxWidth: 760 }}>
          <div
            style={{
              fontSize: 11,
              letterSpacing: ".22em",
              textTransform: "uppercase",
              color: "var(--text-faint)",
            }}
          >
            Micro · Meso · Macro — game rating engine
          </div>
          <div style={{ marginTop: 16 }}>
            <Wordmark size={48} />
          </div>
          <p style={{ maxWidth: 600, color: "var(--text-dim)", fontSize: 15, lineHeight: 1.65, marginTop: 18 }}>
            Every game tests three things. Rate any title on{" "}
            <span style={{ color: "var(--micro)", fontWeight: 700 }}>Micro</span>,{" "}
            <span style={{ color: "var(--meso)", fontWeight: 700 }}>Meso</span> and{" "}
            <span style={{ color: "var(--macro)", fontWeight: 700 }}>Macro</span> — then see how your read
            compares to the crowd.
          </p>

          <div style={{ display: "flex", gap: 14, marginTop: 30, flexWrap: "wrap" }}>
            {(Object.keys(AXIS_COPY) as Axis[]).map((axis) => (
              <div
                key={axis}
                style={{
                  flex: 1,
                  minWidth: 200,
                  background: "var(--panel)",
                  border: "1px solid var(--border)",
                  borderTop: `2px solid var(--${axis})`,
                  borderRadius: 5,
                  padding: "18px 18px 20px",
                }}
              >
                <span style={{ color: `var(--${axis})`, fontSize: 19, fontWeight: 800, letterSpacing: ".03em" }}>
                  {AXIS_COPY[axis].label.toUpperCase()}
                </span>
                <p style={{ color: "#c9c9d4", fontSize: 12.5, lineHeight: 1.55, marginTop: 13 }}>
                  {AXIS_COPY[axis].description}
                </p>
              </div>
            ))}
          </div>

          <div style={{ display: "flex", gap: 14, marginTop: 34, alignItems: "center", flexWrap: "wrap" }}>
            {/* eslint-disable-next-line @next/next/no-html-link-for-pages -- full navigation into a route handler, not a page */}
            <a
              href="/api/auth/steam"
              style={{
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
        </div>
      </main>
    );
  }

  const library = await prisma.steamLibraryLink.findUnique({
    where: { userId: session.user.id },
    include: { ownedGames: { include: { game: true } } },
  });

  if (!library) {
    return (
      <main style={{ padding: 24 }}>
        <Wordmark />
        <p style={{ marginTop: 16, color: "var(--text-dim)" }}>
          No Steam library linked yet — sync should normally run right after login. Try syncing manually:
        </p>
        <div style={{ marginTop: 12 }}>
          <SyncButton />
        </div>
      </main>
    );
  }

  const games = library.ownedGames.filter((og) => og.game);

  const rows = await Promise.all(
    games.map(async (owned) => {
      const game = owned.game!;
      const [aggregate, ownRating] = await Promise.all([
        prisma.rating.aggregate({
          where: { gameId: game.id },
          _avg: { micro: true, meso: true, macro: true },
        }),
        prisma.rating.findUnique({
          where: { userId_gameId: { userId: session.user.id, gameId: game.id } },
        }),
      ]);
      return { game, crowd: aggregate._avg, ownRating, playtimeMins: owned.playtimeMins ?? 0 };
    })
  );

  rows.sort((a, b) =>
    sort === "alpha" ? a.game.title.localeCompare(b.game.title) : b.playtimeMins - a.playtimeMins
  );

  return (
    <main style={{ padding: "38px 44px 64px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", gap: 24, flexWrap: "wrap" }}>
        <div>
          <Wordmark />
          <h2 style={{ fontSize: 30, fontWeight: 800, letterSpacing: "-.02em", marginTop: 10 }}>
            {games.length} games{" "}
            <span style={{ color: "var(--text-faint)", fontWeight: 500 }}>
              / {rows.filter((r) => r.ownRating).length} rated
            </span>
          </h2>
        </div>
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <SortSelect value={sort} />
          <SyncButton />
        </div>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(258px, 1fr))",
          gap: 16,
          marginTop: 26,
        }}
      >
        {rows.map(({ game, crowd, ownRating }) => (
          <GameCard key={game.id} game={game} crowd={crowd} ownRating={ownRating} />
        ))}
      </div>
    </main>
  );
}

function GameCard({
  game,
  crowd,
  ownRating,
}: {
  game: { id: string; title: string; headerImage: string | null };
  crowd: { micro: number | null; meso: number | null; macro: number | null };
  ownRating: { micro: number; meso: number; macro: number } | null;
}) {
  const initials = game.title
    .replace(/[^A-Za-z0-9 ]/g, "")
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();

  return (
    <Link
      href={`/games/${game.id}`}
      style={{
        background: "var(--panel)",
        border: "1px solid var(--border-dim)",
        borderRadius: 7,
        overflow: "hidden",
        display: "block",
      }}
    >
      <div
        style={{
          height: 90,
          position: "relative",
          background: "linear-gradient(135deg, var(--micro-dim) -20%, #0e0e14 65%)",
          display: "flex",
          alignItems: "flex-end",
          padding: 12,
        }}
      >
        {game.headerImage && (
          <Image
            src={game.headerImage}
            alt=""
            fill
            sizes="258px"
            style={{ objectFit: "cover", objectPosition: "center 20%" }}
          />
        )}
        <div style={{ position: "absolute", top: 10, right: 11 }}>
          {ownRating ? (
            <span
              style={{
                fontSize: 10,
                letterSpacing: ".12em",
                color: "var(--macro)",
                background: "rgba(76,201,240,.12)",
                border: "1px solid var(--macro-dim)",
                padding: "3px 7px",
                borderRadius: 3,
              }}
            >
              RATED
            </span>
          ) : (
            <span
              style={{
                fontSize: 10,
                letterSpacing: ".12em",
                color: "var(--text-dim)",
                background: "rgba(0,0,0,.35)",
                border: "1px solid rgba(255,255,255,.08)",
                padding: "3px 7px",
                borderRadius: 3,
              }}
            >
              UNRATED
            </span>
          )}
        </div>
        {!game.headerImage && (
          <div style={{ fontSize: 30, fontWeight: 800, color: "rgba(255,255,255,.13)", letterSpacing: "-.02em" }}>
            {initials}
          </div>
        )}
      </div>
      <div style={{ padding: "14px 14px 15px" }}>
        <div style={{ fontSize: 14, fontWeight: 700, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
          {game.title}
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 7, marginTop: 14 }}>
          <AxisBar axis="micro" value={crowd.micro} />
          <AxisBar axis="meso" value={crowd.meso} />
          <AxisBar axis="macro" value={crowd.macro} />
        </div>

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginTop: 12,
            paddingTop: 11,
            borderTop: "1px solid var(--border-dim)",
          }}
        >
          <span style={{ fontSize: 11, color: "var(--text-faint)" }}>crowd avg</span>
          <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: ".08em", color: ownRating ? "var(--macro)" : "var(--meso)" }}>
            {ownRating ? "UPDATE" : "RATE →"}
          </span>
        </div>
      </div>
    </Link>
  );
}

function AxisBar({ axis, value }: { axis: Axis; value: number | null }) {
  const label = axis === "micro" ? "MIC" : axis === "meso" ? "MES" : "MAC";
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <span style={{ width: 28, fontSize: 10, letterSpacing: ".1em", color: `var(--${axis})`, fontWeight: 700 }}>
        {label}
      </span>
      <div style={{ flex: 1, height: 5, borderRadius: 3, background: "#1c1c24", overflow: "hidden" }}>
        <div
          style={{
            height: "100%",
            width: `${value ?? 0}%`,
            background: `linear-gradient(90deg, var(--${axis}-dim), var(--${axis}))`,
          }}
        />
      </div>
      <span style={{ width: 22, textAlign: "right", fontSize: 11, color: "#cacad4" }}>
        {value != null ? Math.round(value) : "—"}
      </span>
    </div>
  );
}
