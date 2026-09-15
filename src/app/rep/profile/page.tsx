"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { User, apiFetch, clearToken, getCurrentShift } from "@/lib/api";
import { Icon, icons } from "@/components/ui/Icons";

export default function ProfilePage() {
  const router = useRouter();
  const [me, setMe] = useState<User | null>(null);
  const [org, setOrg] = useState<{ name: string; slug: string } | null>(null);
  const [shiftActive, setShiftActive] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const [u, o, s] = await Promise.all([
          apiFetch<User>("/api/auth/me").catch(() => null),
          apiFetch<{ name: string; slug: string }>("/api/organizations/me").catch(() => null),
          getCurrentShift().catch(() => ({ active: false, shift: null })),
        ]);
        setMe(u);
        setOrg(o);
        setShiftActive(!!s?.active);
      } catch {}
      setLoading(false);
    })();
  }, []);

  function logout() {
    clearToken();
    router.push("/login");
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-40 bg-slate-100 rounded-2xl animate-pulse" />
        <div className="h-64 bg-slate-100 rounded-2xl animate-pulse" />
      </div>
    );
  }

  const initials = (me?.full_name || "?")
    .split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="rounded-2xl bg-gradient-to-br from-slate-900 to-slate-800 text-white p-6 relative overflow-hidden">
        <div className="absolute -top-16 -end-16 w-56 h-56 bg-sky-500/20 rounded-full blur-3xl" />
        <div className="relative flex items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-sky-400 to-teal-400 flex items-center justify-center text-white text-xl font-bold shadow-lg">
            {initials}
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-lg font-bold truncate">{me?.full_name || "—"}</h1>
            <div className="text-xs text-slate-300 mt-1 truncate">{me?.email || "—"}</div>
            <div className="inline-flex items-center gap-1.5 mt-2 px-2 py-0.5 rounded-full bg-white/10 border border-white/20 text-[11px]">
              <span className="w-1.5 h-1.5 rounded-full bg-teal-400" />
              مندوب طبي
            </div>
          </div>
        </div>
      </div>

      {/* Organization */}
      {org && (
        <div className="rounded-2xl bg-white border border-slate-200 p-5">
          <div className="text-[11px] font-semibold text-slate-500 mb-3 uppercase tracking-wide">الشركة</div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-sky-500 to-teal-500 text-white flex items-center justify-center shrink-0">
              <Icon d={icons.building} size={18} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-semibold text-slate-900">{org.name}</div>
              <div className="text-xs text-slate-500">{org.slug}</div>
            </div>
          </div>
        </div>
      )}

      {/* Account info */}
      <div className="rounded-2xl bg-white border border-slate-200 p-5">
        <div className="text-[11px] font-semibold text-slate-500 mb-3 uppercase tracking-wide">معلومات الحساب</div>
        <div className="space-y-3">
          <div className="flex items-center justify-between py-2 border-b border-slate-100">
            <span className="text-xs text-slate-500">الحالة</span>
            <span className={"inline-flex items-center gap-1.5 text-xs font-medium " + (me?.is_active ? "text-teal-600" : "text-red-600")}>
              <span className={"w-1.5 h-1.5 rounded-full " + (me?.is_active ? "bg-teal-500" : "bg-red-500")} />
              {me?.is_active ? "نشط" : "موقوف"}
            </span>
          </div>
          <div className="flex items-center justify-between py-2 border-b border-slate-100">
            <span className="text-xs text-slate-500">الهاتف</span>
            <span className="text-xs text-slate-900 tabular-nums" dir="ltr">{me?.phone || "—"}</span>
          </div>
          <div className="flex items-center justify-between py-2">
            <span className="text-xs text-slate-500">الشفت</span>
            <span className={"text-xs font-medium " + (shiftActive ? "text-amber-600" : "text-slate-500")}>
              {shiftActive ? "نشط" : "متوقف"}
            </span>
          </div>
        </div>
      </div>

      {/* Logout */}
      <button
        onClick={logout}
        className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl bg-red-50 border border-red-200 text-red-700 text-sm font-semibold hover:bg-red-100 transition"
      >
        <Icon d={icons.close} size={16} />
        تسجيل الخروج
      </button>
    </div>
  );
}