export function Wordmark({ size = 24, showBars = true }: { size?: number; showBars?: boolean }) {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: size > 30 ? 14 : 10,
        fontSize: size,
        fontWeight: 800,
        letterSpacing: "-0.02em",
        lineHeight: 0.9,
      }}
    >
      {showBars && (
        <span style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <span style={{ width: size * 0.55, height: size * 0.1, borderRadius: size * 0.05, background: "var(--micro)" }} />
          <span style={{ width: size * 0.38, height: size * 0.1, borderRadius: size * 0.05, background: "var(--meso)" }} />
          <span style={{ width: size * 0.63, height: size * 0.1, borderRadius: size * 0.05, background: "var(--macro)" }} />
        </span>
      )}
      <span>
        <span style={{ color: "var(--micro)" }}>Mi</span>
        <span style={{ color: "var(--meso)" }}>Me</span>
        <span style={{ color: "var(--macro)" }}>Ma</span>
      </span>
    </span>
  );
}
