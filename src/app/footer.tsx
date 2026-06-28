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
      Inspired by{" "}
      <a
        href="https://www.youtube.com/watch?v=NgHvdCcmQ4o"
        target="_blank"
        rel="noopener noreferrer"
        style={{ color: "var(--text-dim)", textDecoration: "underline" }}
      >
        Surnex&apos;s video
      </a>
      .
    </footer>
  );
}
