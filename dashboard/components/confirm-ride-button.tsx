"use client";

import { useState } from "react";

export function ConfirmRideButton({
  rideId,
  alreadyConfirmed,
}: {
  rideId: string;
  alreadyConfirmed: boolean;
}) {
  const [confirmed, setConfirmed] = useState(alreadyConfirmed);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  if (confirmed) {
    return (
      <span className="mt-1 flex items-center gap-0.5 text-[10px] font-semibold text-emerald-600">
        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
        </svg>
        Confirmed
      </span>
    );
  }

  async function handleConfirm(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (loading) return;
    setLoading(true);
    setError(false);
    try {
      const res = await fetch(`/api/rides/${rideId}/confirm`, { method: "POST" });
      if (res.ok) setConfirmed(true);
      else setError(true);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      onClick={handleConfirm}
      disabled={loading}
      className="mt-1 w-full text-[10px] font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded px-1 py-0.5 transition-colors disabled:opacity-50 leading-none"
    >
      {loading ? "…" : error ? "Retry" : "Confirm"}
    </button>
  );
}
