"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { User, getMyReps, getVisits, Visit } from "@/lib/api";
import { Icon, icons } from "@/components/ui/Icons";

function initials(name: string) {
  const parts = (name || "?").split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

function isToday(dt: string | null | undefined) {
  if (!dt) return false;
  try {
    return new Date(dt).toDateString() === new Date().toDateString();
  } catch {
    return false;
  }
}

export default function AdminMyRepsPage() {
  const [reps, setReps] = useState<User[]>([]);
  const [visits, setVisits] = useState<Visit[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const [r, v] = await Promise.all([
          getMyReps(),
          getVisits().catch(() => ({ items: [], total: 0 })),
        ]);
        setReps(r);
        setVisits(v.items || []);
      } catch (e: any) {
        setError(e.message || "Failed to load");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const repStats = useMemo(() => {
    const map = new Map<
      string,
      { total: number; today: number; completed: number; pending: number; sent: number; forwarded: number }
    >();
    for (const r of reps) {
      map.set(r.id, { total: 0, today: 0, completed: 0, pending: 0, sent: 0, forwarded: 0 });
    }
    for (const v of visits) {
      const s = map.get(v.rep_id);
      if (!s) continue;
      s.total += 1;
      if (isToday(v.checked_in_at || v.created_at)) s.today += 1;
      if (v.status === "COMPLETED") s.completed += 1;
      if (v.status === "CHECKED_IN" || v.status === "PLANNED") s.pending += 1;
      if (v.report_sent_to_admin_at) s.sent += 1;
      if (v.report_forwarded_to_manager_at) s.forwarded += 1;
    }
    return map;
  }, [reps, visits]);

  return (
    <div className="max-w-7xl mx-auto pb-10">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-slate-900 tracking-tight">مندوبيني</h1>
        <p className="mt-1 text-slate-600 text-sm">
          {loading
            ? "جاري التحميل..."
            : `${reps.length} مندوب · ${visits.length} زيارة`}
        </p>
      </div>

      {error && (
        <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700 mb-4">
          {error}
        </div>
      )}

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="rounded-2xl bg-white border border-slate-200 p-5">
              <div className="animate-pulse space-y-3">
                <div className="w-14 h-14 rounded-full bg-slate-100" />
                <div className="h-4 w-40 bg-slate-100 rounded" />
                <div className="h-3 w-32 bg-slate-100 rounded" />
              </div>
            </div>
          ))}
        </div>
      ) : reps.length === 0 ? (
        <div className="rounded-2xl bg-white border border-slate-200 p-12 text-center">
          <div className="w-14 h-14 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 mx-auto mb-4">
            <Icon d={icons.users} size={26} />
          </div>
          <div className="text-base font-semibold text-slate-900 mb-1">
            لا يوجد مندوبين
          </div>
          <p className="text-xs text-slate-500">
            اطلب من المدير يخصصلك مندوبين
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {reps.map((r) => {
            const s = repStats.get(r.id) || {
              total: 0, today: 0, completed: 0, pending: 0, sent: 0, forwarded: 0,
            };
            return (
              <Link
                key={r.id}
                href={`/admin/visits?rep_id=${r.id}`}
                className="group rounded-2xl bg-white border border-slate-200 p-5 hover:border-sky-300 hover:shadow-lg hover:shadow-sky-500/5 transition-all"
              >
                <div className="flex items-start gap-4 mb-4">
                  <div className="relative shrink-0">
                    <div className="w-14 h-14 rounded-full bg-gradient-to-br from-sky-500 to-teal-500 text-white flex items-center justify-center font-bold text-sm shadow-md">
                      {initials(r.full_name)}
                    </div>
                    <span
                      className={`absolute -bottom-0.5 -end-0.5 w-3.5 h-3.5 rounded-full border-2 border-white ${
                        r.is_active ? "bg-teal-500" : "bg-slate-400"
                      }`}
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-base font-bold text-slate-900 truncate group-hover:text-sky-700 transition">
                      {r.full_name}
                    </div>
                    <div className="text-xs text-slate-500 truncate mt-0.5">
                      {r.email}
                    </div>
                    {r.specialties && r.specialties.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {r.specialties.slice(0, 2).map((sp) => (
                          <span
                            key={sp}
                            className="inline-flex px-2 py-0.5 rounded-full text-[10px] font-medium bg-teal-50 text-teal-700 border border-teal-100"
                          >
                            {sp}
                          </span>
                        ))}
                        {r.specialties.length > 2 && (
                          <span className="inline-flex px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-100 text-slate-600">
                            +{r.specialties.length - 2}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Stats grid */}
                <div className="grid grid-cols-3 gap-2 pt-3 border-t border-slate-100">
                  <div className="text-center">
                    <div className="text-lg font-bold text-slate-900 tabular-nums">
                      {s.total}
                    </div>
                    <div className="text-[10px] text-slate-500 mt-0.5">زيارات</div>
                  </div>
                  <div className="text-center">
                    <div className="text-lg font-bold text-sky-600 tabular-nums">
                      {s.today}
                    </div>
                    <div className="text-[10px] text-slate-500 mt-0.5">اليوم</div>
                  </div>
                  <div className="text-center">
                    <div className="text-lg font-bold text-amber-600 tabular-nums">
                      {s.pending}
                    </div>
                    <div className="text-[10px] text-slate-500 mt-0.5">معلقة</div>
                  </div>
                </div>

                {s.sent > 0 && (
                  <div className="mt-3 pt-3 border-t border-slate-100 flex items-center gap-2">
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-teal-50 text-teal-700 border border-teal-100">
                      <Icon d={icons.check} size={10} />
                      {s.sent} تقرير مستلم
                    </span>
                    {s.forwarded > 0 && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-indigo-50 text-indigo-700 border border-indigo-100">
                        <Icon d={icons.check} size={10} />
                        {s.forwarded} مُحوَّل
                      </span>
                    )}
                  </div>
                )}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}