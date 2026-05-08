"use client";
import { useState, useEffect } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

const SLIDES = [
  "/bg-1.jpg",
  "/bg-2.jpg",
  "/bg-3.jpg",
  "/bg-4.png",
  "/bg-5.jpg",
  "/bg-6.jpg",
];

export default function LoginPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [current, setCurrent] = useState(0);
  const [prev, setPrev] = useState<number | null>(null);

  useEffect(() => {
    const timer = setInterval(() => {
      setPrev(current);
      setCurrent((c) => (c + 1) % SLIDES.length);
    }, 5000);
    return () => clearInterval(timer);
  }, [current]);

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

      {/* Slider backgrounds */}
      {SLIDES.map((src, i) => (
        <div
          key={src}
          className="absolute inset-0 bg-cover bg-center transition-opacity duration-1000"
          style={{
            backgroundImage: `url('${src}')`,
            opacity: i === current ? 1 : i === prev ? 0 : 0,
            zIndex: i === current ? 1 : i === prev ? 0 : 0,
          }}
        />
      ))}

      {/* Dark overlay */}
      <div className="absolute inset-0 bg-[#0D2B4E]/65" style={{ zIndex: 2 }} />

      {/* Slide dots */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-2" style={{ zIndex: 3 }}>
        {SLIDES.map((_, i) => (
          <button
            key={i}
            onClick={() => { setPrev(current); setCurrent(i); }}
            className="w-2 h-2 rounded-full transition-all"
            style={{ background: i === current ? "#F9A825" : "rgba(255,255,255,0.4)" }}
          />
        ))}
      </div>

      {/* Login card */}
      <div className="relative w-full max-w-sm mx-6 md:mr-20" style={{ zIndex: 3 }}>
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
            <div className="bg-white rounded-xl px-4 py-3">
              <img
                src="/logo.png"
                alt="Harbor Grove Care & Mobility"
                style={{ width: 160, height: "auto", display: "block" }}
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
