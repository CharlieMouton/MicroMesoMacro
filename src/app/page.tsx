import Link from "next/link";
import { auth } from "@/auth/auth";
import { Wordmark } from "./wordmark";
import { SearchBar } from "./search-bar";
import { QuickRate } from "./quick-rate";

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

        <Link
          href="/about"
          style={{
            display: "inline-block",
            marginTop: 14,
            fontSize: 12,
            fontWeight: 700,
            letterSpacing: ".06em",
            color: "var(--text-dim)",
            borderBottom: "1px solid var(--border)",
            paddingBottom: 2,
          }}
        >
          LEARN MORE →
        </Link>

        <div style={{ marginTop: 28 }}>
          <SearchBar large />
        </div>

        <div style={{ marginTop: 24 }}>
          <QuickRate signedIn={!!session?.user?.id} />
        </div>
      </div>
    </main>
  );
}
