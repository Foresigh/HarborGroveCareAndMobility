export const dynamic = "force-dynamic";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { RideStatus } from "@/lib/generated/prisma/enums";

const statusColor: Record<RideStatus, string> = {
  SCHEDULED: "bg-blue-100 text-blue-700",
  EN_ROUTE: "bg-amber-100 text-amber-700",
  PICKED_UP: "bg-sky-100 text-sky-700",
  COMPLETED: "bg-emerald-100 text-emerald-700",
  CANCELLED: "bg-slate-100 text-slate-500",
  NO_SHOW: "bg-rose-100 text-rose-700",
};

export default async function RideBoardPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; date?: string }>;
}) {
  const params = await searchParams;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const dateFilter = params.date
    ? (() => {
        const d = new Date(params.date);
        d.setHours(0, 0, 0, 0);
        const nd = new Date(d);
        nd.setDate(nd.getDate() + 1);
        return { gte: d, lt: nd };
      })()
    : { gte: today, lt: tomorrow };

  const rides = await prisma.ride.findMany({
    where: {
      scheduledAt: dateFilter,
      ...(params.status ? { status: params.status as RideStatus } : {}),
    },
    include: { client: true, driver: true, vehicle: true },
    orderBy: { scheduledAt: "asc" },
  });

  const statuses = Object.values(RideStatus) as RideStatus[];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex gap-2 flex-wrap">
          <Link
            href="/rides"
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${!params.status ? "bg-slate-800 text-white border-slate-800" : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"}`}
          >
            All
          </Link>
          {statuses.map((s) => (
            <Link
              key={s}
              href={`/rides?status=${s}`}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${params.status === s ? "bg-slate-800 text-white border-slate-800" : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"}`}
            >
              {s.replace("_", " ")}
            </Link>
          ))}
        </div>
        <div className="flex gap-2">
          <input
            type="date"
            defaultValue={params.date ?? today.toISOString().split("T")[0]}
            onChange={(e) => {
              window.location.href = `/rides?date=${e.target.value}${params.status ? `&status=${params.status}` : ""}`;
            }}
            className="border border-slate-200 rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <Link
            href="/rides/new"
            className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold px-4 py-1.5 rounded-lg transition-colors"
          >
            + Book Ride
          </Link>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50">
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Time</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Client</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide hidden md:table-cell">Pickup</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide hidden lg:table-cell">Drop-off</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide hidden md:table-cell">Driver</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Status</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rides.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-10 text-center text-slate-400 text-sm">
                  No rides found for this date
                </td>
              </tr>
            ) : (
              rides.map((ride) => (
                <tr key={ride.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-3 font-medium text-slate-700 whitespace-nowrap">
                    {ride.scheduledAt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </td>
                  <td className="px-4 py-3">
                    <div className="font-medium text-slate-800">{ride.client.firstName} {ride.client.lastName}</div>
                    <div className="text-xs text-slate-400">{ride.rideType}</div>
                  </td>
                  <td className="px-4 py-3 text-slate-600 hidden md:table-cell max-w-[180px] truncate">{ride.pickupAddress}</td>
                  <td className="px-4 py-3 text-slate-600 hidden lg:table-cell max-w-[180px] truncate">{ride.dropoffAddress}</td>
                  <td className="px-4 py-3 text-slate-600 hidden md:table-cell">
                    {ride.driver ? `${ride.driver.firstName} ${ride.driver.lastName}` : <span className="text-rose-400">Unassigned</span>}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${statusColor[ride.status]}`}>
                      {ride.status.replace("_", " ")}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <Link href={`/rides/${ride.id}`} className="text-xs text-blue-600 hover:underline">Edit</Link>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
