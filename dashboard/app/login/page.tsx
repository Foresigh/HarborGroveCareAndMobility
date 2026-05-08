"use client";
import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import Image from "next/image";

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
    <div className="relative min-h-screen flex items-center justify-end overflow-hidden">

      {/* Background image */}
      <Image
        src="/nemt-van.png"
        alt=""
        fill
        className="object-cover object-center"
        priority
      />

      {/* Dark overlay */}
      <div className="absolute inset-0 bg-[#0D2B4E]/65" />

      {/* Login card */}
      <div className="relative z-10 w-full max-w-sm mx-6 md:mr-20">
        <div
          className="rounded-2xl p-8 space-y-5"
          style={{
            background: "rgba(255,255,255,0.10)",
            backdropFilter: "blur(20px)",
            WebkitBackdropFilter: "blur(20px)",
            border: "1px solid rgba(255,255,255,0.2)",
            boxShadow: "0 8px 40px rgba(0,0,0,0.4)",
          }}
        >
          {/* Logo */}
          <div className="flex flex-col items-center gap-2 pb-2">
            <div className="bg-white/15 rounded-xl px-4 py-3">
              <Image
                src="/logo.png"
                alt="Harbor Grove Care & Mobility"
                width={160}
                height={54}
                className="object-contain"
                priority
              />
            </div>
            <p className="text-white/60 text-xs tracking-widest uppercase mt-1">Operations Dashboard</p>
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
              className="w-full py-2.5 rounded-lg text-sm font-bold transition-all disabled:opacity-60 hover:brightness-110"
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
