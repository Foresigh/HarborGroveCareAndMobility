"use client";
import { useState, useEffect } from "react";
import {
  ResponsiveContainer, AreaChart, Area, BarChart, Bar,
  LineChart, Line, PieChart, Pie, Cell, Tooltip, XAxis, YAxis,
} from "recharts";

interface DayRide     { day: string; rides: number; }
interface DayRevenue  { day: string; revenue: number; }
interface StatusItem  { name: string; value: number; color: string; }
interface ServiceItem { name: string; value: number; color: string; }

interface Props {
  weekRides: DayRide[];
  monthRevenue: DayRevenue[];
  statusBreakdown: StatusItem[];
  serviceBreakdown: ServiceItem[];
}

const TOOLTIP_STYLE = {
  background: "#0d1b2e",
  border: "1px solid rgba(255,255,255,0.08)",
  borderRadius: 10,
  fontSize: 12,
  color: "#fff",
  padding: "8px 12px",
};

function DarkTooltip({ active, payload, label, valuePrefix = "", valueSuffix = "" }: {
  active?: boolean; payload?: { value: number; color?: string }[]; label?: string;
  valuePrefix?: string; valueSuffix?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div style={TOOLTIP_STYLE}>
      {label && <div style={{ color: "rgba(255,255,255,0.5)", marginBottom: 4 }}>{label}</div>}
      <div style={{ fontWeight: 700, color: payload[0].color ?? "#F9A825" }}>
        {valuePrefix}{typeof payload[0].value === "number" ? payload[0].value.toLocaleString() : payload[0].value}{valueSuffix}
      </div>
    </div>
  );
}

function ChartCard({ title, kpi, sub, accent, children }: {
  title: string; kpi: string; sub: string; accent: string; children: React.ReactNode;
}) {
  return (
    <div style={{
      background: "linear-gradient(135deg, #111d35 0%, #0d1628 100%)",
      border: "1px solid rgba(255,255,255,0.06)",
      borderRadius: 16,
      padding: "20px 20px 14px",
      display: "flex",
      flexDirection: "column",
      gap: 12,
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <div style={{ fontSize: 11, fontWeight: 600, color: "rgba(255,255,255,0.4)", textTransform: "uppercase", letterSpacing: "0.08em" }}>{title}</div>
          <div style={{ fontSize: 28, fontWeight: 800, color: "#fff", marginTop: 2, lineHeight: 1 }}>{kpi}</div>
          <div style={{ fontSize: 11, color: "rgba(255,255,255,0.35)", marginTop: 4 }}>{sub}</div>
        </div>
        <div style={{ width: 8, height: 8, borderRadius: "50%", background: accent, boxShadow: `0 0 10px ${accent}` }} />
      </div>
      <div style={{ height: 90, minHeight: 90 }}>{children}</div>
    </div>
  );
}

export function DashboardCharts({ weekRides, monthRevenue, statusBreakdown, serviceBreakdown }: Props) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const totalWeekRides   = weekRides.reduce((s, d) => s + d.rides, 0);
  const totalRevenue     = monthRevenue.reduce((s, d) => s + d.revenue, 0);
  const totalStatusRides = statusBreakdown.reduce((s, d) => s + d.value, 0);
  const topService       = serviceBreakdown.reduce((a, b) => b.value > a.value ? b : a, { name: "—", value: 0, color: "#ccc" });

  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16 }}
         className="grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">

      {/* Rides this week — area chart */}
      <ChartCard title="Rides This Week" kpi={String(totalWeekRides)} sub="Last 7 days" accent="#3b82f6">
        <ResponsiveContainer width="100%" height={mounted ? "100%" : 0}>
          <AreaChart data={weekRides} margin={{ top: 4, right: 0, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="blueGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%"  stopColor="#3b82f6" stopOpacity={0.4} />
                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
              </linearGradient>
            </defs>
            <XAxis dataKey="day" tick={{ fill: "rgba(255,255,255,0.3)", fontSize: 10 }} axisLine={false} tickLine={false} />
            <Tooltip content={<DarkTooltip valueSuffix=" rides" />} />
            <Area type="monotone" dataKey="rides" stroke="#3b82f6" strokeWidth={2}
              fill="url(#blueGrad)" dot={false} activeDot={{ r: 4, fill: "#3b82f6" }} />
          </AreaChart>
        </ResponsiveContainer>
      </ChartCard>

      {/* Revenue this month — line chart */}
      <ChartCard title="Revenue This Month"
        kpi={`$${totalRevenue.toLocaleString("en-US", { maximumFractionDigits: 0 })}`}
        sub="From completed rides" accent="#10b981">
        <ResponsiveContainer width="100%" height={mounted ? "100%" : 0}>
          <AreaChart data={monthRevenue} margin={{ top: 4, right: 0, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="greenGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%"  stopColor="#10b981" stopOpacity={0.4} />
                <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
              </linearGradient>
            </defs>
            <XAxis dataKey="day" tick={{ fill: "rgba(255,255,255,0.3)", fontSize: 10 }} axisLine={false} tickLine={false} />
            <Tooltip content={<DarkTooltip valuePrefix="$" />} />
            <Area type="monotone" dataKey="revenue" stroke="#10b981" strokeWidth={2}
              fill="url(#greenGrad)" dot={false} activeDot={{ r: 4, fill: "#10b981" }} />
          </AreaChart>
        </ResponsiveContainer>
      </ChartCard>

      {/* Status donut */}
      <ChartCard title="Ride Status Mix" kpi={String(totalStatusRides)} sub="This month" accent="#a855f7">
        <div style={{ display: "flex", alignItems: "center", gap: 12, height: "100%" }}>
          <ResponsiveContainer width={88} height={mounted ? "100%" : 0}>
            <PieChart>
              <Pie data={statusBreakdown} dataKey="value" innerRadius={26} outerRadius={40} strokeWidth={0}>
                {statusBreakdown.map((e) => <Cell key={e.name} fill={e.color} />)}
              </Pie>
              <Tooltip content={({ active, payload }) =>
                active && payload?.length
                  ? <div style={TOOLTIP_STYLE}><span style={{ color: payload[0].payload.color }}>{payload[0].name}: </span>{payload[0].value}</div>
                  : null
              } />
            </PieChart>
          </ResponsiveContainer>
          <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 5 }}>
            {statusBreakdown.slice(0, 5).map((s) => (
              <div key={s.name} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: 10 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                  <span style={{ width: 6, height: 6, borderRadius: 2, background: s.color, display: "inline-block", flexShrink: 0 }} />
                  <span style={{ color: "rgba(255,255,255,0.5)" }}>{s.name}</span>
                </div>
                <span style={{ fontWeight: 700, color: "#fff" }}>{s.value}</span>
              </div>
            ))}
          </div>
        </div>
      </ChartCard>

      {/* Service type horizontal bars */}
      <ChartCard title="Service Types" kpi={topService.name} sub="Most common this month" accent="#F9A825">
        <ResponsiveContainer width="100%" height={mounted ? "100%" : 0}>
          <BarChart data={serviceBreakdown} layout="vertical" margin={{ top: 0, right: 8, left: 0, bottom: 0 }}>
            <XAxis type="number" hide />
            <YAxis type="category" dataKey="name" tick={{ fill: "rgba(255,255,255,0.4)", fontSize: 10 }} axisLine={false} tickLine={false} width={72} />
            <Tooltip content={({ active, payload }) =>
              active && payload?.length
                ? <div style={TOOLTIP_STYLE}><span style={{ color: payload[0].payload.color }}>{payload[0].payload.name}: </span>{payload[0].value} rides</div>
                : null
            } />
            <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={10}>
              {serviceBreakdown.map((e) => <Cell key={e.name} fill={e.color} />)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>

    </div>
  );
}
