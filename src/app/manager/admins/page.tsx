"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { User, getAllUsers, getVisits, Visit } from "@/lib/api";
import { Icon, icons } from "@/components/ui/Icons";

function initials(name: string) {
  const parts = (name || "?").split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

export default function ManagerAdminsPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [visits, setVisits] = useState<Visit[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const [u, v] = await Promise.all([
          getAllUsers(),
          getVisits().catch(() => ({ items: [], total: 0 })),
        ]);
        setUsers(u);
        setVisits(v.items || []);
      } catch (e: any) {
        setError(e.message || "Failed to load");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const admins = useMemo(() => users.filter((u) => u.role === "ADMIN"), [users]);

  const adminStats = useMemo(() => {
    const map = new Map<string, { reps: number; visits: number }>();
    for (const a of admins) {
      const reps = users.filter((u) => u.supervisor_id === a.id && u.role === "MEDICAL_REP").length;
      const aVisits = visits.filter((v) => {
        const rep = users.find((u) => u.id === v.rep_id);
        return rep && rep.supervisor_id === a.id;
      }).length;
      map.set(a.id, { reps, visits: aVisits });
    }
    return map;
  }, [admins, users, visits]);

  return (
    <div className="max-w-7xl mx-auto pb-10">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight">المشرفين</h1>
        <p className="mt-1 text-slate-600 dark:text-slate-400 text-sm">
          {loading ? "..." : `${admins.length} مشرف في المنصة`}
        </p>
      </div>

      {error && (
        <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700 mb-4">{error}</div>
      )}

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-40 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 animate-pulse" />
          ))}
        </div>
      ) : admins.length === 0 ? (
        <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-12 text-center">
          <div className="w-14 h-14 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400 mx-auto mb-4">
            <Icon d={icons.users} size={26} />
          </div>
          <div className="text-base font-semibold text-slate-900 dark:text-white mb-1">لا يوجد مشرفين</div>
          <p className="text-xs text-slate-500">أضف مشرفين من صفحة الفريق</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {admins.map((a) => {
            const s = adminStats.get(a.id) || { reps: 0, visits: 0 };
            return (
              <Link
                key={a.id}
                href={`/manager/team?admin_id=${a.id}`}
                className="group rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 hover:border-sky-300 hover:shadow-lg hover:shadow-sky-500/5 hover:-translate-y-0.5 transition-all"
              >
                <div className="flex items-start gap-4 mb-4">
                  <div className="relative shrink-0">
                    <div className="w-14 h-14 rounded-full bg-gradient-to-br from-violet-500 to-purple-500 text-white flex items-center justify-center font-bold text-sm shadow-md">
                      {initials(a.full_name)}
                    </div>
                    <span className={`absolute -bottom-0.5 -end-0.5 w-3.5 h-3.5 rounded-full border-2 border-white dark:border-slate-900 ${a.is_active ? "bg-teal-500" : "bg-slate-400"}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-base font-bold text-slate-900 dark:text-white truncate group-hover:text-sky-700 transition">
                      {a.full_name}
                    </div>
                    <div className="text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5">{a.email}</div>
                    <span className="inline-flex mt-2 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-violet-50 text-violet-700 border border-violet-100">
                      مشرف
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                  <div className="text-center">
                    <div className="text-lg font-bold text-slate-900 dark:text-white tabular-nums">{s.reps}</div>
                    <div className="text-[10px] text-slate-500 mt-0.5">مندوبين</div>
                  </div>
                  <div className="text-center">
                    <div className="text-lg font-bold text-sky-600 tabular-nums">{s.visits}</div>
                    <div className="text-[10px] text-slate-500 mt-0.5">زيارات</div>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}