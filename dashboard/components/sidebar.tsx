"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { cn } from "@/lib/utils";
import Image from "next/image";

const nav = [
  { href: "/", label: "Dashboard", icon: "⊞" },
  { href: "/rides", label: "Ride Board", icon: "🚐" },
  { href: "/rides/new", label: "Book a Ride", icon: "＋" },
  { href: "/clients", label: "Clients", icon: "👤" },
  { href: "/drivers", label: "Drivers", icon: "🪪" },
  { href: "/billing", label: "Billing Queue", icon: "💳" },
  { href: "/invoices", label: "Invoices", icon: "🧾" },
  { href: "/calendar", label: "Calendar", icon: "📅" },
  { href: "/notifications", label: "Notifications", icon: "🔔" },
];

export function Sidebar() {
  const path = usePathname();
  return (
    <aside className="w-60 shrink-0 bg-[#0D2B4E] flex flex-col h-full">
      <div className="px-6 py-5 border-b border-white/10 flex flex-col gap-1">
        <Image src="/logo-white.svg" alt="Harbor Grove Care & Mobility" width={160} height={48} className="object-contain" priority />
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
              <span className="text-base">{item.icon}</span>
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="px-3 py-4 border-t border-white/10">
        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-slate-400 hover:bg-white/5 hover:text-white transition-colors"
        >
          <span>🚪</span> Sign out
        </button>
      </div>
    </aside>
  );
}
