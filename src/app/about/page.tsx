import Link from "next/link";
import { Wordmark } from "../wordmark";
import { AXIS_COPY, AXES } from "@/lib/axes";

export default function AboutPage() {
  return (
    <main style={{ maxWidth: 700, margin: "0 auto", padding: "48px 24px 64px" }}>
      <Wordmark size={36} />
      <p style={{ marginTop: 20, color: "var(--text-dim)", fontSize: 15, lineHeight: 1.7 }}>
        Every game asks something different of you. MiMeMa breaks that down into three axes, and lets
        you rate any game against them — then shows you how your read compares to everyone else who has.
      </p>

      <div style={{ marginTop: 32, display: "flex", flexDirection: "column", gap: 20 }}>
        {AXES.map((axis) => (
          <div key={axis} style={{ borderLeft: `2px solid var(--${axis})`, paddingLeft: 16 }}>
            <div style={{ color: `var(--${axis})`, fontSize: 16, fontWeight: 800 }}>
              {AXIS_COPY[axis].label.toUpperCase()} <span style={{ color: "var(--text-faint)", fontWeight: 500, fontSize: 12 }}>{AXIS_COPY[axis].tag}</span>
            </div>
            <p style={{ color: "var(--text-dim)", fontSize: 13, marginTop: 6, lineHeight: 1.6 }}>
              {AXIS_COPY[axis].description}
            </p>
          </div>
        ))}
      </div>

      <section style={{ marginTop: 44 }}>
        <h3 style={sectionHeadingStyle}>How it works</h3>
        <ol style={{ marginTop: 14, paddingLeft: 20, display: "flex", flexDirection: "column", gap: 14 }}>
          <li style={stepStyle}>
            <b style={{ color: "var(--text)" }}>Connect your Steam library.</b> We pull your owned games
            via Steam&apos;s own API and look up rich metadata (title, cover art, description) for each one
            through IGDB. We only ever use Steam to read your library — nothing is posted back to your
            account.
          </li>
          <li style={stepStyle}>
            <b style={{ color: "var(--text)" }}>Rate a game on Micro, Meso, and Macro.</b> Drag each
            slider from 0 (none) to 100 (extreme) based on how much that game leans on each axis. There&apos;s
            no wrong answer — it&apos;s your read on the game, not a review of how good it is.
          </li>
          <li style={stepStyle}>
            <b style={{ color: "var(--text)" }}>See how you compare.</b> Once you submit a rating, we show
            you the crowd average for that game alongside your own numbers, with the difference (delta) on
            each axis.
          </li>
          <li style={stepStyle}>
            <b style={{ color: "var(--text)" }}>Keep going.</b> The home page surfaces a &ldquo;quick
            rate&rdquo; suggestion — a game from your library you haven&apos;t rated yet, weighted toward
            whatever&apos;s more popular among other raters. Hit skip if it&apos;s not one you know well.
          </li>
        </ol>
      </section>

      <section style={{ marginTop: 36 }}>
        <h3 style={sectionHeadingStyle}>Why ratings stay hidden until you rate</h3>
        <p style={{ color: "var(--text-dim)", fontSize: 13.5, marginTop: 10, lineHeight: 1.7 }}>
          Seeing the crowd&apos;s number before you&apos;ve formed your own opinion tends to anchor your
          rating to theirs, instead of reflecting how you actually read the game. So the crowd average for
          a game — on the library grid, the game page, and the quick-rate widget — stays locked until
          you&apos;ve submitted your own rating for that specific game. Submit once, and it unlocks
          immediately, including a comparison of your numbers against the crowd&apos;s.
        </p>
      </section>

      <section style={{ marginTop: 36 }}>
        <h3 style={sectionHeadingStyle}>What&apos;s the &ldquo;quick rate&rdquo; suggestion picking?</h3>
        <p style={{ color: "var(--text-dim)", fontSize: 13.5, marginTop: 10, lineHeight: 1.7 }}>
          If you&apos;ve linked Steam, it prefers games already in your library that you haven&apos;t rated
          yet. Once you&apos;ve rated everything you own, it falls back to popular games across the whole
          site. Either way, it&apos;s sampled randomly from the most-rated 20 candidates in that pool — so
          you&apos;ll usually see something with a real crowd average worth comparing against, rather than
          an obscure title nobody else has rated.
        </p>
      </section>

      <section style={{ marginTop: 36 }}>
        <h3 style={sectionHeadingStyle}>What&apos;s not here yet</h3>
        <p style={{ color: "var(--text-dim)", fontSize: 13.5, marginTop: 10, lineHeight: 1.7 }}>
          This is an early version. A few things from the original plan are intentionally not built yet:
          a personal &ldquo;bias&rdquo; profile showing how your ratings consistently lean compared to the
          crowd, an archetype label derived from that bias, similar-game recommendations, advanced search
          by tag and slider range, classic non-Steam games (chess, board games, etc.), and email-based
          login as an alternative to Steam. They&apos;re on the roadmap, just not live.
        </p>
      </section>

      <p style={{ marginTop: 40 }}>
        <Link
          href="/"
          style={{ fontSize: 12, fontWeight: 700, letterSpacing: ".06em", color: "var(--text-dim)" }}
        >
          ← BACK TO HOME
        </Link>
      </p>
    </main>
  );
}

const sectionHeadingStyle = {
  fontSize: 13,
  fontWeight: 800,
  letterSpacing: ".1em",
  textTransform: "uppercase" as const,
  color: "var(--text-faint)",
};

const stepStyle = {
  color: "var(--text-dim)",
  fontSize: 13.5,
  lineHeight: 1.65,
};
