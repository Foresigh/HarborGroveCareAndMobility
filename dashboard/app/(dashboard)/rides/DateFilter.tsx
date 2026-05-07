"use client";

export function DateFilter({ defaultValue, status }: { defaultValue: string; status?: string }) {
  return (
    <input
      type="date"
      defaultValue={defaultValue}
      onChange={(e) => {
        window.location.href = `/rides?date=${e.target.value}${status ? `&status=${status}` : ""}`;
      }}
      className="border border-slate-200 rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
    />
  );
}
