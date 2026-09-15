"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Visit, getActiveVisit, getVisits } from "@/lib/api";
import { Icon, icons } from "@/components/ui/Icons";

function fmtTime(dt) {
  if (!dt) return "—";
  try {
    return new Date(dt).toLocaleTimeString("ar-EG", { hour: "2-digit", minute: "2-digit" });
  } catch { return "—"; }
}

function fmtDate(dt) {
  if (!dt) return "—";
  try {
    return new Date(dt).toLocaleDateString("ar-EG", { day: "numeric", month: "short" });
  } catch { return "—"; }
}

function isToday(dt) {
  if (!dt) return false;
  try {
    return new Date(dt).toDateString() === new Date().toDateString();
  } catch { return false; }
}

const STATUS_META = {
  PLANNED: { ar: "مخططة", color: "bg-slate-100 text-slate-700 border-slate-200", dot: "bg-slate-400" },
  CHECKED_IN: { ar: "نشطة", color: "bg-amber-100 text-amber-700 border-amber-200", dot: "bg-amber-500" },
  COMPLETED: { ar: "مكتملة", color: "bg-teal-100 text-teal-700 border-teal-200", dot: "bg-teal-500" },
  MISSED: { ar: "فائتة", color: "bg-red-100 text-red-700 border-red-200", dot: "bg-red-500" },
  CANCELLED: { ar: "ملغاة", color: "bg-slate-100 text-slate-500 border-slate-200", dot: "bg-slate-300" },
};

function statusMeta(s) {
  return STATUS_META[s] || STATUS_META.PLANNED;
}

export default function VisitsListPage() {
  const [visits, setVisits] = useState([]);
  const [active, setActive] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("today");

  useEffect(() => {
    (async () => {
      try {
        const [res, act] = await Promise.all([
          getVisits().catch(() => ({ items: [], total: 0 })),
          getActiveVisit().catch(() => null),
        ]);
        setVisits(res.items || []);
        setActive(act);
      } catch {}
      setLoading(false);
    })();
  }, []);

  const filtered = useMemo(() => {
    if (tab === "today") {
      return visits.filter((v) => isToday(v.checked_in_at) || isToday(v.planned_at) || isToday(v.created_at));
    }
    if (tab === "completed") return visits.filter((v) => v.status === "COMPLETED");
    if (tab === "planned") return visits.filter((v) => v.status === "PLANNED");
    return visits;
  }, [visits, tab]);

  const todayCount = visits.filter((v) => isToday(v.checked_in_at) || isToday(v.planned_at)).length;
  const completedCount = visits.filter((v) => v.status === "COMPLETED").length;
  const plannedCount = visits.filter((v) => v.status === "PLANNED").length;

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">زياراتي</h1>
          <p className="text-sm text-slate-600 mt-0.5">
            {loading ? "جاري التحميل..." : visits.length + " زيارة"}
          </p>
        </div>
        <Link
          href="/rep/visits/new"
          className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold transition shadow-sm shrink-0"
        >
          <Icon d={icons.plus} size={14} />
          زيارة جديدة
        </Link>
      </div>

      {active && (
        <Link
          href={"/rep/visits/" + active.id}
          className="block rounded-2xl bg-gradient-to-br from-amber-500 to-orange-500 text-white p-4 shadow-lg shadow-amber-500/20 hover:shadow-amber-500/40 transition"
        >
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-full bg-white/20 flex items-center justify-center shrink-0">
              <span className="w-3 h-3 rounded-full bg-white animate-pulse" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[11px] font-medium text-white/90">زيارة نشطة الآن</div>
              <div className="text-sm font-bold truncate mt-0.5">{active.doctor_name || "زيارة"}</div>
              <div className="text-[11px] text-white/80 mt-0.5">
                بدأت {fmtTime(active.checked_in_at)}
              </div>
            </div>
            <span className="rtl:rotate-180 shrink-0 text-white/80">
              <Icon d={icons.chevron} size={20} />
            </span>
          </div>
        </Link>
      )}

      <div className="flex gap-2">
        {[
          { key: "today", label: "اليوم", count: todayCount },
          { key: "planned", label: "مخططة", count: plannedCount },
          { key: "completed", label: "مكتملة", count: completedCount },
          { key: "all", label: "الكل", count: visits.length },
        ].map((t) => {
          const on = tab === t.key;
          return (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={
                "inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold transition border " +
                (on
                  ? "bg-sky-500 text-white border-sky-500 shadow-sm"
                  : "bg-white text-slate-600 border-slate-200 hover:border-sky-300")
              }
            >
              {t.label}
              <span className={"text-[10px] tabular-nums " + (on ? "text-white/80" : "text-slate-400")}>
                {t.count}
              </span>
            </button>
          );
        })}
      </div>

      {loading ? (
        <div className="space-y-2.5">
          {[1, 2, 3].map((i) => (
            <div key={i} className="rounded-2xl bg-white border border-slate-200 p-4">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-xl bg-slate-100 animate-pulse" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-40 bg-slate-100 rounded animate-pulse" />
                  <div className="h-3 w-24 bg-slate-100 rounded animate-pulse" />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl bg-white border border-slate-200 p-12 text-center">
          <div className="w-14 h-14 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 mx-auto mb-4">
            <Icon d={icons.visits} size={26} />
          </div>
          <div className="text-base font-semibold text-slate-900 mb-1">لا توجد زيارات</div>
          <p className="text-xs text-slate-500 mb-4">ابدأ زيارتك الأولى من هنا</p>
          <Link
            href="/rep/visits/new"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-medium transition"
          >
            <Icon d={icons.plus} size={14} />
            زيارة جديدة
          </Link>
        </div>
      ) : (
        <div className="space-y-2.5">
          {filtered.map((v) => {
            const meta = statusMeta(v.status);
            return (
              <Link
                key={v.id}
                href={"/rep/visits/" + v.id}
                className="group block rounded-2xl bg-white border border-slate-200 p-4 hover:border-sky-300 hover:shadow-lg hover:shadow-sky-500/5 transition-all"
              >
                <div className="flex items-start gap-3.5">
                  <div className={"w-11 h-11 rounded-xl flex items-center justify-center shrink-0 " + meta.color}>
                    <Icon d={icons.visits} size={18} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <h3 className="text-sm font-bold text-slate-900 truncate group-hover:text-sky-700 transition">
                          {v.doctor_name || "زيارة"}
                        </h3>
                        {v.doctor_specialty && (
                          <div className="text-[11px] text-slate-500 mt-0.5">{v.doctor_specialty}</div>
                        )}
                      </div>
                      <span className={"inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border shrink-0 " + meta.color}>
                        <span className={"w-1.5 h-1.5 rounded-full " + meta.dot} />
                        {meta.ar}
                      </span>
                    </div>

                    <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-slate-500">
                      {v.status === "COMPLETED" && v.duration_minutes != null && (
                        <span className="inline-flex items-center gap-1">
                          <Icon d={icons.dashboard} size={11} />
                          {v.duration_minutes} دقيقة
                        </span>
                      )}
                      {v.checked_in_at && (
                        <span className="inline-flex items-center gap-1">
                          <Icon d={icons.visits} size={11} />
                          بدأت {fmtTime(v.checked_in_at)}
                        </span>
                      )}
                      {!v.checked_in_at && v.planned_at && (
                        <span className="inline-flex items-center gap-1">
                          <Icon d={icons.visits} size={11} />
                          مخططة {fmtDate(v.planned_at)} · {fmtTime(v.planned_at)}
                        </span>
                      )}
                      {v.distance_from_doctor != null && v.is_verified && (
                        <span className="inline-flex items-center gap-1 text-teal-600 font-medium">
                          <Icon d={icons.check} size={11} />
                          موثقة GPS
                        </span>
                      )}
                    </div>
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
