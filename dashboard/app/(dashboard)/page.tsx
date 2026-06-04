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

  const days7: { day: string; rides: number }[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(now); d.setDate(d.getDate() - i); d.setHours(0, 0, 0, 0);
    const next = new Date(d); next.setDate(next.getDate() + 1);
    const count = await prisma.ride.count({ where: { scheduledAt: { gte: d, lt: next } } });
    days7.push({ day: d.toLocaleDateString("en-US", { weekday: "short" }), rides: count });
  }

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

  const statusCounts = await prisma.ride.groupBy({
    by: ["status"], where: { scheduledAt: { gte: monthStart } }, _count: true,
  });
  const statusColors: Record<string, string> = {
    COMPLETED: "#10b981", SCHEDULED: "#3b82f6", EN_ROUTE: "#f59e0b",
    CANCELLED: "#64748b", NO_SHOW: "#f43f5e", PICKED_UP: "#0ea5e9",
  };
  const statusBreakdown = statusCounts.map((s) => ({
    name: s.status.replace("_", " "), value: s._count, color: statusColors[s.status] ?? "#64748b",
  }));

  const typeCounts = await prisma.ride.groupBy({
    by: ["rideType"], where: { scheduledAt: { gte: monthStart } }, _count: true,
  });
  const typeColors: Record<string, string> = {
    AMBULATORY: "#3b82f6", WHEELCHAIR: "#F9A825", STRETCHER: "#10b981", BARIATRIC: "#a855f7",
  };
  const serviceBreakdown = typeCounts.map((t) => ({
    name: t.rideType.charAt(0) + t.rideType.slice(1).toLowerCase(),
    value: t._count, color: typeColors[t.rideType] ?? "#64748b",
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

const STAT_CARDS = [
  { key: "todayRides",     label: "Today's Rides",      icon: "🚗", gradient: "linear-gradient(135deg,#1e40af,#3b82f6)", glow: "#3b82f6", href: "/rides" },
  { key: "scheduled",      label: "Scheduled",           icon: "📅", gradient: "linear-gradient(135deg,#92400e,#f59e0b)", glow: "#f59e0b", href: "/rides?status=SCHEDULED" },
  { key: "completed",      label: "Completed Today",     icon: "✅", gradient: "linear-gradient(135deg,#065f46,#10b981)", glow: "#10b981", href: "/rides?status=COMPLETED" },
  { key: "totalClients",   label: "Active Clients",      icon: "👥", gradient: "linear-gradient(135deg,#5b21b6,#a855f7)", glow: "#a855f7", href: "/clients" },
  { key: "activeDrivers",  label: "Available Drivers",   icon: "🧑‍✈️", gradient: "linear-gradient(135deg,#0e7490,#06b6d4)", glow: "#06b6d4", href: "/drivers" },
  { key: "pendingClaims",  label: "Pending Claims",      icon: "📋", gradient: "linear-gradient(135deg,#9a3412,#f97316)", glow: "#f97316", href: "/billing" },
  { key: "unpaidInvoices", label: "Unpaid Invoices",     icon: "💳", gradient: "linear-gradient(135deg,#9f1239,#f43f5e)", glow: "#f43f5e", href: "/invoices" },
  { key: "cancelled",      label: "Cancelled Today",     icon: "❌", gradient: "linear-gradient(135deg,#1e293b,#475569)", glow: "#475569", href: "/rides?status=CANCELLED" },
] as const;

export default async function DashboardHome() {
  const [stats, upcoming, chartData] = await Promise.all([getStats(), getUpcomingRides(), getChartData()]);

  return (
    <div className="-m-6 min-h-full" style={{ background: "linear-gradient(160deg, #0a1628 0%, #0d1f3c 100%)", padding: 24 }}>

      {/* KPI cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {STAT_CARDS.map((s) => (
          <Link key={s.key} href={s.href}
            style={{
              background: s.gradient,
              borderRadius: 14,
              padding: "18px 20px",
              display: "block",
              boxShadow: `0 4px 24px ${s.glow}33`,
              border: `1px solid ${s.glow}22`,
              transition: "transform 0.15s, box-shadow 0.15s",
            }}
            className="hover:scale-[1.02] hover:shadow-lg">
            <div style={{ fontSize: 22 }}>{s.icon}</div>
            <div style={{ fontSize: 32, fontWeight: 800, color: "#fff", lineHeight: 1, marginTop: 8 }}>
              {stats[s.key]}
            </div>
            <div style={{ fontSize: 12, color: "rgba(255,255,255,0.65)", marginTop: 4, fontWeight: 500 }}>
              {s.label}
            </div>
          </Link>
        ))}
      </div>

      {/* Sparkline charts */}
      <div className="mb-6">
        <DashboardCharts
          weekRides={chartData.weekRides}
          monthRevenue={chartData.monthRevenue}
          statusBreakdown={chartData.statusBreakdown}
          serviceBreakdown={chartData.serviceBreakdown}
        />
      </div>

      {/* Bottom row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

        {/* Upcoming rides */}
        <div style={{
          background: "linear-gradient(135deg, #111d35 0%, #0d1628 100%)",
          border: "1px solid rgba(255,255,255,0.06)",
          borderRadius: 16, padding: 20,
        }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
            <h2 style={{ color: "#fff", fontWeight: 700, fontSize: 14 }}>Upcoming in 2 Hours</h2>
            <Link href="/rides" style={{ fontSize: 12, color: "#F9A825", fontWeight: 600 }}>View all →</Link>
          </div>
          {upcoming.length === 0 ? (
            <p style={{ color: "rgba(255,255,255,0.3)", fontSize: 13, textAlign: "center", padding: "24px 0" }}>
              No rides in the next 2 hours
            </p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
              {upcoming.map((ride, idx) => (
                <div key={ride.id} style={{
                  display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12,
                  padding: "10px 0",
                  borderBottom: idx < upcoming.length - 1 ? "1px solid rgba(255,255,255,0.05)" : "none",
                }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
                    <div style={{
                      width: 34, height: 34, borderRadius: 10, background: "rgba(59,130,246,0.15)",
                      display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                    }}>
                      <span style={{ fontSize: 16 }}>🚗</span>
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ color: "#fff", fontSize: 13, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {ride.client.firstName} {ride.client.lastName}
                      </div>
                      <div style={{ color: "rgba(255,255,255,0.35)", fontSize: 11, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {ride.pickupAddress}
                      </div>
                    </div>
                  </div>
                  <div style={{ textAlign: "right", flexShrink: 0 }}>
                    <div style={{ color: "#F9A825", fontSize: 12, fontWeight: 700 }}>
                      {ride.scheduledAt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </div>
                    <div style={{ color: "rgba(255,255,255,0.3)", fontSize: 11 }}>
                      {ride.driver ? `${ride.driver.firstName} ${ride.driver.lastName}` : "Unassigned"}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Quick actions */}
        <div style={{
          background: "linear-gradient(135deg, #111d35 0%, #0d1628 100%)",
          border: "1px solid rgba(255,255,255,0.06)",
          borderRadius: 16, padding: 20,
        }}>
          <h2 style={{ color: "#fff", fontWeight: 700, fontSize: 14, marginBottom: 16 }}>Quick Actions</h2>
          <div className="grid grid-cols-2 gap-3">
            {[
              { href: "/rides/new",    label: "Book a Ride",    icon: "🚗", color: "#3b82f6" },
              { href: "/clients/new",  label: "Add Client",     icon: "👤", color: "#a855f7" },
              { href: "/invoices/new", label: "Create Invoice", icon: "📄", color: "#10b981" },
              { href: "/billing",      label: "Billing Queue",  icon: "💳", color: "#f59e0b" },
            ].map((a) => (
              <Link key={a.href} href={a.href}
                style={{
                  display: "flex", alignItems: "center", gap: 10,
                  padding: "12px 14px", borderRadius: 12,
                  background: "rgba(255,255,255,0.04)",
                  border: "1px solid rgba(255,255,255,0.06)",
                  transition: "background 0.15s, border-color 0.15s",
                }}
                className="hover:bg-white/[0.08]">
                <div style={{
                  width: 34, height: 34, borderRadius: 9,
                  background: `${a.color}22`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                }}>
                  <span style={{ fontSize: 16 }}>{a.icon}</span>
                </div>
                <span style={{ color: "rgba(255,255,255,0.75)", fontSize: 13, fontWeight: 600 }}>{a.label}</span>
              </Link>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}
