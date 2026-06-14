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

  async function handleConfirm(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (loading || confirmed) return;
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

  if (confirmed) {
    return (
      <div className="flex items-center gap-1 text-[10px] font-semibold text-emerald-600 bg-emerald-50 border border-emerald-200 rounded px-2 py-1 w-full justify-center">
        <svg className="w-3 h-3 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
        </svg>
        Confirmed
      </div>
    );
  }

  return (
    <button
      onClick={handleConfirm}
      disabled={loading}
      className={`w-full text-[11px] font-semibold rounded px-2 py-1 transition-colors leading-none border ${
        error
          ? "bg-rose-50 border-rose-200 text-rose-600 hover:bg-rose-100"
          : "bg-slate-800 border-slate-800 text-white hover:bg-slate-700"
      } disabled:opacity-40`}
    >
      {loading ? "Sending…" : error ? "Failed — Retry" : "Send Confirmation"}
    </button>
  );
}
