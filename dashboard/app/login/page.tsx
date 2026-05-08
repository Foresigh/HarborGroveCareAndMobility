"use client";
import { useState, useEffect } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import Image from "next/image";
import bg1 from "./images/bg1.jpg";
import bg2 from "./images/bg2.jpg";
import bg3 from "./images/bg3.jpg";
import bg4 from "./images/bg4.png";
import bg5 from "./images/bg5.jpg";
import bg6 from "./images/bg6.jpg";
import logo from "./images/logo.png";

const SLIDES = [bg1, bg2, bg3, bg4, bg5, bg6];

export default function LoginPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrent((c) => (c + 1) % SLIDES.length);
    }, 5000);
    return () => clearInterval(timer);
  }, []);

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

      {/* Slide images */}
      {SLIDES.map((src, i) => (
        <Image
          key={i}
          src={src}
          alt=""
          fill
          className="object-cover object-center"
          style={{ opacity: i === current ? 1 : 0, transition: "opacity 1.2s ease-in-out", zIndex: 0 }}
          priority={i === 0}
        />
      ))}

      {/* Dark overlay */}
      <div className="absolute inset-0" style={{ background: "rgba(13,43,78,0.65)", zIndex: 1 }} />

      {/* Dot indicators */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-2" style={{ zIndex: 3 }}>
        {SLIDES.map((_, i) => (
          <button
            key={i}
            onClick={() => setCurrent(i)}
            className="rounded-full transition-all duration-300"
            style={{ width: i === current ? 20 : 8, height: 8, background: i === current ? "#F9A825" : "rgba(255,255,255,0.4)" }}
          />
        ))}
      </div>

      {/* Login card */}
      <div className="relative w-full max-w-sm mx-6 md:mr-20" style={{ zIndex: 2 }}>
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
          <div className="flex flex-col items-center gap-2 pb-2">
            <div className="bg-white rounded-xl px-5 py-3">
              <Image src={logo} alt="Harbor Grove Care & Mobility" width={160} height={54} className="object-contain" priority />
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
