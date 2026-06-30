import Link from "next/link";
import type { CSSProperties } from "react";
import { auth } from "@/auth/auth";
import { Wordmark } from "./wordmark";

export async function Nav() {
  const session = await auth();

  return (
    <nav
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "16px 24px",
        borderBottom: "1px solid var(--border-dim)",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 28 }}>
        <Link href="/">
          <Wordmark size={20} />
        </Link>
        <Link href="/" style={navLinkStyle}>
          Home
        </Link>
        <Link href="/search" style={navLinkStyle}>
          Search
        </Link>
        <Link href="/about" style={navLinkStyle}>
          What&apos;s this
        </Link>
      </div>

      {session?.user?.id ? (
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <Link href="/profile" style={navLinkStyle}>
            Profile
          </Link>
          <Link href="/profile" style={{ display: "flex", alignItems: "center", gap: 8 }}>
            {session.user.image && (
              // eslint-disable-next-line @next/next/no-img-element -- tiny avatar from an arbitrary Steam CDN host, not worth configuring next/image remotePatterns for
              <img
                src={session.user.image}
                alt=""
                width={28}
                height={28}
                style={{ borderRadius: 4 }}
              />
            )}
            <span style={{ fontSize: 13, fontWeight: 700, color: "var(--text-dim)" }}>
              {session.user.name ?? "Profile"}
            </span>
          </Link>
        </div>
      ) : (
        // eslint-disable-next-line @next/next/no-html-link-for-pages -- full navigation into a route handler, not a page
        <a
          href="/api/auth/steam"
          style={{
            fontWeight: 800,
            fontSize: 12,
            letterSpacing: ".06em",
            padding: "10px 18px",
            borderRadius: 5,
            color: "var(--bg)",
            background: "linear-gradient(90deg, var(--micro), var(--meso), var(--macro))",
          }}
        >
          CONNECT STEAM
        </a>
      )}
    </nav>
  );
}

const navLinkStyle: CSSProperties = {
  fontSize: 13,
  fontWeight: 700,
  color: "var(--text-dim)",
  letterSpacing: ".02em",
};
