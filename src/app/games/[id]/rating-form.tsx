"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Axis = "micro" | "meso" | "macro";

const AXIS_COPY: Record<Axis, { label: string; description: string }> = {
  micro: { label: "Micro", description: "Reflexes, aim, inputs, mechanical control." },
  meso: { label: "Meso", description: "Awareness, information, tactical reading." },
  macro: { label: "Macro", description: "Strategy, planning, resource and tempo over time." },
};

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
  const [result, setResult] = useState<Record<Axis, number> | null>(null);
  const [submitting, setSubmitting] = useState(false);

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
      <h2>Rate this game</h2>
      {(Object.keys(AXIS_COPY) as Axis[]).map((axis) => (
        <div key={axis} style={{ margin: "16px 0" }}>
          <label>
            <strong>{AXIS_COPY[axis].label}</strong> — {AXIS_COPY[axis].description}
            <br />
            <input
              type="range"
              min={0}
              max={100}
              value={draft[axis]}
              onChange={(e) => setDraft((d) => ({ ...d, [axis]: Number(e.target.value) }))}
            />{" "}
            {draft[axis]}
          </label>
        </div>
      ))}
      <button onClick={submit} disabled={submitting}>
        {submitting ? "Saving…" : "Submit rating"}
      </button>

      {result && (
        <div style={{ marginTop: 24 }}>
          <h3>Your rating vs. the crowd</h3>
          {(Object.keys(AXIS_COPY) as Axis[]).map((axis) => {
            const crowd = crowdAverage[axis];
            const delta = crowd != null ? result[axis] - crowd : null;
            return (
              <p key={axis}>
                {AXIS_COPY[axis].label}: you {result[axis]} · crowd {crowd?.toFixed(1) ?? "—"}{" "}
                {delta != null && (delta > 0 ? `(+${delta.toFixed(1)})` : `(${delta.toFixed(1)})`)}
              </p>
            );
          })}
        </div>
      )}
    </div>
  );
}
