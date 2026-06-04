"use client";
import {
  ResponsiveContainer, BarChart, Bar, LineChart, Line,
  PieChart, Pie, Cell, Tooltip,
} from "recharts";

interface DayRide { day: string; rides: number; }
interface DayRevenue { day: string; revenue: number; }
interface StatusItem { name: string; value: number; color: string; }
interface ServiceItem { name: string; value: number; color: string; }

interface Props {
  weekRides: DayRide[];
  monthRevenue: DayRevenue[];
  statusBreakdown: StatusItem[];
  serviceBreakdown: ServiceItem[];
}

const GOLD = "#F9A825";
const NAVY = "#0D2B4E";

function CardShell({ title, kpi, sub, children }: { title: string; kpi: string; sub: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5 flex flex-col gap-3">
      <div className="flex items-start justify-between">
        <div>
          <div className="text-xs font-semibold text-slate-400 uppercase tracking-wide">{title}</div>
          <div className="text-2xl font-bold text-slate-800 mt-0.5">{kpi}</div>
          <div className="text-xs text-slate-400 mt-0.5">{sub}</div>
        </div>
        <div style={{ width: 4, height: 24, background: `linear-gradient(180deg,${GOLD},${NAVY})`, borderRadius: 2 }} />
      </div>
      <div style={{ height: 72 }}>{children}</div>
    </div>
  );
}

export function DashboardCharts({ weekRides, monthRevenue, statusBreakdown, serviceBreakdown }: Props) {
  const totalWeekRides = weekRides.reduce((s, d) => s + d.rides, 0);
  const totalRevenue = monthRevenue.reduce((s, d) => s + d.revenue, 0);
  const totalStatusRides = statusBreakdown.reduce((s, d) => s + d.value, 0);
  const topService = serviceBreakdown.reduce((a, b) => b.value > a.value ? b : a, { name: "—", value: 0, color: "#ccc" });

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">

      {/* Rides this week */}
      <CardShell
        title="Rides This Week"
        kpi={String(totalWeekRides)}
        sub="Last 7 days"
      >
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={weekRides} barCategoryGap="30%">
            <Tooltip
              content={({ active, payload }) =>
                active && payload?.length ? (
                  <div className="bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs shadow-sm">
                    <div className="font-semibold text-slate-700">{payload[0].payload.day}</div>
                    <div className="text-[#0D2B4E]">{payload[0].value} rides</div>
                  </div>
                ) : null
              }
            />
            <Bar dataKey="rides" fill={NAVY} radius={[3, 3, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </CardShell>

      {/* Revenue this month */}
      <CardShell
        title="Revenue This Month"
        kpi={`$${totalRevenue.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`}
        sub="From completed rides"
      >
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={monthRevenue}>
            <Tooltip
              content={({ active, payload }) =>
                active && payload?.length ? (
                  <div className="bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs shadow-sm">
                    <div className="font-semibold text-slate-700">{payload[0].payload.day}</div>
                    <div className="text-emerald-600">${Number(payload[0].value).toFixed(2)}</div>
                  </div>
                ) : null
              }
            />
            <Line type="monotone" dataKey="revenue" stroke="#059669" strokeWidth={2} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </CardShell>

      {/* Ride status donut */}
      <CardShell
        title="Ride Status Mix"
        kpi={String(totalStatusRides)}
        sub="This month"
      >
        <div className="flex items-center gap-3 h-full">
          <ResponsiveContainer width={72} height="100%">
            <PieChart>
              <Pie data={statusBreakdown} dataKey="value" innerRadius={22} outerRadius={34} strokeWidth={0}>
                {statusBreakdown.map((entry) => <Cell key={entry.name} fill={entry.color} />)}
              </Pie>
              <Tooltip
                content={({ active, payload }) =>
                  active && payload?.length ? (
                    <div className="bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs shadow-sm">
                      <div className="font-semibold" style={{ color: payload[0].payload.color }}>{payload[0].name}</div>
                      <div className="text-slate-700">{payload[0].value}</div>
                    </div>
                  ) : null
                }
              />
            </PieChart>
          </ResponsiveContainer>
          <div className="flex flex-col gap-1 min-w-0">
            {statusBreakdown.map((s) => (
              <div key={s.name} className="flex items-center gap-1.5 text-xs text-slate-500 truncate">
                <span style={{ width: 7, height: 7, borderRadius: 2, background: s.color, flexShrink: 0, display: "inline-block" }} />
                {s.name} <span className="font-semibold text-slate-700 ml-auto pl-2">{s.value}</span>
              </div>
            ))}
          </div>
        </div>
      </CardShell>

      {/* Service type breakdown */}
      <CardShell
        title="Service Types"
        kpi={topService.name}
        sub="Most common this month"
      >
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={serviceBreakdown} layout="vertical" barCategoryGap="20%">
            <Tooltip
              content={({ active, payload }) =>
                active && payload?.length ? (
                  <div className="bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs shadow-sm">
                    <div className="font-semibold text-slate-700">{payload[0].payload.name}</div>
                    <div style={{ color: payload[0].payload.color }}>{payload[0].value} rides</div>
                  </div>
                ) : null
              }
            />
            <Bar dataKey="value" radius={[0, 3, 3, 0]}>
              {serviceBreakdown.map((entry) => <Cell key={entry.name} fill={entry.color} />)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </CardShell>

    </div>
  );
}
