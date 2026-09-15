"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

function Logo() {
  return (
    <svg width="36" height="36" viewBox="0 0 32 32" fill="none">
      <defs>
        <linearGradient id="ng2" x1="0" y1="0" x2="32" y2="32" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#0EA5E9" />
          <stop offset="100%" stopColor="#14B8A6" />
        </linearGradient>
      </defs>
      <path d="M6 24V8L16 18L26 8V24" stroke="url(#ng2)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      <circle cx="6" cy="8" r="2.5" fill="#0EA5E9" />
      <circle cx="26" cy="8" r="2.5" fill="#14B8A6" />
      <circle cx="16" cy="18" r="2.5" fill="#0A1628" />
    </svg>
  );
}

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("http://127.0.0.1:8000/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.detail || "Invalid email or password");
        setLoading(false);
        return;
      }
      localStorage.setItem("nemora_token", data.access_token);
      const payload = JSON.parse(atob(data.access_token.split(".")[1]));
      const role = payload.role;
      if (role === "ADMIN") router.push("/admin");
      else if (role === "MANAGER") router.push("/manager");
      else router.push("/rep");
    } catch {
      setError("Unable to connect to NEMORA. Please try again.");
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex">
      <div className="hidden lg:flex lg:w-1/2 bg-slate-900 text-white p-12 flex-col justify-between relative overflow-hidden">
        <div className="absolute inset-0 opacity-20">
          <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-sky-500 rounded-full blur-3xl translate-x-1/3 -translate-y-1/3" />
          <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-teal-500 rounded-full blur-3xl -translate-x-1/3 translate-y-1/3" />
        </div>
        <div className="relative">
          <Link href="/" className="flex items-center gap-2">
            <Logo />
            <span className="text-2xl font-bold tracking-tight">NEMORA</span>
          </Link>
        </div>
        <div className="relative">
          <h1 className="text-4xl font-bold leading-tight mb-6">
            Smarter Fieldwork.<br />
            <span className="text-sky-400">Stronger Healthcare.</span>
          </h1>
          <p className="text-slate-300 mb-8 leading-relaxed">
            One connected workspace for healthcare field teams, professionals, visits, and performance.
          </p>
          <ul className="space-y-3 text-slate-300">
            {["GPS-verified field visits", "Location intelligence with PostGIS", "Team performance & KPI tracking", "Secure multi-tenant platform"].map((t) => (
              <li key={t} className="flex items-center gap-3">
                <span className="w-5 h-5 rounded-full bg-teal-500/20 border border-teal-500/40 flex items-center justify-center text-teal-400 text-xs">✓</span>
                {t}
              </li>
            ))}
          </ul>
        </div>
        <div className="relative text-xs text-slate-500">© 2026 NEMORA. Healthcare Field Intelligence.</div>
      </div>

      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 bg-slate-50">
        <div className="w-full max-w-md">
          <div className="lg:hidden mb-8 flex justify-center">
            <Link href="/" className="flex items-center gap-2">
              <Logo />
              <span className="text-2xl font-bold tracking-tight text-slate-900">NEMORA</span>
            </Link>
          </div>
          <div className="mb-8">
            <h2 className="text-3xl font-bold text-slate-900 mb-2">Sign in</h2>
            <p className="text-slate-600">Welcome back. Please enter your details.</p>
          </div>
          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">{error}</div>
            )}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Email</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@company.com"
                className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500/30 focus:border-sky-500 transition"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Password</label>
              <div className="relative">
                <input
                  type={showPw ? "text" : "password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500/30 focus:border-sky-500 transition"
                />
                <button
                  type="button"
                  onClick={() => setShowPw(!showPw)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-medium text-slate-500 hover:text-slate-800"
                >
                  {showPw ? "Hide" : "Show"}
                </button>
              </div>
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-xl bg-slate-900 hover:bg-slate-800 disabled:bg-slate-400 text-white font-medium transition shadow-sm"
            >
              {loading ? "Signing in..." : "Sign in"}
            </button>
          </form>
          <div className="mt-8 p-4 rounded-xl bg-sky-50 border border-sky-100">
            <div className="text-xs font-semibold text-sky-900 mb-2 uppercase tracking-wide">Demo account</div>
            <div className="text-xs text-sky-800 space-y-1">
              <div><span className="font-medium">Email:</span> admin@nemora.com</div>
              <div><span className="font-medium">Password:</span> NemoraAdmin2025</div>
            </div>
          </div>
          <div className="mt-6 text-center text-sm text-slate-500">
            <Link href="/" className="hover:text-slate-900 transition">← Back to home</Link>
          </div>
        </div>
      </div>
    </div>
  );
}