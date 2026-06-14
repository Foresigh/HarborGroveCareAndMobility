export const dynamic = "force-dynamic";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { ConfirmRideButton } from "@/components/confirm-ride-button";

const STATUS_STYLE: Record<string, { card: string; badge: string; label: string }> = {
  SCHEDULED: { card: "bg-white border-l-blue-500",   badge: "bg-blue-100 text-blue-700",    label: "Scheduled" },
  EN_ROUTE:  { card: "bg-amber-50 border-l-amber-500", badge: "bg-amber-100 text-amber-700", label: "En Route"  },
  PICKED_UP: { card: "bg-sky-50 border-l-sky-500",   badge: "bg-sky-100 text-sky-700",      label: "In Transit"},
  COMPLETED: { card: "bg-emerald-50 border-l-emerald-500", badge: "bg-emerald-100 text-emerald-700", label: "Completed" },
  CANCELLED: { card: "bg-slate-50 border-l-slate-300",  badge: "bg-slate-100 text-slate-400",  label: "Cancelled" },
  NO_SHOW:   { card: "bg-rose-50 border-l-rose-400",  badge: "bg-rose-100 text-rose-600",    label: "No Show"  },
};

function getWeekDays(baseDate: Date): Date[] {
  const day = baseDate.getDay();
  const monday = new Date(baseDate);
  monday.setDate(baseDate.getDate() - (day === 0 ? 6 : day - 1));
  monday.setHours(0, 0, 0, 0);
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return d;
  });
}

export default async function CalendarPage({
  searchParams,
}: {
  searchParams: Promise<{ week?: string }>;
}) {
  const params = await searchParams;
  const base = params.week ? new Date(params.week) : new Date();
  const days = getWeekDays(base);
  const start = days[0];
  const end = new Date(days[6]);
  end.setHours(23, 59, 59, 999);

  const rides = await prisma.ride.findMany({
    where: { scheduledAt: { gte: start, lte: end } },
    include: { client: true, driver: true },
    orderBy: { scheduledAt: "asc" },
  });

  const ridesByDay = days.map((d) => ({
    date: d,
    rides: rides.filter((r) => new Date(r.scheduledAt).toDateString() === d.toDateString()),
  }));

  const prevWeek = new Date(start);
  prevWeek.setDate(prevWeek.getDate() - 7);
  const nextWeek = new Date(start);
  nextWeek.setDate(nextWeek.getDate() + 7);

  const totalRides = rides.length;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link
            href={`/calendar?week=${prevWeek.toISOString().split("T")[0]}`}
            className="border border-slate-200 rounded-lg px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition-colors"
          >
            ← Prev
          </Link>
          <div className="text-center">
            <div className="text-sm font-bold text-slate-800">
              {start.toLocaleDateString("en-US", { month: "long", day: "numeric" })} –{" "}
              {days[6].toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
            </div>
            {totalRides > 0 && (
              <div className="text-xs text-slate-400 mt-0.5">{totalRides} ride{totalRides !== 1 ? "s" : ""} this week</div>
            )}
          </div>
          <Link
            href={`/calendar?week=${nextWeek.toISOString().split("T")[0]}`}
            className="border border-slate-200 rounded-lg px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition-colors"
          >
            Next →
          </Link>
        </div>
        <Link
          href="/rides/new"
          className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold px-4 py-2 rounded-lg transition-colors"
        >
          + Book Ride
        </Link>
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7 gap-2">
        {ridesByDay.map(({ date, rides: dayRides }) => {
          const isToday = date.toDateString() === new Date().toDateString();
          return (
            <div
              key={date.toISOString()}
              className={`rounded-xl border min-h-[160px] flex flex-col ${
                isToday
                  ? "border-blue-400 bg-blue-50/40 ring-2 ring-blue-100"
                  : "border-slate-200 bg-white"
              }`}
            >
              {/* Day header */}
              <div className={`px-2.5 pt-2.5 pb-2 border-b ${isToday ? "border-blue-200" : "border-slate-100"}`}>
                <div className={`text-[11px] font-semibold uppercase tracking-wide ${isToday ? "text-blue-500" : "text-slate-400"}`}>
                  {date.toLocaleDateString("en-US", { weekday: "short" })}
                </div>
                <div className={`text-xl font-bold leading-none mt-0.5 ${isToday ? "text-blue-700" : "text-slate-800"}`}>
                  {date.getDate()}
                </div>
                {dayRides.length > 0 && (
                  <div className={`text-[10px] mt-1 font-medium ${isToday ? "text-blue-400" : "text-slate-400"}`}>
                    {dayRides.length} ride{dayRides.length !== 1 ? "s" : ""}
                  </div>
                )}
              </div>

              {/* Ride cards */}
              <div className="p-1.5 space-y-1.5 flex-1">
                {dayRides.map((r) => {
                  const style = STATUS_STYLE[r.status] ?? STATUS_STYLE.SCHEDULED;
                  const name = r.requestedName ?? `${r.client.firstName} ${r.client.lastName}`;
                  const time = new Date(r.scheduledAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
                  return (
                    <div
                      key={r.id}
                      className={`rounded-lg border border-slate-200 border-l-4 shadow-sm overflow-hidden ${style.card}`}
                    >
                      <Link href={`/rides/${r.id}`} className="block px-2 pt-2 pb-1.5 hover:bg-black/[.03] transition-colors">
                        <div className="font-semibold text-[12px] text-slate-800 leading-tight truncate">{name}</div>
                        <div className="text-[11px] text-slate-500 mt-0.5">{time}</div>
                        <span className={`inline-block mt-1.5 text-[10px] font-semibold px-1.5 py-0.5 rounded-full leading-none ${style.badge}`}>
                          {style.label}
                        </span>
                      </Link>
                      {r.status === "SCHEDULED" && (
                        <div className="px-2 pb-2">
                          <ConfirmRideButton rideId={r.id} alreadyConfirmed={!!r.confirmedAt} />
                        </div>
                      )}
                    </div>
                  );
                })}
                {dayRides.length === 0 && (
                  <div className="flex items-center justify-center h-16 text-xs text-slate-300 select-none">
                    No rides
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
