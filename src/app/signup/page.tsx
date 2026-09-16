"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { signup } from "@/lib/api";

export default function SignupPage() {
  const router = useRouter();
  const [orgName, setOrgName] = useState("");
  const [orgSlug, setOrgSlug] = useState("");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function suggestSlug(name: string) {
    return name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9\s-]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-")
      .slice(0, 40);
  }

  function handleOrgNameChange(v: string) {
    setOrgName(v);
    if (!orgSlug || orgSlug === suggestSlug(orgName)) {
      setOrgSlug(suggestSlug(v));
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const data = await signup({
        organization_name: orgName.trim(),
        organization_slug: orgSlug.trim().toLowerCase(),
        admin_full_name: fullName.trim(),
        admin_email: email.trim().toLowerCase(),
        admin_password: password,
      });

      if (typeof window !== "undefined" && data.access_token) {
        localStorage.setItem("nemora_token", data.access_token);
      }

      router.push("/admin");
    } catch (err: any) {
      let msg = err?.message || "Failed to create account";
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
            ابدأ رحلتك مع
            <br />
            <span className="bg-gradient-to-r from-sky-400 to-teal-400 bg-clip-text text-transparent">
              NEMORA اليوم.
            </span>
          </h1>
          <p className="text-slate-300 text-sm leading-relaxed max-w-md">
            أنشئ حساب شركتك في دقيقة، وابدأ إدارة فريق المبيعات الميداني فوراً.
          </p>
        </div>

        <div className="relative space-y-2">
          {[
            "٣٠ يوم تجربة مجانية",
            "بدون بطاقة ائتمان",
            "إلغاء في أي وقت",
            "دعم فني بالعربية",
          ].map((f, i) => (
            <div key={i} className="flex items-center gap-2 text-xs text-slate-400">
              <span className="w-1.5 h-1.5 rounded-full bg-teal-400" />
              {f}
            </div>
          ))}
        </div>
      </div>

      {/* Right: Signup Form */}
      <div className="flex-1 flex items-center justify-center p-8 bg-slate-50 overflow-y-auto">
        <div className="w-full max-w-md py-8">
          <div className="mb-8">
            <h2 className="text-3xl font-bold text-slate-900 mb-2">سجّل شركتك</h2>
            <p className="text-sm text-slate-500">ابدأ في أقل من دقيقة. مجاناً بالكامل.</p>
          </div>

          {error && (
            <div className="mb-5 rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                اسم الشركة
              </label>
              <input
                type="text"
                value={orgName}
                onChange={(e) => handleOrgNameChange(e.target.value)}
                required
                className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-400 transition"
                placeholder="مثال: نيل فارما"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                رابط الشركة (Slug)
              </label>
              <input
                type="text"
                value={orgSlug}
                onChange={(e) => setOrgSlug(e.target.value.toLowerCase())}
                required
                dir="ltr"
                pattern="^[a-z0-9-]+$"
                className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-400 transition font-mono"
                placeholder="nile-pharma"
              />
              <p className="mt-1 text-[11px] text-slate-500">
                حروف إنجليزية صغيرة وأرقام وشرطات فقط
              </p>
            </div>

            <div className="border-t border-slate-200 pt-4">
              <div className="text-[11px] font-semibold text-slate-500 mb-3 uppercase tracking-wide">
                حساب المدير
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">
                    الاسم الكامل
                  </label>
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    required
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-400 transition"
                    placeholder="أحمد حسن"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">
                    البريد الإلكتروني
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    dir="ltr"
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-400 transition"
                    placeholder="admin@company.com"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">
                    كلمة المرور
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      minLength={8}
                      className="w-full px-4 py-3 pe-16 rounded-xl border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-400 transition"
                      placeholder="••••••••"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((v) => !v)}
                      className="absolute end-3 top-1/2 -translate-y-1/2 text-xs font-medium text-slate-500 hover:text-slate-800"
                    >
                      {showPassword ? "إخفاء" : "إظهار"}
                    </button>
                  </div>
                  <p className="mt-1 text-[11px] text-slate-500">8 أحرف على الأقل</p>
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-sky-500 to-teal-500 hover:from-sky-600 hover:to-teal-600 disabled:opacity-60 text-white text-sm font-bold transition shadow-md shadow-sky-500/20"
            >
              {loading ? "جاري إنشاء الحساب..." : "إنشاء الحساب"}
            </button>
          </form>

          <div className="mt-6 text-center text-sm text-slate-600">
            عندك حساب بالفعل؟{" "}
            <Link href="/login" className="text-sky-600 hover:text-sky-800 font-medium">
              سجّل دخول
            </Link>
          </div>

          <div className="mt-6 text-center">
            <Link href="/" className="text-xs text-slate-500 hover:text-slate-700">
              ← رجوع للصفحة الرئيسية
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}