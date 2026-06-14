export const dynamic = "force-dynamic";
import { prisma } from "@/lib/prisma";
import Link from "next/link";

const statusColor: Record<string, string> = {
  SCHEDULED: "bg-blue-100 text-blue-700 border-blue-200",
  EN_ROUTE: "bg-amber-100 text-amber-700 border-amber-200",
  PICKED_UP: "bg-sky-100 text-sky-700 border-sky-200",
  COMPLETED: "bg-emerald-100 text-emerald-700 border-emerald-200",
  CANCELLED: "bg-slate-100 text-slate-400 border-slate-200",
  NO_SHOW: "bg-rose-100 text-rose-700 border-rose-200",
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
    rides: rides.filter((r) => {
      const rd = new Date(r.scheduledAt);
      return rd.toDateString() === d.toDateString();
    }),
  }));

  const prevWeek = new Date(start);
  prevWeek.setDate(prevWeek.getDate() - 7);
  const nextWeek = new Date(start);
  nextWeek.setDate(nextWeek.getDate() + 7);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href={`/calendar?week=${prevWeek.toISOString().split("T")[0]}`} className="border border-slate-200 rounded-lg px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50">← Prev</Link>
          <span className="text-sm font-semibold text-slate-800">
            {start.toLocaleDateString("en-US", { month: "long", day: "numeric" })} – {days[6].toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
          </span>
          <Link href={`/calendar?week=${nextWeek.toISOString().split("T")[0]}`} className="border border-slate-200 rounded-lg px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50">Next →</Link>
        </div>
        <Link href="/rides/new" className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold px-4 py-2 rounded-lg transition-colors">+ Book Ride</Link>
      </div>

      <div className="grid grid-cols-7 gap-2">
        {ridesByDay.map(({ date, rides: dayRides }) => {
          const isToday = date.toDateString() === new Date().toDateString();
          return (
            <div key={date.toISOString()} className={`bg-white rounded-xl border min-h-[140px] p-2 ${isToday ? "border-blue-400 ring-2 ring-blue-100" : "border-slate-200"}`}>
              <div className={`text-xs font-bold mb-2 ${isToday ? "text-blue-600" : "text-slate-500"}`}>
                <div>{date.toLocaleDateString("en-US", { weekday: "short" })}</div>
                <div className={`text-lg leading-none ${isToday ? "text-blue-700" : "text-slate-800"}`}>{date.getDate()}</div>
              </div>
              <div className="space-y-1">
                {dayRides.map((r) => (
                  <Link
                    key={r.id}
                    href={`/rides/${r.id}`}
                    className={`block rounded px-1.5 py-1 text-xs border truncate hover:opacity-80 transition-opacity ${statusColor[r.status] ?? "bg-slate-100 text-slate-600"}`}
                  >
                    {r.scheduledAt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}{" "}
                    {r.requestedName ?? `${r.client.firstName} ${r.client.lastName[0]}.`}
                  </Link>
                ))}
                {dayRides.length === 0 && <div className="text-xs text-slate-300 text-center pt-2">—</div>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
