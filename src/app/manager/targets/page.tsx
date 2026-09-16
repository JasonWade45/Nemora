"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { User, Visit, getAllUsers, getVisits } from "@/lib/api";
import { Icon, icons } from "@/components/ui/Icons";

function initials(name: string) {
  const parts = (name || "?").split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

function isThisMonth(dt: string | null | undefined) {
  if (!dt) return false;
  try {
    const d = new Date(dt);
    const now = new Date();
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  } catch { return false; }
}

export default function ManagerTargetsPage() {
  const [reps, setReps] = useState<User[]>([]);
  const [visits, setVisits] = useState<Visit[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const [u, v] = await Promise.all([
          getAllUsers(),
          getVisits().catch(() => ({ items: [], total: 0 })),
        ]);
        setReps(u.filter((x) => x.role === "MEDICAL_REP" && x.is_active));
        setVisits(v.items || []);
      } catch {}
      setLoading(false);
    })();
  }, []);

  const repStats = useMemo(() => {
    const map = new Map<string, { completed: number; monthVisits: number; target: number }>();
    for (const r of reps) {
      const rVisits = visits.filter((v) => v.rep_id === r.id);
      const completed = rVisits.filter((v) => v.status === "COMPLETED").length;
      const month = rVisits.filter((v) => isThisMonth(v.checked_in_at || v.created_at)).length;
      map.set(r.id, { completed, monthVisits: month, target: 40 });
    }
    return map;
  }, [reps, visits]);

  return (
    <div className="max-w-7xl mx-auto pb-10 space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight">الأهداف</h1>
        <p className="mt-1 text-slate-600 dark:text-slate-400 text-sm">
          متابعة أهداف المندوبين (الهدف الافتراضي: 40 زيارة شهرياً)
        </p>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-48 bg-slate-100 dark:bg-slate-800 rounded-2xl animate-pulse" />
          ))}
        </div>
      ) : reps.length === 0 ? (
        <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-12 text-center">
          <div className="w-14 h-14 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400 mx-auto mb-4">
            <Icon d={icons.target} size={26} />
          </div>
          <div className="text-base font-semibold text-slate-900 dark:text-white mb-1">لا يوجد مندوبين</div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {reps.map((r) => {
            const s = repStats.get(r.id) || { completed: 0, monthVisits: 0, target: 40 };
            const pct = Math.min(Math.round((s.monthVisits / s.target) * 100), 100);
            const color = pct >= 90 ? "from-teal-500 to-emerald-400" : pct >= 60 ? "from-sky-500 to-cyan-400" : pct >= 30 ? "from-amber-500 to-orange-400" : "from-rose-500 to-red-400";
            return (
              <Link
                key={r.id}
                href={`/manager/visits?rep_id=${r.id}`}
                className="group rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 hover:border-sky-300 hover:shadow-lg transition"
              >
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-sky-500 to-teal-500 text-white flex items-center justify-center font-bold text-sm shrink-0">
                    {initials(r.full_name)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-bold text-slate-900 dark:text-white truncate">{r.full_name}</div>
                    <div className="text-[11px] text-slate-500 truncate">{r.email}</div>
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs mb-2">
                  <span className="text-slate-500">هذا الشهر</span>
                  <span className="tabular-nums font-semibold">
                    <span className="text-slate-900 dark:text-white">{s.monthVisits}</span>
                    <span className="text-slate-400"> / {s.target}</span>
                  </span>
                </div>
                <div className="h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden mb-3">
                  <div className={`h-full bg-gradient-to-r ${color} rounded-full transition-all duration-500`} style={{ width: `${pct}%` }} />
                </div>

                <div className="flex items-center justify-between text-[11px]">
                  <span className={`font-bold ${pct >= 60 ? "text-teal-600" : pct >= 30 ? "text-amber-600" : "text-rose-600"}`}>
                    {pct}%
                  </span>
                  <span className="text-slate-500">مكتملة: {s.completed}</span>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}