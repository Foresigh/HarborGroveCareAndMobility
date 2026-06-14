"use client";

export function DateFilter({ defaultValue, status }: { defaultValue: string; status?: string }) {
  return (
    <div className="relative">
      <input
        type="date"
        defaultValue={defaultValue}
        onChange={(e) => {
          const date = e.target.value;
          const statusParam = status ? `&status=${status}` : "";
          window.location.href = date ? `/rides?date=${date}${statusParam}` : `/rides${status ? `?status=${status}` : ""}`;
        }}
        className="border border-slate-200 rounded-lg px-3 py-1.5 text-xs text-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
        placeholder="Filter by date"
      />
    </div>
  );
}
