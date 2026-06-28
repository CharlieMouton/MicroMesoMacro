"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function SyncButton() {
  const router = useRouter();
  const [syncing, setSyncing] = useState(false);

  async function sync() {
    setSyncing(true);
    await fetch("/api/steam/sync", { method: "POST" });
    setSyncing(false);
    router.refresh();
  }

  return (
    <button
      onClick={sync}
      disabled={syncing}
      style={{
        border: "1px solid var(--border)",
        cursor: "pointer",
        fontWeight: 700,
        fontSize: 12,
        letterSpacing: ".06em",
        padding: "11px 18px",
        borderRadius: 5,
        color: "var(--text-dim)",
        background: "transparent",
      }}
    >
      {syncing ? "SYNCING…" : "SYNC STEAM LIBRARY"}
    </button>
  );
}
