"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { apiFetch, Organization } from "@/lib/api";
import { Icon, icons } from "@/components/ui/Icons";
import { useLanguage } from "@/lib/language-context";

export default function AdminDashboard() {
  const { t } = useLanguage();
  const [org, setOrg] = useState<Organization | null>(null);
  const [doctors, setDoctors] = useState(0);
  const [users, setUsers] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const [me, docs, us] = await Promise.all([
          apiFetch<Organization>("/api/organizations/me").catch(() => null),
          apiFetch<any>("/api/doctors?page=1&page_size=1").catch(() => ({ total: 0 })),
          apiFetch<any>("/api/users?page=1&page_size=1").catch(() => ({ total: 0 })),
        ]);
        setOrg(me);
        setDoctors(docs.total ?? 0);
        setUsers(us.total ?? 0);
      } catch {}
      setLoading(false);
    })();
  }, []);

  const stats = [
    { label: t.totalDoctors, value: doctors, hint: t.inOrg, icon: icons.doctors, grad: "from-sky-500 to-cyan-400", bg: "bg-sky-50", fg: "text-sky-600" },
    { label: t.teamMembers, value: users, hint: t.activeUsers, icon: icons.users, grad: "from-teal-500 to-emerald-400", bg: "bg-teal-50", fg: "text-teal-600" },
    { label: t.visits30d, value: 0, hint: t.fieldActivity, icon: icons.visits, grad: "from-indigo-500 to-violet-400", bg: "bg-indigo-50", fg: "text-indigo-600" },
    { label: t.followUps, value: 0, hint: t.pendingTasks, icon: icons.reports, grad: "from-amber-500 to-orange-400", bg: "bg-amber-50", fg: "text-amber-600" },
  ];

  const days = ["Sat", "Sun", "Mon", "Tue", "Wed", "Thu", "Fri"];
  const daysAr = ["السبت", "الأحد", "الإثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة"];
  const { lang } = useLanguage();
  const dayLabels = lang === "ar" ? daysAr : days;

  return (
    <div className="max-w-7xl animate-[fadeIn_.4s_ease-out]">
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="text-xs font-semibold text-sky-600 uppercase tracking-wider mb-1">
            {org?.name ?? t.workspace}
          </div>
          <h1 className="text-3xl lg:text-4xl font-bold text-slate-900 tracking-tight">{t.dashboard}</h1>
          <p className="mt-2 text-slate-600">{t.overview}</p>
        </div>
        <Link href="/admin/doctors"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-slate-900 hover:bg-slate-800 text-white text-sm font-medium transition shadow-sm hover:shadow-md">
          <Icon d={icons.plus} size={16} />
          <span>{t.addDoctor}</span>
        </Link>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
        {stats.map((s, i) => (
          <div key={i}
            className="group relative rounded-2xl bg-white border border-slate-200 p-6 hover:shadow-xl hover:shadow-slate-200/60 hover:-translate-y-0.5 transition-all duration-300 overflow-hidden">
            <div className={`absolute top-0 end-0 w-32 h-32 bg-gradient-to-br ${s.grad} opacity-0 group-hover:opacity-5 rounded-full blur-2xl transition-opacity`} />
            <div className="flex items-start justify-between mb-5">
              <div className={`w-11 h-11 rounded-xl ${s.bg} ${s.fg} flex items-center justify-center`}>
                <Icon d={s.icon} size={22} />
              </div>
              <div className={`w-2 h-2 rounded-full bg-gradient-to-br ${s.grad}`} />
            </div>
            <div className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">{s.label}</div>
            <div className="text-3xl lg:text-4xl font-bold text-slate-900 tabular-nums mb-2">
              {loading
                ? <span className="inline-block w-14 h-9 bg-slate-100 rounded animate-pulse" />
                : s.value}
            </div>
            <div className="text-xs text-slate-500">{s.hint}</div>
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-3 gap-5 mb-8">
        <div className="lg:col-span-2 rounded-2xl bg-white border border-slate-200 p-6">
          <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
            <div>
              <h3 className="text-lg font-semibold text-slate-900">{t.fieldActivityTitle}</h3>
              <p className="text-sm text-slate-500 mt-0.5">{t.last7Days}</p>
            </div>
            <div className="flex gap-3 text-xs">
              <span className="flex items-center gap-1.5 text-slate-600">
                <span className="w-2 h-2 rounded-full bg-sky-500" /> {t.visits}
              </span>
              <span className="flex items-center gap-1.5 text-slate-600">
                <span className="w-2 h-2 rounded-full bg-teal-400" /> {t.followUps}
              </span>
            </div>
          </div>
          <div className="h-56 flex items-end gap-2 lg:gap-3">
            {[40, 65, 45, 80, 55, 90, 70].map((h, i) => (
              <div key={i} className="flex-1 flex flex-col items-center gap-2">
                <div className="w-full rounded-t-md bg-gradient-to-t from-sky-500 to-teal-400 transition-all duration-500 hover:from-sky-600 hover:to-teal-500"
                  style={{ height: `${h}%` }} />
                <span className="text-[10px] text-slate-400 font-medium whitespace-nowrap">{dayLabels[i]}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-2xl bg-gradient-to-br from-slate-900 to-slate-800 text-white p-6 relative overflow-hidden">
          <div className="absolute -top-16 -end-16 w-48 h-48 bg-sky-500/30 rounded-full blur-3xl" />
          <div className="absolute -bottom-16 -start-16 w-40 h-40 bg-teal-500/20 rounded-full blur-3xl" />
          <div className="relative">
            <h3 className="text-lg font-semibold mb-1">{t.gettingStarted}</h3>
            <p className="text-sm text-slate-400 mb-5">{t.completeSetup}</p>
            <div className="space-y-3">
              {[
                { label: t.createOrg, done: true },
                { label: t.addFirstDoctor, done: doctors > 0 },
                { label: t.inviteTeam, done: users > 1 },
                { label: t.planVisit, done: false },
              ].map((task, i) => (
                <div key={i} className="flex items-center gap-3">
                  <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] shrink-0 ${
                    task.done ? "bg-teal-500 text-white" : "bg-white/10 text-slate-400 border border-white/10"
                  }`}>
                    {task.done ? "✓" : i + 1}
                  </span>
                  <span className={`text-sm ${task.done ? "text-slate-500 line-through" : "text-white font-medium"}`}>
                    {task.label}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 rounded-2xl bg-white border border-slate-200 p-6">
          <h3 className="text-lg font-semibold text-slate-900 mb-5">{t.quickActions}</h3>
          <div className="grid sm:grid-cols-2 gap-3">
            {[
              { label: t.addDoctor, href: "/admin/doctors", icon: icons.doctors, grad: "from-sky-500 to-cyan-400" },
              { label: t.invite, href: "/admin/users", icon: icons.users, grad: "from-teal-500 to-emerald-400" },
              { label: t.viewReports, href: "/admin/reports", icon: icons.reports, grad: "from-indigo-500 to-violet-400" },
              { label: t.settings, href: "/admin/settings", icon: icons.settings, grad: "from-amber-500 to-orange-400" },
            ].map((a, i) => (
              <Link key={i} href={a.href}
                className="group flex items-center gap-3 p-4 rounded-xl border border-slate-200 hover:border-slate-300 hover:bg-slate-50 transition">
                <span className={`w-10 h-10 rounded-lg bg-gradient-to-br ${a.grad} text-white flex items-center justify-center shadow-sm group-hover:scale-105 transition-transform`}>
                  <Icon d={a.icon} size={18} />
                </span>
                <span className="text-sm font-medium text-slate-700 group-hover:text-slate-900">{a.label}</span>
                <span className="ms-auto text-slate-300 group-hover:text-sky-500 transition rtl:rotate-180">
                  <Icon d={icons.chevron} size={16} />
                </span>
              </Link>
            ))}
          </div>
        </div>

        <div className="rounded-2xl bg-white border border-slate-200 p-6">
          <h3 className="text-lg font-semibold text-slate-900 mb-1">{t.recentActivity}</h3>
          <p className="text-sm text-slate-500 mb-5">{t.thisWeek}</p>
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 mb-3">
              <Icon d={icons.visits} size={22} />
            </div>
            <div className="text-sm font-medium text-slate-700 mb-1">{t.noActivity}</div>
            <div className="text-xs text-slate-500">{t.noActivityHint}</div>
          </div>
        </div>
      </div>
    </div>
  );
}