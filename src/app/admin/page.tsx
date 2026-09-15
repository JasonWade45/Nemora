"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { apiFetch, getAnalyticsOverview, getVisits, getMyReps, User, AnalyticsOverview, Visit, getAllDoctors } from "@/lib/api";
import { Icon, icons } from "@/components/ui/Icons";

function fmtTime(dt: string | null | undefined) {
  if (!dt) return "—";
  try {
    return new Date(dt).toLocaleString("ar-EG", {
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "—";
  }
}

export default function AdminDashboard() {
  const [me, setMe] = useState<User | null>(null);
  const [stats, setStats] = useState<AnalyticsOverview | null>(null);
  const [reps, setReps] = useState<User[]>([]);
  const [recentVisits, setRecentVisits] = useState<Visit[]>([]);
  const [doctorsCount, setDoctorsCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const [meData, overview, repsData, visitsData, docs] = await Promise.all([
          apiFetch<User>("/api/auth/me").catch(() => null),
          getAnalyticsOverview({ days: 30 }).catch(() => null),
          getMyReps().catch(() => []),
          getVisits().catch(() => ({ items: [], total: 0 })),
          getAllDoctors().catch(() => []),
        ]);
        setMe(meData);
        setStats(overview);
        setReps(repsData || []);
        setRecentVisits((visitsData.items || []).slice(0, 5));
        setDoctorsCount(docs.length);
      } catch {}
      setLoading(false);
    })();
  }, []);

  const QUICK_LINKS = [
    { href: "/admin/my-reps",   label: "مندوبيني",       icon: icons.users,   color: "from-sky-500 to-cyan-500" },
    { href: "/admin/visits",    label: "زيارات الفريق",  icon: icons.visits,  color: "from-indigo-500 to-violet-500" },
    { href: "/admin/analytics", label: "التحليلات",      icon: icons.target,  color: "from-teal-500 to-emerald-500" },
    { href: "/admin/products",  label: "المنتجات",       icon: icons.doctors, color: "from-purple-500 to-pink-500" },
  ];

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto space-y-6 p-6">
        <div className="h-32 bg-slate-100 rounded-2xl animate-pulse" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-28 bg-slate-100 rounded-2xl animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  const initials = (me?.full_name || "A")
    .split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-10 p-6">
      {/* Welcome banner */}
      <div className="relative rounded-3xl bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white p-6 md:p-8 overflow-hidden">
        <div className="absolute -top-20 -end-20 w-72 h-72 bg-sky-500/20 rounded-full blur-3xl" />
        <div className="absolute -bottom-20 -start-20 w-72 h-72 bg-teal-500/20 rounded-full blur-3xl" />
        <div className="relative flex items-center gap-5">
          <div className="w-16 h-16 md:w-20 md:h-20 rounded-2xl bg-gradient-to-br from-sky-400 to-teal-400 flex items-center justify-center text-2xl md:text-3xl font-bold shadow-2xl shadow-sky-500/30 shrink-0">
            {initials}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-[11px] font-medium text-sky-200 uppercase tracking-widest mb-1">
              لوحة المشرف
            </div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight">
              أهلاً {me?.full_name?.split(" ")[0] || "بيك"} 👋
            </h1>
            <p className="text-sm text-slate-300 mt-1.5">
              نظرة سريعة على أداء فريقك والأرقام الأساسية
            </p>
          </div>
        </div>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Link
          href="/admin/analytics"
          className="rounded-2xl bg-white border border-slate-200 p-5 hover:border-sky-300 hover:shadow-lg hover:shadow-sky-500/5 hover:-translate-y-0.5 transition-all"
        >
          <div className="w-10 h-10 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center mb-3">
            <Icon d={icons.visits} size={20} />
          </div>
          <div className="text-xs font-medium text-slate-500 mb-1">زيارات الفريق</div>
          <div className="text-3xl font-bold text-slate-900 tabular-nums">
            {stats?.totals.visits ?? 0}
          </div>
          <div className="text-[10px] text-slate-400 mt-1">آخر 30 يوم</div>
        </Link>

        <Link
          href="/admin/analytics"
          className="rounded-2xl bg-white border border-slate-200 p-5 hover:border-teal-300 hover:shadow-lg hover:shadow-teal-500/5 hover:-translate-y-0.5 transition-all"
        >
          <div className="w-10 h-10 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center mb-3">
            <Icon d={icons.check} size={20} />
          </div>
          <div className="text-xs font-medium text-slate-500 mb-1">زيارات مكتملة</div>
          <div className="text-3xl font-bold text-slate-900 tabular-nums">
            {stats?.totals.completed ?? 0}
          </div>
          <div className="text-[10px] text-teal-600 mt-1 font-medium">
            {stats?.totals.conversion_rate ?? 0}% معدل التحويل
          </div>
        </Link>

        <Link
          href="/admin/my-reps"
          className="rounded-2xl bg-white border border-slate-200 p-5 hover:border-indigo-300 hover:shadow-lg hover:shadow-indigo-500/5 hover:-translate-y-0.5 transition-all"
        >
          <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center mb-3">
            <Icon d={icons.users} size={20} />
          </div>
          <div className="text-xs font-medium text-slate-500 mb-1">مندوبيني</div>
          <div className="text-3xl font-bold text-slate-900 tabular-nums">
            {reps.length}
          </div>
          <div className="text-[10px] text-slate-400 mt-1">في الفريق</div>
        </Link>

        <Link
          href="/admin/analytics"
          className="rounded-2xl bg-white border border-slate-200 p-5 hover:border-amber-300 hover:shadow-lg hover:shadow-amber-500/5 hover:-translate-y-0.5 transition-all"
        >
          <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center mb-3">
            <Icon d={icons.doctors} size={20} />
          </div>
          <div className="text-xs font-medium text-slate-500 mb-1">أطباء مميزين</div>
          <div className="text-3xl font-bold text-slate-900 tabular-nums">
            {stats?.totals.unique_doctors ?? 0}
          </div>
          <div className="text-[10px] text-slate-400 mt-1">تمت زيارتهم</div>
        </Link>
      </div>

      {/* Quick links */}
      <div>
        <h2 className="text-sm font-semibold text-slate-700 mb-3">إجراءات سريعة</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {QUICK_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="group rounded-2xl bg-white border border-slate-200 p-4 hover:border-slate-300 hover:shadow-md transition-all text-center"
            >
              <div
                className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${link.color} text-white flex items-center justify-center mx-auto mb-3 shadow-sm group-hover:scale-110 transition-transform`}
              >
                <Icon d={link.icon} size={22} />
              </div>
              <div className="text-xs font-semibold text-slate-800 group-hover:text-slate-900">
                {link.label}
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* Recent visits */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-slate-700">آخر زيارات فريقي</h2>
          <Link
            href="/admin/visits"
            className="text-xs font-medium text-sky-600 hover:text-sky-800 flex items-center gap-1"
          >
            عرض الكل
            <span className="rtl:rotate-180">
              <Icon d={icons.chevron} size={12} />
            </span>
          </Link>
        </div>

        {recentVisits.length === 0 ? (
          <div className="rounded-2xl bg-white border border-slate-200 p-10 text-center">
            <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 mx-auto mb-3">
              <Icon d={icons.visits} size={22} />
            </div>
            <div className="text-sm font-medium text-slate-700 mb-1">
              لا توجد زيارات بعد
            </div>
          </div>
        ) : (
          <div className="rounded-2xl bg-white border border-slate-200 overflow-hidden">
            {recentVisits.map((v, idx) => (
              <div
                key={v.id}
                className={`flex items-center gap-4 p-4 hover:bg-slate-50 transition ${
                  idx !== recentVisits.length - 1 ? "border-b border-slate-100" : ""
                }`}
              >
                <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-sky-500 to-teal-500 text-white flex items-center justify-center font-bold text-sm shrink-0">
                  {v.doctor_name?.slice(0, 1) || "?"}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold text-slate-900 truncate">
                    {v.doctor_name}
                  </div>
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 mt-0.5 text-[11px] text-slate-500">
                    <span>{v.rep_name || "—"}</span>
                    <span>·</span>
                    <span>{fmtTime(v.checked_in_at)}</span>
                    {v.duration_minutes != null && (
                      <>
                        <span>·</span>
                        <span>{v.duration_minutes} دقيقة</span>
                      </>
                    )}
                  </div>
                </div>
                <span
                  className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-semibold border shrink-0 ${
                    v.status === "COMPLETED"
                      ? "bg-teal-50 text-teal-700 border-teal-200"
                      : v.status === "CHECKED_IN"
                      ? "bg-amber-50 text-amber-700 border-amber-200"
                      : "bg-slate-50 text-slate-600 border-slate-200"
                  }`}
                >
                  {v.status === "COMPLETED"
                    ? "مكتملة"
                    : v.status === "CHECKED_IN"
                    ? "نشطة"
                    : v.status === "PLANNED"
                    ? "مخططة"
                    : v.status}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}