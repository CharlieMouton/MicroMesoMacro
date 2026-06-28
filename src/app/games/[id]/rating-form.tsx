"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AXES, AXIS_COPY, type Axis } from "@/lib/axes";

export function RatingForm({
  gameId,
  initial,
  crowdAverage,
}: {
  gameId: string;
  initial: Record<Axis, number>;
  crowdAverage: Record<Axis, number | null>;
}) {
  const router = useRouter();
  const [draft, setDraft] = useState(initial);
  const [dragAxis, setDragAxis] = useState<Axis | null>(null);
  const [result, setResult] = useState<Record<Axis, number> | null>(null);
  const [submitting, setSubmitting] = useState(false);
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
    const res = await fetch("/api/ratings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ gameId, ...draft }),
    });
    setSubmitting(false);
    if (res.ok) {
      setResult(draft);
      router.refresh();
    }
  }

  return (
    <div>
      <div
        style={{
          margin: "28px 0 4px",
          paddingTop: 24,
          borderTop: "1px solid var(--border-dim)",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "baseline",
        }}
      >
        <div style={{ fontSize: 12, letterSpacing: ".2em", textTransform: "uppercase", color: "var(--text-faint)" }}>
          Rate this game
        </div>
      </div>

      {AXES.map((axis) => (
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
      </div>

      {result && (
        <div style={{ marginTop: 30 }}>
          <h3
            style={{
              fontSize: 12,
              letterSpacing: ".18em",
              textTransform: "uppercase",
              color: "var(--macro)",
              marginBottom: 16,
            }}
          >
            ✓ Rating locked — vs the crowd
          </h3>
          {AXES.map((axis) => {
            const crowd = crowdAverage[axis];
            const delta = crowd != null ? result[axis] - crowd : null;
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
                      width: `${result[axis]}%`,
                      background: `linear-gradient(90deg, var(--${axis}-dim), var(--${axis}))`,
                    }}
                  />
                  {crowd != null && (
                    <div style={{ position: "absolute", top: 0, bottom: 0, left: `${crowd}%`, width: 2, background: "var(--text)" }} />
                  )}
                </div>
                <div style={{ display: "flex", gap: 18, marginTop: 8, fontSize: 12, color: "var(--text-dim)" }}>
                  <span>
                    YOU <b style={{ color: `var(--${axis})` }}>{result[axis]}</b>
                  </span>
                  <span>
                    CROWD <b style={{ color: "var(--text)" }}>{crowd?.toFixed(1) ?? "—"}</b>
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
