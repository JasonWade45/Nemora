"use client";

import { useEffect, useMemo, useState } from "react";
import { apiFetch } from "@/lib/api";

type AdvancedAnalytics = {
  total_visits: number;
  completed: number;
  missed: number;
  conversion_rate: number;
  avg_duration_minutes: number;
  response_breakdown: Record<string, number>;
  peak_hours: Array<{ hour: number; count: number }>;
  rep_comparison: Array<{
    id: string;
    name: string;
    total_visits: number;
    completed: number;
    missed: number;
    conversion_rate: number;
    avg_duration: number;
  }>;
  day_of_week_distribution: Array<{ day: string; count: number }>;
};

const RESPONSE_LABELS: Record<string, string> = {
  VERY_INTERESTED: "مهتم جداً",
  INTERESTED: "مهتم",
  NEUTRAL: "محايد",
  NOT_INTERESTED: "غير مهتم",
  "لم يتم التقييم": "لم يتم التقييم",
};

export default function AdvancedAnalyticsPage() {
  const [data, setData] = useState<AdvancedAnalytics | null>(null);
  const [days, setDays] = useState(30);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    apiFetch<AdvancedAnalytics>(`/api/analytics/advanced?days=${days}`)
      .then(setData)
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, [days]);

  const maxDayCount = useMemo(() => {
    if (!data?.day_of_week_distribution) return 1;
    return Math.max(...data.day_of_week_distribution.map((d) => d.count), 1);
  }, [data]);

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-40 bg-slate-100 rounded animate-pulse" />
        {[1, 2, 3].map((i) => <div key={i} className="h-48 bg-slate-100 dark:bg-slate-800 rounded-2xl animate-pulse" />)}
      </div>
    );
  }

  if (!data) {
    return <div className="text-center py-12 text-sm text-slate-400">مفيش بيانات</div>;
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">تحليلات متقدمة</h1>
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-0.5">تحليل معمق لأداء الفريق</p>
        </div>
        <select
          value={days}
          onChange={(e) => setDays(Number(e.target.value))}
          className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-medium bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200"
        >
          <option value={7}>7 أيام</option>
          <option value={30}>30 يوم</option>
          <option value={90}>90 يوم</option>
        </select>
      </div>

      {/* Summary row */}
      <div className="grid grid-cols-4 gap-3">
        <div className="rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-4 text-center">
          <div className="text-2xl font-black text-slate-900 dark:text-white">{data.total_visits}</div>
          <div className="text-[10px] text-slate-500">إجمالي الزيارات</div>
        </div>
        <div className="rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-4 text-center">
          <div className="text-2xl font-black text-emerald-600">{data.conversion_rate}%</div>
          <div className="text-[10px] text-slate-500">نسبة التحويل</div>
        </div>
        <div className="rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-4 text-center">
          <div className="text-2xl font-black text-sky-600">{data.avg_duration_minutes}</div>
          <div className="text-[10px] text-slate-500">متوسط الدقائق</div>
        </div>
        <div className="rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-4 text-center">
          <div className="text-2xl font-black text-red-600">{data.missed}</div>
          <div className="text-[10px] text-slate-500">زيارات فائتة</div>
        </div>
      </div>

      {/* Response breakdown */}
      {Object.keys(data.response_breakdown).length > 0 && (
        <div className="rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-4">
          <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">توزيع ردود الأطباء</h3>
          <div className="space-y-2">
            {Object.entries(data.response_breakdown).sort((a, b) => b[1] - a[1]).map(([key, count]) => {
              const pct = (count / data.completed) * 100;
              return (
                <div key={key}>
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="text-slate-600 dark:text-slate-400">{RESPONSE_LABELS[key] || key}</span>
                    <span className="text-slate-500">{count} ({Math.round(pct)}%)</span>
                  </div>
                  <div className="h-2 rounded-full bg-slate-100 dark:bg-slate-700 overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-sky-500 to-teal-500 rounded-full" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Peak hours */}
      {data.peak_hours.length > 0 && (
        <div className="rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-4">
          <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">أكثر الساعات نشاطاً</h3>
          <div className="flex items-end gap-2 h-24">
            {data.peak_hours.map((h) => (
              <div key={h.hour} className="flex-1 flex flex-col items-center gap-1">
                <div className="w-full bg-amber-400 dark:bg-amber-500 rounded-t" style={{ height: `${(h.count / data.peak_hours[0].count) * 100}%`, minHeight: 4 }} />
                <span className="text-[9px] text-slate-400">{h.hour}:00</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Day of week */}
      <div className="rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-4">
        <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">التوزيع الأسبوعي</h3>
        <div className="flex items-end gap-1.5 h-28">
          {data.day_of_week_distribution.map((d) => (
            <div key={d.day} className="flex-1 flex flex-col items-center gap-1">
              <div className="w-full bg-gradient-to-t from-violet-500 to-purple-400 rounded-t transition-all" style={{ height: `${(d.count / maxDayCount) * 100}%`, minHeight: 2 }} />
              <span className="text-[8px] text-slate-400 whitespace-nowrap">{d.day}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Rep comparison */}
      {data.rep_comparison.length > 0 && (
        <div className="rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-4">
          <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">مقارنة أداء المناديب</h3>
          <div className="space-y-3">
            {data.rep_comparison.map((r, i) => (
              <div key={r.id} className="flex items-center gap-3">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${i === 0 ? "bg-amber-100 text-amber-700" : "bg-slate-100 dark:bg-slate-700 text-slate-500"}`}>
                  {i + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-slate-900 dark:text-white truncate">{r.name}</span>
                    <span className="text-xs font-bold text-sky-600">{r.conversion_rate}%</span>
                  </div>
                  <div className="flex items-center gap-3 mt-0.5">
                    <span className="text-[10px] text-slate-500">{r.total_visits} زيارة</span>
                    <span className="text-[10px] text-emerald-600">{r.completed} مكتملة</span>
                    <span className="text-[10px] text-red-500">{r.missed} فائتة</span>
                    <span className="text-[10px] text-slate-400">~{r.avg_duration} دقيقة</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-slate-100 dark:bg-slate-700 mt-1.5 overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-sky-500 to-emerald-500 rounded-full" style={{ width: `${r.conversion_rate}%` }} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
