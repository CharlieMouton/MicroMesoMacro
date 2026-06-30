"use client";

import Link from "next/link";
import Image from "next/image";
import { useState, useEffect, useCallback } from "react";
import type { Axis } from "@/lib/axes";

type GameRow = {
  game: { id: string; title: string; headerImage: string | null; steamAppId: number | null };
  crowd: { micro: number | null; meso: number | null; macro: number | null };
  ownRating: { micro: number; meso: number; macro: number } | null;
};

export function LibraryGrid({ sort }: { sort: string }) {
  const [rows, setRows] = useState<GameRow[]>([]);
  const [cursor, setCursor] = useState<number | null>(0);
  const [total, setTotal] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchNext = useCallback(async (currentCursor: number, currentSort: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/library?sort=${currentSort}&cursor=${currentCursor}`);
      if (!res.ok) throw new Error("Failed to load library");
      const data = await res.json();
      setRows((prev) => (currentCursor === 0 ? data.rows : [...prev, ...data.rows]));
      setCursor(data.nextCursor);
      setTotal(data.total);
    } catch {
      setError("Failed to load games. Please refresh.");
    } finally {
      setLoading(false);
    }
  }, []);

  // Reset and reload when sort changes
  useEffect(() => {
    setRows([]);
    setCursor(0);
    setTotal(null);
    fetchNext(0, sort);
  }, [sort, fetchNext]);

  const loadMore = () => {
    if (cursor != null && !loading) fetchNext(cursor, sort);
  };

  if (error) {
    return <p style={{ marginTop: 16, color: "var(--text-dim)", fontSize: 13 }}>{error}</p>;
  }

  return (
    <div>
      {rows.length === 0 && loading ? (
        <LoadingGrid />
      ) : (
        <>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(258px, 1fr))",
              gap: 16,
              marginTop: 26,
            }}
          >
            {rows.map(({ game, crowd, ownRating }) => (
              <GameCard key={game.id} game={game} crowd={crowd} ownRating={ownRating} />
            ))}
          </div>

          {loading && (
            <p style={{ marginTop: 24, fontSize: 12, color: "var(--text-faint)", textAlign: "center" }}>
              Loading more games…
            </p>
          )}

          {!loading && cursor != null && (
            <div style={{ marginTop: 32, textAlign: "center" }}>
              <button
                onClick={loadMore}
                style={{
                  fontSize: 12,
                  fontWeight: 700,
                  letterSpacing: ".08em",
                  padding: "12px 24px",
                  borderRadius: 5,
                  border: "1px solid var(--border-dim)",
                  background: "var(--panel)",
                  color: "var(--text-dim)",
                  cursor: "pointer",
                }}
              >
                LOAD MORE
                {total != null ? ` (${rows.length} / ${total})` : ""}
              </button>
            </div>
          )}

          {!loading && cursor == null && total != null && rows.length > 0 && (
            <p style={{ marginTop: 24, fontSize: 12, color: "var(--text-faint)", textAlign: "center" }}>
              All {total} games loaded
            </p>
          )}
        </>
      )}
    </div>
  );
}

function LoadingGrid() {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fill, minmax(258px, 1fr))",
        gap: 16,
        marginTop: 26,
      }}
    >
      {Array.from({ length: 12 }).map((_, i) => (
        <div
          key={i}
          style={{
            background: "var(--panel)",
            border: "1px solid var(--border-dim)",
            borderRadius: 7,
            overflow: "hidden",
          }}
        >
          <div
            style={{
              aspectRatio: "460 / 215",
              background: "var(--panel)",
              animation: "pulse 1.6s ease-in-out infinite",
            }}
          />
          <div style={{ padding: "14px 14px 15px" }}>
            <div
              style={{
                height: 14,
                borderRadius: 3,
                background: "#1c1c24",
                width: "70%",
                animation: "pulse 1.6s ease-in-out infinite",
              }}
            />
            <div
              style={{
                height: 11,
                borderRadius: 3,
                background: "#1c1c24",
                width: "50%",
                marginTop: 14,
                animation: "pulse 1.6s ease-in-out infinite",
              }}
            />
          </div>
        </div>
      ))}
      <style>{`@keyframes pulse { 0%,100%{opacity:.4} 50%{opacity:.8} }`}</style>
    </div>
  );
}

function GameCard({
  game,
  crowd,
  ownRating,
}: {
  game: { id: string; title: string; headerImage: string | null; steamAppId: number | null };
  crowd: { micro: number | null; meso: number | null; macro: number | null };
  ownRating: { micro: number; meso: number; macro: number } | null;
}) {
  const bannerImage = game.steamAppId
    ? `https://cdn.akamai.steamstatic.com/steam/apps/${game.steamAppId}/header.jpg`
    : game.headerImage;

  const initials = game.title
    .replace(/[^A-Za-z0-9 ]/g, "")
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();

  return (
    <Link
      href={`/games/${game.id}`}
      style={{
        background: "var(--panel)",
        border: "1px solid var(--border-dim)",
        borderRadius: 7,
        overflow: "hidden",
        display: "block",
      }}
    >
      <div
        style={{
          aspectRatio: "460 / 215",
          position: "relative",
          background: "linear-gradient(135deg, var(--micro-dim) -20%, #0e0e14 65%)",
          display: "flex",
          alignItems: "flex-end",
          padding: 12,
        }}
      >
        {bannerImage && (
          <Image src={bannerImage} alt="" fill sizes="258px" style={{ objectFit: "cover" }} />
        )}
        <div style={{ position: "absolute", top: 10, right: 11 }}>
          {ownRating ? (
            <span
              style={{
                fontSize: 10,
                letterSpacing: ".12em",
                color: "var(--macro)",
                background: "rgba(76,201,240,.12)",
                border: "1px solid var(--macro-dim)",
                padding: "3px 7px",
                borderRadius: 3,
              }}
            >
              RATED
            </span>
          ) : (
            <span
              style={{
                fontSize: 10,
                letterSpacing: ".12em",
                color: "var(--text-dim)",
                background: "rgba(0,0,0,.35)",
                border: "1px solid rgba(255,255,255,.08)",
                padding: "3px 7px",
                borderRadius: 3,
              }}
            >
              UNRATED
            </span>
          )}
        </div>
        {!bannerImage && (
          <div style={{ fontSize: 30, fontWeight: 800, color: "rgba(255,255,255,.13)", letterSpacing: "-.02em" }}>
            {initials}
          </div>
        )}
      </div>
      <div style={{ padding: "14px 14px 15px" }}>
        <div style={{ fontSize: 14, fontWeight: 700, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
          {game.title}
        </div>

        {ownRating ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 7, marginTop: 14 }}>
            <AxisBar axis="micro" value={crowd.micro} />
            <AxisBar axis="meso" value={crowd.meso} />
            <AxisBar axis="macro" value={crowd.macro} />
          </div>
        ) : (
          <p style={{ fontSize: 11, color: "var(--text-faint)", marginTop: 14, lineHeight: 1.5 }}>
            Rate this game to reveal the crowd average.
          </p>
        )}

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginTop: 12,
            paddingTop: 11,
            borderTop: "1px solid var(--border-dim)",
          }}
        >
          <span style={{ fontSize: 11, color: "var(--text-faint)" }}>{ownRating ? "crowd avg" : "unrated"}</span>
          <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: ".08em", color: ownRating ? "var(--macro)" : "var(--meso)" }}>
            {ownRating ? "UPDATE" : "RATE →"}
          </span>
        </div>
      </div>
    </Link>
  );
}

function AxisBar({ axis, value }: { axis: Axis; value: number | null }) {
  const label = axis === "micro" ? "MIC" : axis === "meso" ? "MES" : "MAC";
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <span style={{ width: 28, fontSize: 10, letterSpacing: ".1em", color: `var(--${axis})`, fontWeight: 700 }}>
        {label}
      </span>
      <div style={{ flex: 1, height: 5, borderRadius: 3, background: "#1c1c24", overflow: "hidden" }}>
        <div
          style={{
            height: "100%",
            width: `${value ?? 0}%`,
            background: `linear-gradient(90deg, var(--${axis}-dim), var(--${axis}))`,
          }}
        />
      </div>
      <span style={{ width: 22, textAlign: "right", fontSize: 11, color: "#cacad4" }}>
        {value != null ? Math.round(value) : "—"}
      </span>
    </div>
  );
}
