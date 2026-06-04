export const dynamic = "force-dynamic";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { RideStatus } from "@/lib/generated/prisma/enums";
import { DashboardCharts } from "./DashboardCharts";

async function getStats() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const [todayRides, scheduled, completed, cancelled, totalClients, activeDrivers, pendingClaims, unpaidInvoices] =
    await Promise.all([
      prisma.ride.count({ where: { scheduledAt: { gte: today, lt: tomorrow } } }),
      prisma.ride.count({ where: { status: RideStatus.SCHEDULED, scheduledAt: { gte: today } } }),
      prisma.ride.count({ where: { status: RideStatus.COMPLETED, completedAt: { gte: today } } }),
      prisma.ride.count({ where: { status: RideStatus.CANCELLED, updatedAt: { gte: today } } }),
      prisma.client.count({ where: { active: true } }),
      prisma.driver.count({ where: { active: true, status: "AVAILABLE" } }),
      prisma.billingClaim.count({ where: { status: "PENDING" } }),
      prisma.invoice.count({ where: { status: { in: ["SENT", "OVERDUE"] } } }),
    ]);

  return { todayRides, scheduled, completed, cancelled, totalClients, activeDrivers, pendingClaims, unpaidInvoices };
}

async function getChartData() {
  const now = new Date();

  // Last 7 days — rides per day
  const days7: { day: string; rides: number }[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    d.setHours(0, 0, 0, 0);
    const next = new Date(d); next.setDate(next.getDate() + 1);
    const count = await prisma.ride.count({ where: { scheduledAt: { gte: d, lt: next } } });
    days7.push({ day: d.toLocaleDateString("en-US", { weekday: "short" }), rides: count });
  }

  // Current month — revenue per day from rides with amount
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const ridesWithAmount = await prisma.ride.findMany({
    where: { scheduledAt: { gte: monthStart }, amount: { not: null } },
    select: { scheduledAt: true, amount: true },
  });
  const revenueByDay: Record<string, number> = {};
  for (const r of ridesWithAmount) {
    const key = r.scheduledAt.toLocaleDateString("en-US", { month: "short", day: "numeric" });
    revenueByDay[key] = (revenueByDay[key] ?? 0) + Number(r.amount);
  }
  const monthRevenue = Object.entries(revenueByDay).map(([day, revenue]) => ({ day, revenue }));

  // Status breakdown this month
  const statusCounts = await prisma.ride.groupBy({
    by: ["status"],
    where: { scheduledAt: { gte: monthStart } },
    _count: true,
  });
  const statusColors: Record<string, string> = {
    COMPLETED: "#059669", SCHEDULED: "#3b82f6", EN_ROUTE: "#f59e0b",
    CANCELLED: "#94a3b8", NO_SHOW: "#f43f5e", PICKED_UP: "#0ea5e9",
  };
  const statusBreakdown = statusCounts.map((s) => ({
    name: s.status.replace("_", " "),
    value: s._count,
    color: statusColors[s.status] ?? "#94a3b8",
  }));

  // Service type this month
  const typeCounts = await prisma.ride.groupBy({
    by: ["rideType"],
    where: { scheduledAt: { gte: monthStart } },
    _count: true,
  });
  const typeColors: Record<string, string> = {
    AMBULATORY: "#0D2B4E", WHEELCHAIR: "#F9A825", STRETCHER: "#059669", BARIATRIC: "#8b5cf6",
  };
  const serviceBreakdown = typeCounts.map((t) => ({
    name: t.rideType.charAt(0) + t.rideType.slice(1).toLowerCase(),
    value: t._count,
    color: typeColors[t.rideType] ?? "#94a3b8",
  }));

  return { weekRides: days7, monthRevenue, statusBreakdown, serviceBreakdown };
}

async function getUpcomingRides() {
  const now = new Date();
  const in2h = new Date(now.getTime() + 2 * 60 * 60 * 1000);
  return prisma.ride.findMany({
    where: { status: RideStatus.SCHEDULED, scheduledAt: { gte: now, lte: in2h } },
    include: { client: true, driver: true },
    orderBy: { scheduledAt: "asc" },
    take: 5,
  });
}

export default async function DashboardHome() {
  const [stats, upcoming, chartData] = await Promise.all([getStats(), getUpcomingRides(), getChartData()]);

  const statCards = [
    { label: "Today's Rides", value: stats.todayRides, color: "bg-blue-600", href: "/rides" },
    { label: "Scheduled", value: stats.scheduled, color: "bg-amber-500", href: "/rides?status=SCHEDULED" },
    { label: "Completed Today", value: stats.completed, color: "bg-emerald-600", href: "/rides?status=COMPLETED" },
    { label: "Active Clients", value: stats.totalClients, color: "bg-violet-600", href: "/clients" },
    { label: "Available Drivers", value: stats.activeDrivers, color: "bg-sky-600", href: "/drivers" },
    { label: "Pending Claims", value: stats.pendingClaims, color: "bg-orange-500", href: "/billing" },
    { label: "Unpaid Invoices", value: stats.unpaidInvoices, color: "bg-rose-500", href: "/invoices" },
    { label: "Cancelled Today", value: stats.cancelled, color: "bg-slate-500", href: "/rides?status=CANCELLED" },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {statCards.map((s) => (
          <Link
            key={s.label}
            href={s.href}
            className="bg-white rounded-xl border border-slate-200 p-5 hover:shadow-md transition-shadow"
          >
            <div className={`w-2 h-2 rounded-full ${s.color} mb-3`} />
            <div className="text-3xl font-bold text-slate-800">{s.value}</div>
            <div className="text-sm text-slate-500 mt-1">{s.label}</div>
          </Link>
        ))}
      </div>

      <DashboardCharts
        weekRides={chartData.weekRides}
        monthRevenue={chartData.monthRevenue}
        statusBreakdown={chartData.statusBreakdown}
        serviceBreakdown={chartData.serviceBreakdown}
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-slate-800">Upcoming in 2 Hours</h2>
            <Link href="/rides" className="text-xs text-blue-600 hover:underline">View all</Link>
          </div>
          {upcoming.length === 0 ? (
            <p className="text-sm text-slate-400 py-4 text-center">No rides in the next 2 hours</p>
          ) : (
            <div className="space-y-3">
              {upcoming.map((ride) => (
                <div key={ride.id} className="flex items-start justify-between gap-3 py-2 border-b border-slate-100 last:border-0">
                  <div className="min-w-0">
                    <div className="text-sm font-medium text-slate-800 truncate">
                      {ride.client.firstName} {ride.client.lastName}
                    </div>
                    <div className="text-xs text-slate-500 truncate">{ride.pickupAddress} → {ride.dropoffAddress}</div>
                  </div>
                  <div className="shrink-0 text-right">
                    <div className="text-xs font-semibold text-blue-600">
                      {ride.scheduledAt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </div>
                    <div className="text-xs text-slate-400">{ride.driver ? `${ride.driver.firstName} ${ride.driver.lastName}` : "Unassigned"}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <h2 className="font-semibold text-slate-800 mb-4">Quick Actions</h2>
          <div className="grid grid-cols-2 gap-3">
            {[
              { href: "/rides/new", label: "Book a Ride", icon: <svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18"><path d="M18.92 6.01C18.72 5.42 18.16 5 17.5 5h-11c-.66 0-1.21.42-1.42 1.01L3 12v8c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1h12v1c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-8l-2.08-5.99zM6.85 7h10.29l1.08 3.11H5.77L6.85 7zM19 17H5v-5h14v5z"/><circle cx="7.5" cy="14.5" r="1.5"/><circle cx="16.5" cy="14.5" r="1.5"/></svg> },
              { href: "/clients/new", label: "Add Client", icon: <svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18"><path d="M15 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm-9-2V7H4v3H1v2h3v3h2v-3h3v-2H6zm9 4c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/></svg> },
              { href: "/invoices/new", label: "Create Invoice", icon: <svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18"><path d="M14 2H6c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z"/></svg> },
              { href: "/billing", label: "Billing Queue", icon: <svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18"><path d="M20 4H4c-1.11 0-2 .89-2 2v12c0 1.11.89 2 2 2h16c1.11 0 2-.89 2-2V6c0-1.11-.89-2-2-2zm0 14H4v-6h16v6zm0-10H4V6h16v2z"/></svg> },
            ].map((a) => (
              <Link
                key={a.href}
                href={a.href}
                className="flex items-center gap-3 px-4 py-3.5 rounded-xl border border-slate-100 bg-slate-50 hover:border-[#F9A825] hover:bg-white text-slate-700 hover:text-[#0D2B4E] text-sm font-medium transition-all group"
              >
                <span className="text-slate-400 group-hover:text-[#F9A825] transition-colors">{a.icon}</span>
                {a.label}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
