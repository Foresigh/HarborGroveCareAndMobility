"use client";
import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

export default function LoginPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    const fd = new FormData(e.currentTarget);
    const res = await signIn("credentials", {
      email: fd.get("email"),
      password: fd.get("password"),
      redirect: false,
    });
    setLoading(false);
    if (res?.error) {
      toast.error("Invalid email or password");
    } else {
      router.push("/");
    }
  }

  return (
    <div
      className="relative min-h-screen flex items-center justify-end bg-cover bg-center bg-no-repeat"
      style={{ backgroundImage: "url('/nemt-van.png')" }}
    >
      {/* dark overlay */}
      <div className="absolute inset-0 bg-[#0D2B4E]/65" />

      {/* login card — right side */}
      <div className="relative z-10 w-full max-w-sm mr-8 md:mr-16 lg:mr-24">
        <div
          className="rounded-2xl p-8 space-y-6"
          style={{
            background: "rgba(255,255,255,0.10)",
            backdropFilter: "blur(16px)",
            WebkitBackdropFilter: "blur(16px)",
            border: "1px solid rgba(255,255,255,0.18)",
            boxShadow: "0 8px 32px rgba(0,0,0,0.3)",
          }}
        >
          {/* logo */}
          <div className="flex flex-col items-center gap-2 pb-2">
            <img
              src="/logo-white.svg"
              alt="Harbor Grove Care & Mobility"
              style={{ width: 180, height: "auto" }}
            />
            <p className="text-white/60 text-xs tracking-wide">Operations Dashboard</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-white/70 uppercase tracking-wide">Email</label>
              <input
                name="email"
                type="email"
                required
                placeholder="admin@harborgrove.com"
                className="w-full rounded-lg px-3 py-2.5 text-sm text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-[#F9A825]"
                style={{ background: "rgba(255,255,255,0.12)", border: "1px solid rgba(255,255,255,0.2)" }}
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-white/70 uppercase tracking-wide">Password</label>
              <input
                name="password"
                type="password"
                required
                placeholder="••••••••"
                className="w-full rounded-lg px-3 py-2.5 text-sm text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-[#F9A825]"
                style={{ background: "rgba(255,255,255,0.12)", border: "1px solid rgba(255,255,255,0.2)" }}
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 rounded-lg text-sm font-bold transition-all disabled:opacity-60"
              style={{ background: "#F9A825", color: "#0D2B4E" }}
            >
              {loading ? "Signing in…" : "Sign In"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
