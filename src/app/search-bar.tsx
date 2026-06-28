export function SearchBar({ defaultValue = "", large = false }: { defaultValue?: string; large?: boolean }) {
  return (
    <form action="/search" method="get" style={{ display: "flex" }}>
      <input
        type="text"
        name="q"
        defaultValue={defaultValue}
        placeholder="Search for a game…"
        style={{
          flex: 1,
          fontFamily: "inherit",
          fontSize: large ? 16 : 13,
          color: "var(--text)",
          background: "var(--panel-2)",
          border: "1px solid var(--border)",
          borderRadius: 6,
          padding: large ? "16px 18px" : "11px 14px",
          outline: "none",
        }}
      />
    </form>
  );
}
