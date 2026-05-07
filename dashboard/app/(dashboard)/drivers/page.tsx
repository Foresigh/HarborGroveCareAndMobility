import { prisma } from "@/lib/prisma";
import Link from "next/link";

const statusColor: Record<string, string> = {
  AVAILABLE: "bg-emerald-100 text-emerald-700",
  ON_TRIP: "bg-amber-100 text-amber-700",
  OFF: "bg-slate-100 text-slate-500",
};

export default async function DriversPage() {
  const drivers = await prisma.driver.findMany({
    where: { active: true },
    include: { vehicle: true, _count: { select: { rides: true } } },
    orderBy: { lastName: "asc" },
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-500">{drivers.length} drivers</p>
        <Link href="/drivers/new" className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold px-4 py-2 rounded-lg transition-colors">
          + Add Driver
        </Link>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {drivers.length === 0 ? (
          <div className="col-span-3 bg-white rounded-xl border border-slate-200 p-10 text-center text-slate-400">
            No drivers yet. <Link href="/drivers/new" className="text-blue-600 underline">Add one</Link>
          </div>
        ) : (
          drivers.map((d) => (
            <div key={d.id} className="bg-white rounded-xl border border-slate-200 p-5 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <div className="font-semibold text-slate-800">{d.firstName} {d.lastName}</div>
                  <div className="text-xs text-slate-400 mt-0.5">{d.phone}</div>
                </div>
                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${statusColor[d.status] ?? "bg-slate-100 text-slate-500"}`}>
                  {d.status.replace("_", " ")}
                </span>
              </div>
              <div className="text-xs text-slate-500 space-y-1">
                <div>Vehicle: <span className="text-slate-700">{d.vehicle?.name ?? "Not assigned"}</span></div>
                <div>License: <span className="text-slate-700">{d.licenseNum ?? "—"}</span></div>
                <div>Total rides: <span className="text-slate-700">{d._count.rides}</span></div>
              </div>
              <Link href={`/drivers/${d.id}`} className="mt-3 inline-block text-xs text-blue-600 hover:underline">
                Edit →
              </Link>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
