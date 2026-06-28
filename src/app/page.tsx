import { auth } from "@/auth/auth";
import { Wordmark } from "./wordmark";
import { SearchBar } from "./search-bar";
import { QuickRate } from "./quick-rate";
import { AXIS_COPY, type Axis } from "@/lib/axes";

export default async function HomePage() {
  const session = await auth();

  return (
    <main
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
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

        <div style={{ marginTop: 28 }}>
          <SearchBar large />
        </div>

        <div style={{ marginTop: 24 }}>
          {session?.user?.id ? (
            <QuickRate />
          ) : (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 16,
                flexWrap: "wrap",
                background: "var(--panel)",
                border: "1px solid var(--border-dim)",
                borderRadius: 7,
                padding: 18,
              }}
            >
              <span style={{ color: "var(--text-dim)", fontSize: 13 }}>
                Connect Steam to get personalized game suggestions to rate.
              </span>
              {/* eslint-disable-next-line @next/next/no-html-link-for-pages -- full navigation into a route handler, not a page */}
              <a
                href="/api/auth/steam"
                style={{
                  fontWeight: 800,
                  fontSize: 12,
                  letterSpacing: ".06em",
                  padding: "11px 18px",
                  borderRadius: 5,
                  color: "var(--bg)",
                  background: "linear-gradient(90deg, var(--micro), var(--meso), var(--macro))",
                }}
              >
                CONNECT STEAM
              </a>
            </div>
          )}
        </div>

        <div style={{ display: "flex", gap: 14, marginTop: 34, flexWrap: "wrap" }}>
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
      </div>
    </main>
  );
}
