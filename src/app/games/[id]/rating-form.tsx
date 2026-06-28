"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AXES, AXIS_COPY, type Axis } from "@/lib/axes";

export function RatingForm({
  gameId,
  initial,
  crowdAverage,
  alreadyRated,
  showHeading = true,
  lockAfterSubmit = false,
  secondaryAction,
}: {
  gameId: string;
  initial: Record<Axis, number>;
  crowdAverage: (Record<Axis, number | null> & { ratingCount?: number }) | null;
  alreadyRated: boolean;
  /** The game detail page has no other heading above the form; quick-rate
   * shows its own heading above the game title instead, so it passes false. */
  showHeading?: boolean;
  /** After a successful submit, hide the sliders/submit button and show only
   * the result comparison — used by quick-rate so people see how they
   * compare to the crowd before immediately re-editing what they just rated. */
  lockAfterSubmit?: boolean;
  /** Renders an extra button next to Submit — used by the home page's
   * "quick rate" widget to put Skip alongside Submit. */
  secondaryAction?: { label: string; onClick: () => void };
}) {
  const router = useRouter();
  const [draft, setDraft] = useState(initial);
  const [dragAxis, setDragAxis] = useState<Axis | null>(null);
  const [result, setResult] = useState<Record<Axis, number> | null>(null);
  const [crowd, setCrowd] = useState(crowdAverage);
  const [submitting, setSubmitting] = useState(false);
  const [locked, setLocked] = useState(false);
  const refs: Record<Axis, React.RefObject<HTMLDivElement | null>> = {
    micro: useRef(null),
    meso: useRef(null),
    macro: useRef(null),
  };

  function setAxis(axis: Axis, clientX: number) {
    const el = refs[axis].current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const p = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    setDraft((d) => ({ ...d, [axis]: Math.round(p * 100) }));
  }

  function onDown(axis: Axis, e: React.PointerEvent<HTMLDivElement>) {
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      /* ignore */
    }
    setDragAxis(axis);
    setAxis(axis, e.clientX);
  }

  function onMove(axis: Axis, e: React.PointerEvent<HTMLDivElement>) {
    if (dragAxis !== axis) return;
    setAxis(axis, e.clientX);
  }

  function onKey(axis: Axis, e: React.KeyboardEvent<HTMLDivElement>) {
    const step = e.shiftKey ? 10 : 1;
    let delta = 0;
    if (e.key === "ArrowRight" || e.key === "ArrowUp") delta = step;
    else if (e.key === "ArrowLeft" || e.key === "ArrowDown") delta = -step;
    else return;
    e.preventDefault();
    setDraft((d) => ({ ...d, [axis]: Math.max(0, Math.min(100, d[axis] + delta)) }));
  }

  async function submit() {
    setSubmitting(true);
    // Anonymous visitors save too — /api/ratings mints a cookie-backed
    // guest identity for them if there's no Steam session.
    const res = await fetch("/api/ratings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ gameId, ...draft }),
    });
    if (res.ok) {
      setResult(draft);
      // Crowd average is hidden from the GET route until the caller has a
      // rating on file — now that we've just submitted one, re-fetch it.
      const detail = await fetch(`/api/games/${gameId}`);
      if (detail.ok) {
        const data = await detail.json();
        setCrowd(data.crowdAverage);
      }
      if (lockAfterSubmit) setLocked(true);
      router.refresh();
    }
    setSubmitting(false);
  }

  return (
    <div>
      {showHeading && (
        <div
          style={{
            margin: "28px 0 4px",
            paddingTop: 24,
            borderTop: "1px solid var(--border-dim)",
          }}
        >
          <div style={{ fontSize: 12, letterSpacing: ".2em", textTransform: "uppercase", color: "var(--text-faint)" }}>
            Rate this game
          </div>
        </div>
      )}

      {!locked && AXES.map((axis) => (
        <div key={axis} style={{ margin: "30px 0 34px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 16 }}>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ color: `var(--${axis})`, fontSize: 21, fontWeight: 800, letterSpacing: ".04em" }}>
                  {AXIS_COPY[axis].label.toUpperCase()}
                </span>
                <span style={{ fontSize: 11, letterSpacing: ".16em", color: "var(--text-faint)" }}>
                  {AXIS_COPY[axis].tag.toUpperCase()}
                </span>
              </div>
              <p style={{ color: "var(--text-dim)", fontSize: 12, marginTop: 7, maxWidth: 440 }}>
                {AXIS_COPY[axis].description}
              </p>
            </div>
            <div style={{ fontSize: 44, fontWeight: 800, color: `var(--${axis})`, fontVariantNumeric: "tabular-nums" }}>
              {draft[axis]}
            </div>
          </div>

          <div
            ref={refs[axis]}
            tabIndex={0}
            onPointerDown={(e) => onDown(axis, e)}
            onPointerMove={(e) => onMove(axis, e)}
            onPointerUp={() => setDragAxis(null)}
            onPointerCancel={() => setDragAxis(null)}
            onKeyDown={(e) => onKey(axis, e)}
            style={{
              position: "relative",
              height: 34,
              display: "flex",
              alignItems: "center",
              cursor: "pointer",
              touchAction: "none",
              outline: "none",
            }}
          >
            <div
              style={{
                position: "absolute",
                left: 0,
                right: 0,
                height: 12,
                borderRadius: 7,
                background: "#15151d",
                border: "1px solid var(--border-dim)",
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  position: "absolute",
                  left: 0,
                  top: 0,
                  bottom: 0,
                  width: `${draft[axis]}%`,
                  background: `linear-gradient(90deg, var(--${axis}-dim), var(--${axis}))`,
                }}
              />
            </div>
            <div
              style={{
                position: "absolute",
                left: `calc(16px + ${draft[axis]} * (100% - 32px) / 100)`,
                transform: "translateX(-50%)",
                width: 28,
                height: 28,
                borderRadius: "50%",
                background: "#0e0e14",
                border: `3px solid var(--${axis})`,
                pointerEvents: "none",
              }}
            />
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", marginTop: 11 }}>
            <span style={{ fontSize: 10, letterSpacing: ".14em", color: "#72727e" }}>00 · NONE</span>
            <span style={{ fontSize: 10, letterSpacing: ".14em", color: "#72727e" }}>50</span>
            <span style={{ fontSize: 10, letterSpacing: ".14em", color: "#72727e" }}>EXTREME · 100</span>
          </div>
        </div>
      ))}

      {!locked && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 16,
            marginTop: 16,
            paddingTop: 24,
            borderTop: "1px solid var(--border-dim)",
          }}
        >
          <button
            onClick={submit}
            disabled={submitting}
            style={{
              border: "none",
              cursor: "pointer",
              fontWeight: 800,
              fontSize: 13,
              letterSpacing: ".08em",
              padding: "15px 30px",
              borderRadius: 5,
              color: "var(--bg)",
              background: "linear-gradient(90deg, var(--micro), var(--meso), var(--macro))",
            }}
          >
            {submitting ? "SAVING…" : result ? "UPDATE RATING" : "SUBMIT RATING"}
          </button>
          {secondaryAction && (
            <button
              onClick={secondaryAction.onClick}
              style={{
                cursor: "pointer",
                fontWeight: 700,
                fontSize: 12,
                letterSpacing: ".06em",
                padding: "14px 20px",
                borderRadius: 5,
                color: "var(--text-dim)",
                background: "transparent",
                border: "1px solid var(--border)",
              }}
            >
              {secondaryAction.label}
            </button>
          )}
        </div>
      )}

      {(result || alreadyRated) && (
        <div style={{ marginTop: locked ? 0 : 30 }}>
          <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between" }}>
            <h3
              style={{
                fontSize: 12,
                letterSpacing: ".18em",
                textTransform: "uppercase",
                color: "var(--macro)",
                marginBottom: 16,
              }}
            >
              ✓ Your rating vs the crowd
            </h3>
            {typeof crowd?.ratingCount === "number" && (
              <span style={{ fontSize: 11, color: "var(--text-faint)" }}>
                {crowd.ratingCount} {crowd.ratingCount === 1 ? "rating" : "ratings"}
              </span>
            )}
          </div>
          {AXES.map((axis) => {
            const mine = result ?? initial;
            const crowdValue = crowd?.[axis] ?? null;
            const delta = crowdValue != null ? mine[axis] - crowdValue : null;
            const deltaColor = delta == null ? "var(--text-dim)" : delta > 0 ? `var(--${axis})` : "var(--text-dim)";
            return (
              <div key={axis} style={{ marginTop: 18 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                  <span style={{ color: `var(--${axis})`, fontSize: 15, fontWeight: 800, letterSpacing: ".04em" }}>
                    {AXIS_COPY[axis].label.toUpperCase()}
                  </span>
                  <span style={{ fontSize: 20, fontWeight: 800, color: deltaColor, fontVariantNumeric: "tabular-nums" }}>
                    {delta == null ? "—" : delta === 0 ? "±0" : delta > 0 ? `+${delta.toFixed(1)}` : delta.toFixed(1)}
                  </span>
                </div>
                <div
                  style={{
                    position: "relative",
                    height: 10,
                    marginTop: 10,
                    borderRadius: 6,
                    background: "#15151d",
                    border: "1px solid var(--border-dim)",
                    overflow: "hidden",
                  }}
                >
                  <div
                    style={{
                      position: "absolute",
                      left: 0,
                      top: 0,
                      bottom: 0,
                      width: `${mine[axis]}%`,
                      background: `linear-gradient(90deg, var(--${axis}-dim), var(--${axis}))`,
                    }}
                  />
                  {crowdValue != null && (
                    <div style={{ position: "absolute", top: 0, bottom: 0, left: `${crowdValue}%`, width: 2, background: "var(--text)" }} />
                  )}
                </div>
                <div style={{ display: "flex", gap: 18, marginTop: 8, fontSize: 12, color: "var(--text-dim)" }}>
                  <span>
                    YOU <b style={{ color: `var(--${axis})` }}>{mine[axis]}</b>
                  </span>
                  <span>
                    CROWD <b style={{ color: "var(--text)" }}>{crowdValue?.toFixed(1) ?? "—"}</b>
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {locked && secondaryAction && (
        <button
          onClick={secondaryAction.onClick}
          style={{
            display: "block",
            width: "100%",
            marginTop: 26,
            border: "none",
            cursor: "pointer",
            fontWeight: 800,
            fontSize: 13,
            letterSpacing: ".08em",
            padding: "15px 30px",
            borderRadius: 5,
            color: "var(--bg)",
            background: "linear-gradient(90deg, var(--micro), var(--meso), var(--macro))",
          }}
        >
          NEXT GAME →
        </button>
      )}
    </div>
  );
}
