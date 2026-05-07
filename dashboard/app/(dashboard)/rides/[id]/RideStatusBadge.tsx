"use client";

const statusColor: Record<string, string> = {
  SCHEDULED: "bg-blue-100 text-blue-700",
  EN_ROUTE: "bg-amber-100 text-amber-700",
  PICKED_UP: "bg-sky-100 text-sky-700",
  COMPLETED: "bg-emerald-100 text-emerald-700",
  CANCELLED: "bg-slate-100 text-slate-500",
  NO_SHOW: "bg-rose-100 text-rose-700",
};

export function RideStatusBadge({ status }: { status: string }) {
  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${statusColor[status] ?? "bg-slate-100 text-slate-600"}`}>
      {status.replace("_", " ")}
    </span>
  );
}
