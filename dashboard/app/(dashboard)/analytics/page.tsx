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

  // Rides per day
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

  // Revenue per day
  const revenueByDay: Record<string, number> = {};
  Object.keys(ridesByDay).forEach((k) => (revenueByDay[k] = 0));
  allRides.forEach((r) => {
    if (r.amount) {
      const key = new Date(r.scheduledAt).toLocaleDateString("en-US", { month: "short", day: "numeric" });
      if (key in revenueByDay) revenueByDay[key] = (revenueByDay[key] || 0) + Number(r.amount);
    }
  });
  const revenuePerDay = Object.entries(revenueByDay).map(([date, revenue]) => ({ date, revenue: Math.round(revenue * 100) / 100 }));

  // Status breakdown
  const statusCount: Record<string, number> = {};
  allRides.forEach((r) => { statusCount[r.status] = (statusCount[r.status] || 0) + 1; });
  const statusData = Object.entries(statusCount).map(([name, value]) => ({ name, value }));

  // Ride type breakdown
  const typeCount: Record<string, number> = {};
  allRides.forEach((r) => { typeCount[r.rideType] = (typeCount[r.rideType] || 0) + 1; });
  const rideTypeData = Object.entries(typeCount).map(([name, value]) => ({ name, value }));

  // Summary stats
  const totalRides = allRides.length;
  const completed = allRides.filter((r) => r.status === "COMPLETED").length;
  const completionRate = totalRides > 0 ? Math.round((completed / totalRides) * 100) : 0;
  const totalRevenue = allRides.reduce((s, r) => s + (r.amount ? Number(r.amount) : 0), 0);
  const claimsPaid = claims.filter((c) => c.status === "PAID").reduce((s, c) => s + (c.amount ? Number(c.amount) : 0), 0);

  return { ridesPerDay, revenuePerDay, statusData, rideTypeData, totalRides, completed, completionRate, totalRevenue, claimsPaid, clients, drivers };
}

const summaryCards = [
  { label: "Total Rides (30d)", key: "totalRides", icon: "🚐", color: "#3B82F6" },
  { label: "Completed", key: "completed", icon: "✓", color: "#10B981" },
  { label: "Completion Rate", key: "completionRate", suffix: "%", icon: "📈", color: "#F9A825" },
  { label: "Revenue (30d)", key: "totalRevenue", prefix: "$", icon: "💰", color: "#8B5CF6" },
  { label: "Claims Paid", key: "claimsPaid", prefix: "$", icon: "🏦", color: "#06B6D4" },
  { label: "Active Clients", key: "clients", icon: "👤", color: "#EC4899" },
];

export default async function AnalyticsPage() {
  const data = await getAnalytics();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Analytics</h1>
        <p className="text-sm text-slate-500 mt-1">Last 30 days · updates in real time</p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {summaryCards.map((card) => {
          const raw = data[card.key as keyof typeof data] as number;
          const display = card.prefix
            ? `${card.prefix}${Number(raw).toFixed(card.prefix === "$" ? 2 : 0)}`
            : `${raw}${card.suffix ?? ""}`;
          return (
            <div key={card.key} className="bg-white rounded-xl border border-slate-100 p-4 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between mb-3">
                <span className="text-lg">{card.icon}</span>
                <div className="w-2 h-2 rounded-full" style={{ background: card.color }} />
              </div>
              <div className="text-2xl font-bold text-slate-800">{display}</div>
              <div className="text-xs text-slate-400 mt-1">{card.label}</div>
            </div>
          );
        })}
      </div>

      {/* Charts row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-100 p-5 shadow-sm">
          <h2 className="text-sm font-semibold text-slate-700 mb-4">Rides per Day</h2>
          <RidesLineChart data={data.ridesPerDay} />
        </div>
        <div className="bg-white rounded-xl border border-slate-100 p-5 shadow-sm">
          <h2 className="text-sm font-semibold text-slate-700 mb-4">Ride Status</h2>
          <StatusDonut data={data.statusData} />
        </div>
      </div>

      {/* Charts row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-100 p-5 shadow-sm">
          <h2 className="text-sm font-semibold text-slate-700 mb-4">Revenue per Day ($)</h2>
          <RevenueBar data={data.revenuePerDay} />
        </div>
        <div className="bg-white rounded-xl border border-slate-100 p-5 shadow-sm">
          <h2 className="text-sm font-semibold text-slate-700 mb-4">Ride Types</h2>
          <RideTypeBar data={data.rideTypeData} />
        </div>
      </div>
    </div>
  );
}
