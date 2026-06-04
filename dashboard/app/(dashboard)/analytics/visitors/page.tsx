export const dynamic = "force-dynamic";
import { prisma } from "@/lib/prisma";

function countryFlag(country: string | null) {
  if (!country) return "🌐";
  const map: Record<string, string> = {
    "United States": "🇺🇸", "Canada": "🇨🇦", "Mexico": "🇲🇽",
    "United Kingdom": "🇬🇧", "Australia": "🇦🇺", "Germany": "🇩🇪",
    "France": "🇫🇷", "India": "🇮🇳", "Brazil": "🇧🇷", "Philippines": "🇵🇭",
    "Ethiopia": "🇪🇹", "Kenya": "🇰🇪", "Nigeria": "🇳🇬",
  };
  return map[country] ?? "🌍";
}

function deviceIcon(device: string | null) {
  if (device === "Mobile")  return "📱";
  if (device === "Tablet")  return "📲";
  return "🖥️";
}

function timeAgo(date: Date) {
  const diff = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
  if (diff < 60)   return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return new Date(date).toLocaleDateString();
}

export default async function VisitorsPage() {
  const now = new Date();
  const today = new Date(now); today.setHours(0, 0, 0, 0);
  const week  = new Date(now); week.setDate(week.getDate() - 7);
  const month = new Date(now); month.setDate(1); month.setHours(0,0,0,0);

  const [totalToday, totalWeek, totalMonth, recent, topCountries, topPages, deviceBreakdown] = await Promise.all([
    prisma.pageView.count({ where: { createdAt: { gte: today } } }),
    prisma.pageView.count({ where: { createdAt: { gte: week } } }),
    prisma.pageView.count({ where: { createdAt: { gte: month } } }),
    prisma.pageView.findMany({ orderBy: { createdAt: "desc" }, take: 50 }),
    prisma.pageView.groupBy({ by: ["country"], _count: true, orderBy: { _count: { country: "desc" } }, take: 8, where: { country: { not: null } } }),
    prisma.pageView.groupBy({ by: ["page"],    _count: true, orderBy: { _count: { page: "desc" } },    take: 6 }),
    prisma.pageView.groupBy({ by: ["device"],  _count: true, orderBy: { _count: { device: "desc" } } }),
  ]);

  const totalDevices = deviceBreakdown.reduce((s, d) => s + d._count, 0) || 1;

  const statCards = [
    { label: "Today",      value: totalToday, color: "#3b82f6" },
    { label: "This Week",  value: totalWeek,  color: "#10b981" },
    { label: "This Month", value: totalMonth, color: "#a855f7" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-slate-800">Website Visitors</h1>
        <p className="text-sm text-slate-500 mt-1">Visitors to your public website tracked in real time.</p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-3 gap-4">
        {statCards.map((s) => (
          <div key={s.label} className="bg-white rounded-xl border border-slate-200 p-5">
            <div style={{ width: 8, height: 8, borderRadius: "50%", background: s.color, marginBottom: 10 }} />
            <div className="text-3xl font-bold text-slate-800">{s.value}</div>
            <div className="text-sm text-slate-500 mt-1">Visitors {s.label}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Top countries */}
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <h2 className="text-sm font-semibold text-slate-700 mb-4">Top Countries</h2>
          {topCountries.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-6">No data yet</p>
          ) : (
            <div className="space-y-3">
              {topCountries.map((c) => {
                const pct = Math.round((c._count / totalMonth) * 100);
                return (
                  <div key={c.country}>
                    <div className="flex items-center justify-between text-sm mb-1">
                      <span className="flex items-center gap-2">
                        <span>{countryFlag(c.country)}</span>
                        <span className="text-slate-700 font-medium">{c.country ?? "Unknown"}</span>
                      </span>
                      <span className="text-slate-500 text-xs font-semibold">{c._count}</span>
                    </div>
                    <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                      <div className="h-full bg-[#0D2B4E] rounded-full" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Top pages */}
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <h2 className="text-sm font-semibold text-slate-700 mb-4">Top Pages</h2>
          {topPages.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-6">No data yet</p>
          ) : (
            <div className="space-y-3">
              {topPages.map((p) => (
                <div key={p.page} className="flex items-center justify-between">
                  <span className="text-sm text-slate-600 truncate max-w-[160px] font-mono">{p.page || "/"}</span>
                  <span className="text-xs font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded-full ml-2">{p._count}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Device breakdown */}
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <h2 className="text-sm font-semibold text-slate-700 mb-4">Devices</h2>
          {deviceBreakdown.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-6">No data yet</p>
          ) : (
            <div className="space-y-4">
              {deviceBreakdown.map((d) => {
                const pct = Math.round((d._count / totalDevices) * 100);
                const colors: Record<string, string> = { Desktop: "#0D2B4E", Mobile: "#F9A825", Tablet: "#10b981" };
                const color = colors[d.device ?? ""] ?? "#94a3b8";
                return (
                  <div key={d.device}>
                    <div className="flex items-center justify-between text-sm mb-1">
                      <span className="flex items-center gap-2">
                        <span>{deviceIcon(d.device)}</span>
                        <span className="text-slate-700 font-medium">{d.device ?? "Unknown"}</span>
                      </span>
                      <span className="text-slate-500 text-xs font-semibold">{pct}%</span>
                    </div>
                    <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                      <div className="h-full rounded-full" style={{ width: `${pct}%`, background: color }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Recent visits */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="px-5 py-3 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
          <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Recent Visitors</h2>
          <span className="text-xs text-slate-400">Last 50</span>
        </div>
        {recent.length === 0 ? (
          <div className="px-5 py-10 text-center text-sm text-slate-400">No visits recorded yet — visits will appear here once someone loads the public site.</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100">
                {["When", "Page", "Country", "City", "Device", "Browser", "Referrer"].map((h) => (
                  <th key={h} className="text-left px-4 py-2.5 text-xs font-semibold text-slate-400 uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {recent.map((v) => (
                <tr key={v.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-2.5 text-slate-400 text-xs whitespace-nowrap">{timeAgo(v.createdAt)}</td>
                  <td className="px-4 py-2.5 font-mono text-xs text-slate-600 max-w-[120px] truncate">{v.page}</td>
                  <td className="px-4 py-2.5 text-slate-600 whitespace-nowrap">{countryFlag(v.country)} {v.country ?? "—"}</td>
                  <td className="px-4 py-2.5 text-slate-500 text-xs">{v.city ?? "—"}</td>
                  <td className="px-4 py-2.5 text-slate-500 text-xs">{deviceIcon(v.device)} {v.device ?? "—"}</td>
                  <td className="px-4 py-2.5 text-slate-500 text-xs">{v.browser ?? "—"}</td>
                  <td className="px-4 py-2.5 text-slate-400 text-xs max-w-[160px] truncate">{v.referrer ? new URL(v.referrer).hostname : "Direct"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
