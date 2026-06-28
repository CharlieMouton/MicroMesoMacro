import { Wordmark } from "../wordmark";
import { AXIS_COPY, AXES } from "@/lib/axes";

const CHEAT_HINTS: Record<string, string> = {
  micro:
    "A quick test: if you could cheat at this game, would you want an aimbot, perfect reflexes, or frame-perfect inputs? That's Micro.",
  meso:
    "A quick test: would your cheat be seeing through the fog of war, knowing the opponent's hand, or always knowing the odds? That's Meso.",
  macro:
    "A quick test: would your cheat be knowing the optimal build order, the winning line ten moves out, or the whole map ahead of time? That's Macro.",
};

export default function AboutPage() {
  return (
    <main style={{ maxWidth: 700, margin: "0 auto", padding: "48px 24px 64px" }}>
      <Wordmark size={36} />
      <p style={{ marginTop: 20, color: "var(--text-dim)", fontSize: 15, lineHeight: 1.7 }}>
        Every game asks something different of you. MiMeMa breaks that down into three axes, and lets
        you rate any game against them — then shows you how your read compares to everyone else who has.
      </p>

      <p style={{ marginTop: 18, color: "var(--text-dim)", fontSize: 14.5, lineHeight: 1.7 }}>
        One way to figure out which axis a game leans on, borrowed from{" "}
        <a
          href="https://www.youtube.com/watch?v=NgHvdCcmQ4o"
          target="_blank"
          rel="noopener noreferrer"
          style={{ color: "var(--text)", textDecoration: "underline" }}
        >
          the video that inspired this site
        </a>
        : imagine you could cheat at it. What would you actually want the cheat to do for you? Faster
        hands and pinpoint aim is a Micro cheat. Knowing exactly what your opponent has, or the true odds
        of a play working, is a Meso cheat. Knowing the optimal plan from start to finish is a Macro
        cheat. Most games lean on more than one axis — the question is which one your cheat would target
        first.
      </p>

      <div style={{ marginTop: 32, display: "flex", flexDirection: "column", gap: 22 }}>
        {AXES.map((axis) => (
          <div key={axis} style={{ borderLeft: `2px solid var(--${axis})`, paddingLeft: 16 }}>
            <div style={{ color: `var(--${axis})`, fontSize: 16, fontWeight: 800 }}>
              {AXIS_COPY[axis].label.toUpperCase()}{" "}
              <span style={{ color: "var(--text-faint)", fontWeight: 500, fontSize: 12 }}>
                {AXIS_COPY[axis].tag}
              </span>
            </div>
            <p style={{ color: "var(--text-dim)", fontSize: 13, marginTop: 6, lineHeight: 1.6 }}>
              {AXIS_COPY[axis].description}
            </p>
            <p style={{ color: "var(--text-faint)", fontSize: 12.5, marginTop: 8, lineHeight: 1.6 }}>
              {CHEAT_HINTS[axis]}
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
