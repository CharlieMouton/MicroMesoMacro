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

      <p style={{ marginTop: 32, color: "var(--text-dim)", fontSize: 14, lineHeight: 1.7 }}>
        Connect your Steam account to pull in your library and start rating. Crowd averages for a game
        stay hidden until you submit your own rating for it — rate first, then compare.
      </p>
    </main>
  );
}
