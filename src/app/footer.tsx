export function Footer() {
  return (
    <footer
      style={{
        marginTop: "auto",
        padding: "20px 24px",
        borderTop: "1px solid var(--border-dim)",
        fontSize: 12,
        color: "var(--text-faint)",
        textAlign: "center",
      }}
    >
      {/* TODO: replace with the real creator name + video URL */}
      Inspired by{" "}
      <a href="#" style={{ color: "var(--text-dim)", textDecoration: "underline" }}>
        [YOUTUBER NAME]&apos;s video
      </a>
      .
    </footer>
  );
}
