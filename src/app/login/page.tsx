"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { apiFetch, getToken } from "@/lib/api";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("manager@nemora.com");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const data: any = await apiFetch("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({ email: email.trim(), password }),
      });

      // Store token
      if (typeof window !== "undefined" && data?.access_token) {
        localStorage.setItem("nemora_token", data.access_token);
      }

      // Redirect by role (from JWT or from response)
      const token = data?.access_token;
      let role = data?.role;
      if (!role && token) {
        try {
          const payload = JSON.parse(atob(token.split(".")[1]));
          role = payload.role;
        } catch {}
      }

      if (role === "ADMIN") router.push("/admin");
      else if (role === "MANAGER") router.push("/manager");
      else router.push("/rep");
    } catch (err: any) {
      let msg = err?.message || "Unable to connect to NEMORA. Please try again.";
      try {
        const parsed = JSON.parse(msg);
        msg = parsed.detail || msg;
      } catch {}
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex" dir="rtl">
      {/* Left: Branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white p-12 flex-col justify-between relative overflow-hidden">
        <div className="absolute -top-32 -end-32 w-96 h-96 bg-sky-500/20 rounded-full blur-3xl" />
        <div className="absolute -bottom-32 -start-32 w-96 h-96 bg-teal-500/20 rounded-full blur-3xl" />

        <div className="relative flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-sky-400 to-teal-400 flex items-center justify-center font-bold text-lg">
            N
          </div>
          <span className="text-xl font-bold tracking-tight">NEMORA</span>
        </div>

        <div className="relative">
          <h1 className="text-4xl font-bold leading-tight mb-4">
            Smarter Fieldwork.
            <br />
            <span className="bg-gradient-to-r from-sky-400 to-teal-400 bg-clip-text text-transparent">
              Stronger Healthcare.
            </span>
          </h1>
          <p className="text-slate-300 text-sm leading-relaxed max-w-md">
            One connected workspace for healthcare field teams, professionals, visits, and performance.
          </p>
        </div>

        <div className="relative space-y-2">
          {[
            "GPS-verified field visits",
            "Location intelligence with PostGIS",
            "Team performance & KPI tracking",
            "Secure multi-tenant platform",
          ].map((f, i) => (
            <div key={i} className="flex items-center gap-2 text-xs text-slate-400">
              <span className="w-1.5 h-1.5 rounded-full bg-teal-400" />
              {f}
            </div>
          ))}
        </div>
      </div>

      {/* Right: Login Form */}
      <div className="flex-1 flex items-center justify-center p-8 bg-slate-50">
        <div className="w-full max-w-sm">
          <div className="mb-8">
            <h2 className="text-3xl font-bold text-slate-900 mb-2">Sign in</h2>
            <p className="text-sm text-slate-500">Welcome back. Please enter your details.</p>
          </div>

          {error && (
            <div className="mb-5 rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-400 transition"
                placeholder="you@company.com"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="w-full px-4 py-3 pe-16 rounded-xl border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-400 transition"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute end-3 top-1/2 -translate-y-1/2 text-xs font-medium text-slate-500 hover:text-slate-800"
                >
                  {showPassword ? "Hide" : "Show"}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between text-sm">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={remember}
                  onChange={(e) => setRemember(e.target.checked)}
                  className="w-4 h-4 rounded accent-sky-500"
                />
                <span className="text-slate-600">Remember me</span>
              </label>
              <Link href="/forgot-password" className="text-sky-600 hover:text-sky-800 font-medium">
                Forgot password?
              </Link>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-xl bg-slate-900 hover:bg-slate-800 disabled:opacity-60 text-white text-sm font-semibold transition shadow-md"
            >
              {loading ? "Signing in..." : "Sign in"}
            </button>
          </form>

          <div className="mt-6 rounded-xl bg-sky-50 border border-sky-100 px-4 py-3">
            <div className="text-[11px] font-semibold text-sky-900 mb-1">DEMO ACCOUNT</div>
            <div className="text-[11px] text-sky-700">Email: admin@nemora.com</div>
            <div className="text-[11px] text-sky-700">Password: NemoraAdmin2025</div>
          </div>

          <div className="mt-6 text-center">
            <Link href="/" className="text-xs text-slate-500 hover:text-slate-700">
              ← Back to home
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}