"use client";

import { useEffect, useState, type CSSProperties } from "react";
import Image from "next/image";
import Link from "next/link";

interface RandomGame {
  id: string;
  title: string;
  headerImage: string | null;
}

export function QuickRate() {
  const [game, setGame] = useState<RandomGame | null>(null);
  const [loading, setLoading] = useState(true);
  const [exhausted, setExhausted] = useState(false);
  const [requestId, setRequestId] = useState(0);

  // Re-fetches whenever requestId changes (skip bumps it). The fetch/setState
  // chain lives entirely inside .then() callbacks rather than a separately
  // invoked async function, which is what react-hooks/set-state-in-effect
  // wants — it flags effects that call out to a function that sets state,
  // even when that state update happens after an await.
  useEffect(() => {
    let active = true;
    fetch("/api/games/random")
      .then((res) => res.json())
      .then((data) => {
        if (!active) return;
        setGame(data.game);
        setExhausted(!data.game);
        setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [requestId]);

  function skip() {
    setLoading(true);
    setRequestId((id) => id + 1);
  }

  if (loading) {
    return (
      <div style={quickRateBoxStyle}>
        <span style={{ color: "var(--text-faint)", fontSize: 13 }}>Finding a game to rate…</span>
      </div>
    );
  }

  if (exhausted || !game) {
    return (
      <div style={quickRateBoxStyle}>
        <span style={{ color: "var(--text-faint)", fontSize: 13 }}>
          You&apos;ve rated everything in your library — nice work.
        </span>
      </div>
    );
  }

  return (
    <div style={quickRateBoxStyle}>
      <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
        <div
          style={{
            width: 56,
            height: 56,
            borderRadius: 5,
            flex: "none",
            position: "relative",
            overflow: "hidden",
            background: "linear-gradient(135deg, var(--micro-dim) -20%, #0e0e14 65%)",
          }}
        >
          {game.headerImage && (
            <Image src={game.headerImage} alt="" fill sizes="56px" style={{ objectFit: "cover" }} />
          )}
        </div>
        <div>
          <div style={{ fontSize: 11, letterSpacing: ".14em", color: "var(--text-faint)", textTransform: "uppercase" }}>
            Quick rate
          </div>
          <div style={{ fontSize: 16, fontWeight: 700, marginTop: 2 }}>{game.title}</div>
        </div>
      </div>
      <div style={{ display: "flex", gap: 10 }}>
        <button
          onClick={skip}
          style={{
            cursor: "pointer",
            fontWeight: 700,
            fontSize: 12,
            letterSpacing: ".06em",
            padding: "11px 16px",
            borderRadius: 5,
            color: "var(--text-dim)",
            background: "transparent",
            border: "1px solid var(--border)",
          }}
        >
          SKIP
        </button>
        <Link
          href={`/games/${game.id}`}
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
          RATE →
        </Link>
      </div>
    </div>
  );
}

const quickRateBoxStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 16,
  flexWrap: "wrap",
  background: "var(--panel)",
  border: "1px solid var(--border-dim)",
  borderRadius: 7,
  padding: 18,
};
