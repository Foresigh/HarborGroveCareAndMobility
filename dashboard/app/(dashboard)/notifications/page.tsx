import { prisma } from "@/lib/prisma";
import Link from "next/link";

const typeColor: Record<string, string> = {
  INFO: "bg-blue-100 text-blue-700",
  WARNING: "bg-amber-100 text-amber-700",
  ERROR: "bg-rose-100 text-rose-700",
  SUCCESS: "bg-emerald-100 text-emerald-700",
};

export default async function NotificationsPage() {
  const notifications = await prisma.notification.findMany({
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  const unread = notifications.filter((n) => !n.read).length;

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-500">{unread} unread</p>
        {unread > 0 && (
          <form action="/api/notifications/mark-all-read" method="POST">
            <button className="text-xs text-blue-600 hover:underline">Mark all read</button>
          </form>
        )}
      </div>

      <div className="space-y-2">
        {notifications.length === 0 ? (
          <div className="bg-white rounded-xl border border-slate-200 p-10 text-center text-slate-400">
            No notifications
          </div>
        ) : (
          notifications.map((n) => (
            <div
              key={n.id}
              className={`bg-white rounded-xl border p-4 flex items-start gap-3 ${!n.read ? "border-blue-200 bg-blue-50/30" : "border-slate-200"}`}
            >
              <span className={`shrink-0 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold mt-0.5 ${typeColor[n.type] ?? "bg-slate-100 text-slate-600"}`}>
                {n.type}
              </span>
              <div className="flex-1 min-w-0">
                <div className="font-medium text-slate-800 text-sm">{n.title}</div>
                <div className="text-sm text-slate-500 mt-0.5">{n.message}</div>
                {n.link && (
                  <Link href={n.link} className="text-xs text-blue-600 hover:underline mt-1 inline-block">
                    View →
                  </Link>
                )}
              </div>
              <div className="shrink-0 text-xs text-slate-400">
                {n.createdAt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                <br />
                {n.createdAt.toLocaleDateString()}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
