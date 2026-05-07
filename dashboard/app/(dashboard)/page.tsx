import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { RideStatus } from "@/lib/generated/prisma";

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
  const [stats, upcoming] = await Promise.all([getStats(), getUpcomingRides()]);

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
              { href: "/rides/new", label: "Book a Ride", icon: "🚐", bg: "bg-blue-50 hover:bg-blue-100 text-blue-700" },
              { href: "/clients/new", label: "Add Client", icon: "👤", bg: "bg-violet-50 hover:bg-violet-100 text-violet-700" },
              { href: "/invoices/new", label: "Create Invoice", icon: "🧾", bg: "bg-emerald-50 hover:bg-emerald-100 text-emerald-700" },
              { href: "/billing", label: "Billing Queue", icon: "💳", bg: "bg-orange-50 hover:bg-orange-100 text-orange-700" },
            ].map((a) => (
              <Link
                key={a.href}
                href={a.href}
                className={`flex items-center gap-2 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${a.bg}`}
              >
                <span>{a.icon}</span> {a.label}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
