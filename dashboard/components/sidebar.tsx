"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { cn } from "@/lib/utils";
import type { ReactElement } from "react";

const GOLD = "#F9A825";

const icons: Record<string, ReactElement> = {
  dashboard: <svg viewBox="0 0 24 24" fill="currentColor" width="17" height="17"><path d="M3 13h8V3H3v10zm0 8h8v-6H3v6zm10 0h8V11h-8v10zm0-18v6h8V3h-8z"/></svg>,
  rides: <svg viewBox="0 0 24 24" fill="currentColor" width="17" height="17"><path d="M18.92 6.01C18.72 5.42 18.16 5 17.5 5h-11c-.66 0-1.21.42-1.42 1.01L3 12v8c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1h12v1c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-8l-2.08-5.99zM6.85 7h10.29l1.08 3.11H5.77L6.85 7zM19 17H5v-5h14v5z"/><circle cx="7.5" cy="14.5" r="1.5"/><circle cx="16.5" cy="14.5" r="1.5"/></svg>,
  new: <svg viewBox="0 0 24 24" fill="currentColor" width="17" height="17"><path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/></svg>,
  clients: <svg viewBox="0 0 24 24" fill="currentColor" width="17" height="17"><path d="M12 12c2.7 0 4.8-2.1 4.8-4.8S14.7 2.4 12 2.4 7.2 4.5 7.2 7.2 9.3 12 12 12zm0 2.4c-3.2 0-9.6 1.6-9.6 4.8v2.4h19.2v-2.4c0-3.2-6.4-4.8-9.6-4.8z"/></svg>,
  drivers: <svg viewBox="0 0 24 24" fill="currentColor" width="17" height="17"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm0 14.2c-2.5 0-4.71-1.28-6-3.22.03-1.99 4-3.08 6-3.08 1.99 0 5.97 1.09 6 3.08-1.29 1.94-3.5 3.22-6 3.22z"/></svg>,
  billing: <svg viewBox="0 0 24 24" fill="currentColor" width="17" height="17"><path d="M20 4H4c-1.11 0-2 .89-2 2v12c0 1.11.89 2 2 2h16c1.11 0 2-.89 2-2V6c0-1.11-.89-2-2-2zm0 14H4v-6h16v6zm0-10H4V6h16v2z"/></svg>,
  invoices: <svg viewBox="0 0 24 24" fill="currentColor" width="17" height="17"><path d="M14 2H6c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z"/></svg>,
  calendar: <svg viewBox="0 0 24 24" fill="currentColor" width="17" height="17"><path d="M17 12h-5v5h5v-5zM16 1v2H8V1H6v2H5c-1.11 0-1.99.9-1.99 2L3 19c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2h-1V1h-2zm3 18H5V8h14v11z"/></svg>,
  notifications: <svg viewBox="0 0 24 24" fill="currentColor" width="17" height="17"><path d="M12 22c1.1 0 2-.9 2-2h-4c0 1.1.9 2 2 2zm6-6v-5c0-3.07-1.64-5.64-4.5-6.32V4c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5v.68C7.63 5.36 6 7.92 6 11v5l-2 2v1h16v-1l-2-2z"/></svg>,
  analytics: <svg viewBox="0 0 24 24" fill="currentColor" width="17" height="17"><path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zM9 17H7v-7h2v7zm4 0h-2V7h2v10zm4 0h-2v-4h2v4z"/></svg>,
  facilities: <svg viewBox="0 0 24 24" fill="currentColor" width="17" height="17"><path d="M12 7V3H2v18h20V7H12zM6 19H4v-2h2v2zm0-4H4v-2h2v2zm0-4H4v-2h2v2zm0-4H4V5h2v2zm4 12H8v-2h2v2zm0-4H8v-2h2v2zm0-4H8v-2h2v2zm0-4H8V5h2v2zm10 12h-8v-2h2v-2h-2v-2h2v-2h-2V9h8v10zm-2-8h-2v2h2v-2zm0 4h-2v2h2v-2z"/></svg>,
  signout: <svg viewBox="0 0 24 24" fill="currentColor" width="17" height="17"><path d="M17 7l-1.41 1.41L18.17 11H8v2h10.17l-2.58 2.58L17 17l5-5zM4 5h8V3H4c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h8v-2H4V5z"/></svg>,
};

const nav = [
  { href: "/", label: "Dashboard", icon: "dashboard" },
  { href: "/rides", label: "Ride Board", icon: "rides" },
  { href: "/rides/new", label: "Book a Ride", icon: "new" },
  { href: "/clients", label: "Clients", icon: "clients" },
  { href: "/drivers", label: "Drivers", icon: "drivers" },
  { href: "/billing", label: "Billing Queue", icon: "billing" },
  { href: "/invoices", label: "Invoices", icon: "invoices" },
  { href: "/calendar", label: "Calendar", icon: "calendar" },
  { href: "/notifications", label: "Notifications", icon: "notifications" },
  { href: "/analytics", label: "Analytics", icon: "analytics" },
  { href: "/facilities", label: "Facilities", icon: "facilities" },
];

export function Sidebar() {
  const path = usePathname();
  return (
    <aside className="w-60 shrink-0 bg-[#0D2B4E] flex flex-col h-full">
      <div className="px-6 py-5 border-b border-white/10 flex flex-col gap-1">
        <img src="/logo.png" alt="Harbor Grove Care & Mobility" style={{ width: 148, height: "auto", display: "block", filter: "brightness(0) invert(1)" }} />
        <div className="text-slate-400 text-xs mt-1">Operations Dashboard</div>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-0.5">
        {nav.map((item) => {
          const active =
            item.href === "/"
              ? path === "/"
              : path === item.href || path.startsWith(item.href + "/");
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                active
                  ? "bg-white/10 text-white"
                  : "text-slate-400 hover:bg-white/5 hover:text-white"
              )}
            >
              <span style={{ color: GOLD, flexShrink: 0 }}>{icons[item.icon]}</span>
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="px-3 py-4 border-t border-white/10">
        <button
          onClick={() => signOut({ callbackUrl: `${window.location.origin}/login` })}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-slate-400 hover:bg-white/5 hover:text-white transition-colors"
        >
          <span style={{ color: GOLD, flexShrink: 0 }}>{icons.signout}</span>
          Sign out
        </button>
      </div>
    </aside>
  );
}
