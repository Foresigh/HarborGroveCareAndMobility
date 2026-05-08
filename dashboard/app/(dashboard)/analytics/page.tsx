export const dynamic = "force-dynamic";
import { prisma } from "@/lib/prisma";
import { RidesLineChart } from "./RidesLineChart";
import { StatusDonut } from "./StatusDonut";
import { RevenueBar } from "./RevenueBar";
import { RideTypeBar } from "./RideTypeBar";

async function getAnalytics() {
  const now = new Date();
  const thirtyDaysAgo = new Date(now);
  thirtyDaysAgo.setDate(now.getDate() - 29);
  thirtyDaysAgo.setHours(0, 0, 0, 0);

  const [allRides, clients, drivers, claims] = await Promise.all([
    prisma.ride.findMany({
      where: { scheduledAt: { gte: thirtyDaysAgo } },
      select: { scheduledAt: true, status: true, rideType: true, amount: true },
      orderBy: { scheduledAt: "asc" },
    }),
    prisma.client.count({ where: { active: true } }),
    prisma.driver.count({ where: { active: true } }),
    prisma.billingClaim.findMany({
      where: { createdAt: { gte: thirtyDaysAgo } },
      select: { amount: true, status: true },
    }),
  ]);

  const ridesByDay: Record<string, number> = {};
  for (let i = 0; i < 30; i++) {
    const d = new Date(thirtyDaysAgo);
    d.setDate(d.getDate() + i);
    ridesByDay[d.toLocaleDateString("en-US", { month: "short", day: "numeric" })] = 0;
  }
  allRides.forEach((r) => {
    const key = new Date(r.scheduledAt).toLocaleDateString("en-US", { month: "short", day: "numeric" });
    if (key in ridesByDay) ridesByDay[key] = (ridesByDay[key] || 0) + 1;
  });
  const ridesPerDay = Object.entries(ridesByDay).map(([date, rides]) => ({ date, rides }));

  const revenueByDay: Record<string, number> = {};
  Object.keys(ridesByDay).forEach((k) => (revenueByDay[k] = 0));
  allRides.forEach((r) => {
    if (r.amount) {
      const key = new Date(r.scheduledAt).toLocaleDateString("en-US", { month: "short", day: "numeric" });
      if (key in revenueByDay) revenueByDay[key] = (revenueByDay[key] || 0) + Number(r.amount);
    }
  });
  const revenuePerDay = Object.entries(revenueByDay).map(([date, revenue]) => ({ date, revenue: Math.round(revenue * 100) / 100 }));

  const statusCount: Record<string, number> = {};
  allRides.forEach((r) => { statusCount[r.status] = (statusCount[r.status] || 0) + 1; });
  const statusData = Object.entries(statusCount).map(([name, value]) => ({ name, value }));

  const typeCount: Record<string, number> = {};
  allRides.forEach((r) => { typeCount[r.rideType] = (typeCount[r.rideType] || 0) + 1; });
  const rideTypeData = Object.entries(typeCount).map(([name, value]) => ({ name, value }));

  const totalRides = allRides.length;
  const completed = allRides.filter((r) => r.status === "COMPLETED").length;
  const completionRate = totalRides > 0 ? Math.round((completed / totalRides) * 100) : 0;
  const totalRevenue = allRides.reduce((s, r) => s + (r.amount ? Number(r.amount) : 0), 0);
  const claimsPaid = claims.filter((c) => c.status === "PAID").reduce((s, c) => s + (c.amount ? Number(c.amount) : 0), 0);

  return { ridesPerDay, revenuePerDay, statusData, rideTypeData, totalRides, completed, completionRate, totalRevenue, claimsPaid, clients, drivers };
}

const GOLD = "#F9A825";

const summaryCards = [
  {
    label: "Total Rides",
    key: "totalRides",
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20">
        <path d="M18.92 6.01C18.72 5.42 18.16 5 17.5 5h-11c-.66 0-1.21.42-1.42 1.01L3 12v8c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1h12v1c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-8l-2.08-5.99zM6.85 7h10.29l1.08 3.11H5.77L6.85 7zM19 17H5v-5h14v5z"/>
        <circle cx="7.5" cy="14.5" r="1.5"/>
        <circle cx="16.5" cy="14.5" r="1.5"/>
      </svg>
    ),
  },
  {
    label: "Completed",
    key: "completed",
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20">
        <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
      </svg>
    ),
  },
  {
    label: "Completion Rate",
    key: "completionRate",
    suffix: "%",
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20">
        <path d="M16 6l2.29 2.29-4.88 4.88-4-4L2 16.59 3.41 18l6-6 4 4 6.3-6.29L22 12V6z"/>
      </svg>
    ),
  },
  {
    label: "Revenue (30d)",
    key: "totalRevenue",
    prefix: "$",
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20">
        <path d="M11.8 10.9c-2.27-.59-3-1.2-3-2.15 0-1.09 1.01-1.85 2.7-1.85 1.78 0 2.44.85 2.5 2.1h2.21c-.07-1.72-1.12-3.3-3.21-3.81V3h-3v2.16c-1.94.42-3.5 1.68-3.5 3.61 0 2.31 1.91 3.46 4.7 4.13 2.5.6 3 1.48 3 2.41 0 .69-.49 1.79-2.7 1.79-2.06 0-2.87-.92-2.98-2.1h-2.2c.12 2.19 1.76 3.42 3.68 3.83V21h3v-2.15c1.95-.37 3.5-1.5 3.5-3.55 0-2.84-2.43-3.81-4.7-4.4z"/>
      </svg>
    ),
  },
  {
    label: "Claims Paid",
    key: "claimsPaid",
    prefix: "$",
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20">
        <path d="M20 4H4c-1.11 0-2 .89-2 2v12c0 1.11.89 2 2 2h16c1.11 0 2-.89 2-2V6c0-1.11-.89-2-2-2zm0 14H4v-6h16v6zm0-10H4V6h16v2z"/>
      </svg>
    ),
  },
  {
    label: "Active Clients",
    key: "clients",
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20">
        <path d="M12 12c2.7 0 4.8-2.1 4.8-4.8S14.7 2.4 12 2.4 7.2 4.5 7.2 7.2 9.3 12 12 12zm0 2.4c-3.2 0-9.6 1.6-9.6 4.8v2.4h19.2v-2.4c0-3.2-6.4-4.8-9.6-4.8z"/>
      </svg>
    ),
  },
];

export default async function AnalyticsPage() {
  const data = await getAnalytics();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Analytics</h1>
          <p className="text-sm text-slate-400 mt-0.5">Last 30 days — live data</p>
        </div>
        <div className="text-xs font-medium text-slate-400 bg-slate-100 px-3 py-1.5 rounded-full">
          30-day window
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {summaryCards.map((card) => {
          const raw = data[card.key as keyof typeof data] as number;
          const display = card.prefix
            ? `${card.prefix}${Number(raw).toFixed(2)}`
            : `${raw}${card.suffix ?? ""}`;
          return (
            <div
              key={card.key}
              className="bg-white rounded-xl border border-slate-100 p-4 shadow-sm hover:shadow-md transition-shadow"
            >
              <div
                className="w-9 h-9 rounded-lg flex items-center justify-center mb-3"
                style={{ background: "#FEF9EC", color: GOLD }}
              >
                {card.icon}
              </div>
              <div className="text-xl font-bold text-slate-800 tabular-nums">{display}</div>
              <div className="text-xs text-slate-400 mt-0.5">{card.label}</div>
            </div>
          );
        })}
      </div>

      {/* Charts row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-100 p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-1 h-4 rounded-full" style={{ background: GOLD }} />
            <h2 className="text-sm font-semibold text-slate-700">Rides per Day</h2>
          </div>
          <RidesLineChart data={data.ridesPerDay} />
        </div>
        <div className="bg-white rounded-xl border border-slate-100 p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-1 h-4 rounded-full" style={{ background: GOLD }} />
            <h2 className="text-sm font-semibold text-slate-700">Ride Status</h2>
          </div>
          <StatusDonut data={data.statusData} />
        </div>
      </div>

      {/* Charts row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-100 p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-1 h-4 rounded-full" style={{ background: GOLD }} />
            <h2 className="text-sm font-semibold text-slate-700">Revenue per Day ($)</h2>
          </div>
          <RevenueBar data={data.revenuePerDay} />
        </div>
        <div className="bg-white rounded-xl border border-slate-100 p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-1 h-4 rounded-full" style={{ background: GOLD }} />
            <h2 className="text-sm font-semibold text-slate-700">Ride Types</h2>
          </div>
          <RideTypeBar data={data.rideTypeData} />
        </div>
      </div>
    </div>
  );
}
