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
      <div className="absolute inset-0" style={{ background: "rgba(13,43,78,0.72)", zIndex: 1 }} />

      {/* Dot indicators */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-2" style={{ zIndex: 3 }}>
        {SLIDES.map((_, i) => (
          <button
            key={i}
            onClick={() => setCurrent(i)}
            className="rounded-full transition-all duration-300"
            style={{ width: i === current ? 20 : 8, height: 8, background: i === current ? "#F9A825" : "rgba(255,255,255,0.35)" }}
          />
        ))}
      </div>

      {/* Login card */}
      <div className="relative w-full max-w-[360px] mx-6 md:mr-20" style={{ zIndex: 2 }}>
        <div
          className="rounded-2xl px-8 py-10"
          style={{
            background: "rgba(255,255,255,0.08)",
            backdropFilter: "blur(24px)",
            WebkitBackdropFilter: "blur(24px)",
            border: "1px solid rgba(255,255,255,0.15)",
            boxShadow: "0 12px 48px rgba(0,0,0,0.5)",
          }}
        >
          {/* Logo */}
          <div className="flex flex-col items-center mb-8">
            <Image src={logo} alt="Harbor Grove Care & Mobility" width={200} height={68} className="object-contain" style={{ filter: "drop-shadow(0 2px 8px rgba(255,255,255,0.25))" }} priority />
            <div className="mt-5 text-center">
              <h1 className="text-white text-2xl font-bold">Welcome back</h1>
              <p className="text-white/50 text-sm mt-1">Sign in to manage your operations</p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Email */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-white/60 uppercase tracking-wider">Email</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40">
                  <svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16">
                    <path d="M20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z"/>
                  </svg>
                </span>
                <input
                  name="email"
                  type="email"
                  required
                  placeholder="admin@harborgrove.com"
                  className="w-full rounded-xl pl-9 pr-3 py-3 text-sm text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-[#F9A825]"
                  style={{ background: "rgba(255,255,255,0.10)", border: "1px solid rgba(255,255,255,0.15)" }}
                />
              </div>
            </div>

            {/* Password */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-white/60 uppercase tracking-wider">Password</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40">
                  <svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16">
                    <path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1s3.1 1.39 3.1 3.1v2z"/>
                  </svg>
                </span>
                <input
                  name="password"
                  type="password"
                  required
                  placeholder="••••••••"
                  className="w-full rounded-xl pl-9 pr-3 py-3 text-sm text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-[#F9A825]"
                  style={{ background: "rgba(255,255,255,0.10)", border: "1px solid rgba(255,255,255,0.15)" }}
                />
              </div>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 rounded-xl text-sm font-bold transition-all disabled:opacity-60 hover:brightness-110"
                style={{ background: "#F9A825", color: "#0D2B4E" }}
              >
                {loading ? "Signing in…" : "→ Sign In"}
              </button>
            </div>
          </form>

          <p className="text-center text-white/25 text-xs mt-8">
            Harbor Grove Care & Mobility LLC
          </p>
        </div>
      </div>
    </div>
  );
}
