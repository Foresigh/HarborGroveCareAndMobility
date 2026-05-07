"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";

const titles: Record<string, string> = {
  "/": "Dashboard",
  "/rides": "Ride Board",
  "/rides/new": "Book a Ride",
  "/clients": "Clients",
  "/drivers": "Drivers",
  "/billing": "Billing Queue",
  "/invoices": "Invoices",
  "/calendar": "Calendar",
  "/notifications": "Notifications",
};

export function Topbar({ userName }: { userName?: string | null }) {
  const path = usePathname();
  const title =
    Object.entries(titles)
      .filter(([k]) => path === k || path.startsWith(k + "/"))
      .sort((a, b) => b[0].length - a[0].length)[0]?.[1] ?? "Dashboard";

  return (
    <header className="h-14 border-b border-slate-200 bg-white flex items-center justify-between px-6 shrink-0">
      <h1 className="text-slate-800 font-semibold text-base">{title}</h1>
      <div className="flex items-center gap-3">
        <Link
          href="/notifications"
          className="text-slate-500 hover:text-slate-800 text-lg leading-none"
          title="Notifications"
        >
          🔔
        </Link>
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white text-xs font-bold">
            {userName?.[0]?.toUpperCase() ?? "U"}
          </div>
          <button
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="text-xs text-slate-500 hover:text-slate-800 px-2 py-1 rounded hover:bg-slate-100 transition-colors"
            title="Sign out"
          >
            Sign out
          </button>
        </div>
      </div>
    </header>
  );
}
