"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function HideHyroxButton() {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleHide() {
    setLoading(true);
    try {
      await fetch("/api/profile/preferences", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ showHyroxTab: false }),
      });
      router.push("/");
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      onClick={handleHide}
      disabled={loading}
      className="text-[10px] font-medium transition-opacity disabled:opacity-50"
      style={{ color: "rgba(255,255,255,0.2)" }}
    >
      {loading ? "Hiding…" : "Hide HYROX tab →"}
    </button>
  );
}
