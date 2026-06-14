export const dynamic = "force-dynamic";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { RideStatus } from "@/lib/generated/prisma/enums";
import { DateFilter } from "./DateFilter";

const STATUS_META: Record<RideStatus, { label: string; badge: string }> = {
  SCHEDULED: { label: "Scheduled",  badge: "bg-blue-100 text-blue-700 border-blue-200" },
  EN_ROUTE:  { label: "En Route",   badge: "bg-amber-100 text-amber-700 border-amber-200" },
  PICKED_UP: { label: "In Transit", badge: "bg-sky-100 text-sky-700 border-sky-200" },
  COMPLETED: { label: "Completed",  badge: "bg-emerald-100 text-emerald-700 border-emerald-200" },
  CANCELLED: { label: "Cancelled",  badge: "bg-slate-100 text-slate-500 border-slate-200" },
  NO_SHOW:   { label: "No Show",    badge: "bg-rose-100 text-rose-600 border-rose-200" },
};

const RIDE_TYPE: Record<string, string> = {
  AMBULATORY: "Ambulatory",
  WHEELCHAIR: "Wheelchair",
  STRETCHER:  "Stretcher",
  BARIATRIC:  "Bariatric",
};

export default async function RideBoardPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; date?: string }>;
}) {
  const params = await searchParams;
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const dateFilter = params.date
    ? (() => {
        const d = new Date(params.date);
        d.setHours(0, 0, 0, 0);
        const nd = new Date(d);
        nd.setDate(nd.getDate() + 1);
        return { gte: d, lt: nd };
      })()
    : { gte: today };

  const rides = await prisma.ride.findMany({
    where: {
      scheduledAt: dateFilter,
      ...(params.status ? { status: params.status as RideStatus } : {}),
    },
    include: { client: true, driver: true, vehicle: true },
    orderBy: { scheduledAt: "asc" },
  });

  const statuses = Object.values(RideStatus) as RideStatus[];
  const showDate = !params.date;

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        {/* Status filters */}
        <div className="flex gap-1.5 flex-wrap">
          <Link
            href={params.date ? `/rides?date=${params.date}` : "/rides"}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${
              !params.status
                ? "bg-slate-800 text-white border-slate-800"
                : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
            }`}
          >
            All
          </Link>
          {statuses.map((s) => {
            const meta = STATUS_META[s];
            const active = params.status === s;
            const href = params.date
              ? `/rides?date=${params.date}&status=${s}`
              : `/rides?status=${s}`;
            return (
              <Link
                key={s}
                href={href}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${
                  active
                    ? "bg-slate-800 text-white border-slate-800"
                    : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                }`}
              >
                {meta.label}
              </Link>
            );
          })}
        </div>

        {/* Date + Book */}
        <div className="flex items-center gap-2">
          <DateFilter defaultValue={params.date ?? ""} status={params.status} />
          <Link
            href="/rides/new"
            className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold px-4 py-1.5 rounded-lg transition-colors whitespace-nowrap"
          >
            + Book Ride
          </Link>
        </div>
      </div>

      {/* Summary line */}
      <div className="text-xs text-slate-400">
        {rides.length === 0
          ? params.date ? "No rides on this date" : "No upcoming rides"
          : `${rides.length} ride${rides.length !== 1 ? "s" : ""} ${params.date ? `on ${new Date(params.date + "T00:00:00").toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}` : "upcoming"}`}
      </div>

      {/* Table */}
      {rides.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/80">
                <th className="text-left px-4 py-3 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                  {showDate ? "Date & Time" : "Time"}
                </th>
                <th className="text-left px-4 py-3 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Passenger</th>
                <th className="text-left px-4 py-3 text-[11px] font-semibold text-slate-400 uppercase tracking-wider hidden md:table-cell">Route</th>
                <th className="text-left px-4 py-3 text-[11px] font-semibold text-slate-400 uppercase tracking-wider hidden lg:table-cell">Driver</th>
                <th className="text-left px-4 py-3 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Status</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rides.map((ride) => {
                const meta = STATUS_META[ride.status];
                const displayName = ride.requestedName ?? `${ride.client.firstName} ${ride.client.lastName}`;
                const clientName = `${ride.client.firstName} ${ride.client.lastName}`;
                const nameConflict =
                  ride.requestedName &&
                  ride.requestedName.toLowerCase() !== clientName.toLowerCase();
                const dt = new Date(ride.scheduledAt);

                return (
                  <tr key={ride.id} className="hover:bg-slate-50/60 transition-colors group">
                    {/* Date / Time */}
                    <td className="px-4 py-3 whitespace-nowrap">
                      {showDate && (
                        <div className="text-[11px] text-slate-400 font-medium">
                          {dt.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}
                        </div>
                      )}
                      <div className="font-semibold text-slate-800">
                        {dt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </div>
                    </td>

                    {/* Passenger */}
                    <td className="px-4 py-3">
                      <div className="font-semibold text-slate-800 leading-tight">{displayName}</div>
                      {nameConflict && (
                        <div className="text-[11px] text-amber-600 font-medium mt-0.5">
                          On file: {clientName}
                        </div>
                      )}
                      <div className="text-[11px] text-slate-400 mt-0.5">
                        {RIDE_TYPE[ride.rideType] ?? ride.rideType}
                        {ride.confirmedAt && (
                          <span className="ml-2 text-emerald-600 font-semibold">✓ Confirmed</span>
                        )}
                      </div>
                    </td>

                    {/* Route */}
                    <td className="px-4 py-3 hidden md:table-cell max-w-[220px]">
                      <div className="text-xs text-slate-700 truncate">{ride.pickupAddress}</div>
                      <div className="flex items-center gap-1 mt-1">
                        <span className="text-slate-300 text-[10px]">↓</span>
                        <span className="text-xs text-slate-500 truncate">{ride.dropoffAddress}</span>
                      </div>
                    </td>

                    {/* Driver */}
                    <td className="px-4 py-3 hidden lg:table-cell">
                      {ride.driver ? (
                        <div className="text-sm text-slate-700">
                          {ride.driver.firstName} {ride.driver.lastName}
                        </div>
                      ) : (
                        <span className="inline-flex items-center text-[11px] font-semibold text-rose-500 bg-rose-50 border border-rose-200 rounded-full px-2 py-0.5">
                          Unassigned
                        </span>
                      )}
                    </td>

                    {/* Status */}
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-semibold border ${meta.badge}`}>
                        {meta.label}
                      </span>
                    </td>

                    {/* Action */}
                    <td className="px-4 py-3 text-right">
                      <Link
                        href={`/rides/${ride.id}`}
                        className="text-xs font-semibold text-slate-400 hover:text-blue-600 transition-colors opacity-0 group-hover:opacity-100"
                      >
                        View →
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
