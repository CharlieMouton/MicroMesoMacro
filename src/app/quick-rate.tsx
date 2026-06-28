"use client";

import { useEffect, useState, type CSSProperties } from "react";
import Image from "next/image";
import { RatingForm } from "./games/[id]/rating-form";

interface GameDetail {
  game: { id: string; title: string; headerImage: string | null };
  crowdAverage: { micro: number | null; meso: number | null; macro: number | null };
  ownRating: { micro: number; meso: number; macro: number } | null;
}

export function QuickRate({ signedIn }: { signedIn: boolean }) {
  const [detail, setDetail] = useState<GameDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [exhausted, setExhausted] = useState(false);
  const [requestId, setRequestId] = useState(0);

  // Two-step fetch (pick a random game, then load its detail) lives entirely
  // inside .then() callbacks rather than a separately invoked async
  // function — react-hooks/set-state-in-effect flags effects that call out
  // to a function that eventually sets state, even after an await.
  useEffect(() => {
    let active = true;
    fetch("/api/games/random")
      .then((res) => res.json())
      .then((randomData) => {
        if (!active) return;
        if (!randomData.game) {
          setExhausted(true);
          setLoading(false);
          return;
        }
        return fetch(`/api/games/${randomData.game.id}`)
          .then((res) => res.json())
          .then((detailData) => {
            if (!active) return;
            setDetail(detailData);
            setLoading(false);
          });
      });
    return () => {
      active = false;
    };
  }, [requestId]);

  function skip() {
    setLoading(true);
    setDetail(null);
    setRequestId((id) => id + 1);
  }

  if (loading) {
    return (
      <div style={quickRateBoxStyle}>
        <span style={{ color: "var(--text-faint)", fontSize: 13 }}>Finding a game to rate…</span>
      </div>
    );
  }

  if (exhausted || !detail) {
    return (
      <div style={quickRateBoxStyle}>
        <span style={{ color: "var(--text-faint)", fontSize: 13 }}>
          You&apos;ve rated everything in your library — nice work.
        </span>
      </div>
    );
  }

  const { game, crowdAverage, ownRating } = detail;

  return (
    <div style={{ background: "var(--panel)", border: "1px solid var(--border-dim)", borderRadius: 7, padding: 22 }}>
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
          <div style={{ fontSize: 18, fontWeight: 700, marginTop: 2 }}>{game.title}</div>
        </div>
      </div>

      <RatingForm
        key={game.id}
        gameId={game.id}
        initial={ownRating ? { micro: ownRating.micro, meso: ownRating.meso, macro: ownRating.macro } : { micro: 50, meso: 50, macro: 50 }}
        crowdAverage={ownRating ? crowdAverage : null}
        alreadyRated={!!ownRating}
        signedIn={signedIn}
        secondaryAction={{ label: "SKIP", onClick: skip }}
      />
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
