"use client";

import { useEffect, useMemo, useState } from "react";
import {
  SalesAnalytics,
  getSalesAnalytics,
  getSales,
  Sale,
} from "@/lib/api";
import { Icon, icons } from "@/components/ui/Icons";

const DAYS_OPTIONS = [
  { value: 7, label: "آخر 7 أيام" },
  { value: 30, label: "آخر 30 يوم" },
  { value: 90, label: "آخر 90 يوم" },
  { value: 365, label: "كل الوقت" },
];

function fmtMoney(v: number) {
  return v.toLocaleString("ar-EG", { maximumFractionDigits: 0 }) + " ج";
}

function fmtDate(dt: string) {
  try {
    return new Date(dt).toLocaleDateString("ar-EG", { day: "numeric", month: "short" });
  } catch {
    return "";
  }
}

function MetricCard({
  label,
  value,
  hint,
  accent,
  icon,
}: {
  label: string;
  value: string;
  hint?: string;
  accent: "teal" | "sky" | "amber" | "rose";
  icon: string;
}) {
  const colors: Record<string, { grad: string }> = {
    teal: { grad: "from-teal-500 to-emerald-500" },
    sky: { grad: "from-sky-500 to-cyan-500" },
    amber: { grad: "from-amber-500 to-orange-500" },
    rose: { grad: "from-rose-500 to-red-500" },
  };
  const c = colors[accent];

  return (
    <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 relative overflow-hidden">
      <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${c.grad} text-white flex items-center justify-center mb-3`}>
        <Icon d={icon} size={20} />
      </div>
      <div className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">{label}</div>
      <div className="text-2xl font-bold text-slate-900 dark:text-white tabular-nums">{value}</div>
      {hint && <div className="text-[10px] text-slate-400 mt-1">{hint}</div>}
    </div>
  );
}

function RevenueChart({ trend }: { trend: Array<{ date: string; revenue: number; profit: number }> }) {
  const max = Math.max(...trend.map((d) => d.revenue), 1);
  const last14 = trend.slice(-14);

  return (
    <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h3 className="text-sm font-semibold text-slate-800 dark:text-white">الإيرادات اليومية</h3>
          <p className="text-xs text-slate-500 mt-0.5">آخر 14 يوم</p>
        </div>
        <div className="flex items-center gap-3 text-xs">
          <span className="inline-flex items-center gap-1.5 text-slate-500">
            <span className="w-2 h-2 rounded-full bg-teal-500" />
            إيراد
          </span>
          <span className="inline-flex items-center gap-1.5 text-slate-500">
            <span className="w-2 h-2 rounded-full bg-sky-500" />
            ربح
          </span>
        </div>
      </div>
      <div className="h-40 flex items-end gap-1.5">
        {last14.map((d, i) => {
          const hRev = (d.revenue / max) * 100;
          const hProfit = (d.profit / max) * 100;
          const day = new Date(d.date).getDate();
          return (
            <div key={i} className="flex-1 flex flex-col items-center gap-1 group" title={`${d.date}: ${fmtMoney(d.revenue)}`}>
              <div className="w-full flex items-end justify-center gap-0.5" style={{ height: "100%" }}>
                <div
                  className="w-1/2 rounded-t bg-gradient-to-t from-teal-500 to-emerald-400 transition-all duration-500"
                  style={{ height: `${Math.max(hRev, 2)}%`, minHeight: "2px" }}
                />
                <div
                  className="w-1/2 rounded-t bg-gradient-to-t from-sky-500 to-cyan-400 transition-all duration-500"
                  style={{ height: `${Math.max(hProfit, 2)}%`, minHeight: "2px" }}
                />
              </div>
              <span className="text-[9px] text-slate-400">{day}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function TopList({
  title,
  items,
  emptyText,
  formatValue,
}: {
  title: string;
  items: Array<{ id: string; name: string; subtitle?: string | null; value: number }>;
  emptyText: string;
  formatValue: (v: number) => string;
}) {
  return (
    <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5">
      <h3 className="text-sm font-semibold text-slate-800 dark:text-white mb-4">{title}</h3>
      {items.length === 0 ? (
        <div className="text-xs text-slate-400 text-center py-6">{emptyText}</div>
      ) : (
        <div className="space-y-3">
          {items.map((item, i) => (
            <div key={item.id} className="flex items-center gap-3">
              <span className="w-6 h-6 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 flex items-center justify-center text-[10px] font-bold shrink-0">
                {i + 1}
              </span>
              <div className="flex-1 min-w-0">
                <div className="text-xs font-semibold text-slate-900 dark:text-white truncate">{item.name}</div>
                {item.subtitle && <div className="text-[10px] text-slate-500 truncate">{item.subtitle}</div>}
              </div>
              <span className="text-xs font-bold text-teal-600 tabular-nums shrink-0">
                {formatValue(item.value)}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function RecentSalesList({ sales }: { sales: Sale[] }) {
  if (sales.length === 0) {
    return (
      <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 text-center text-xs text-slate-400">
        لا توجد مبيعات في الفترة المحددة
      </div>
    );
  }

  return (
    <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 overflow-hidden">
      <div className="px-5 py-3 border-b border-slate-100 dark:border-slate-800">
        <h3 className="text-sm font-semibold text-slate-800 dark:text-white">آخر المبيعات</h3>
      </div>
      <div className="divide-y divide-slate-100 dark:divide-slate-800">
        {sales.slice(0, 10).map((s) => (
          <div key={s.id} className="flex items-center gap-3 p-4 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-teal-500 to-emerald-500 text-white flex items-center justify-center font-bold text-xs shrink-0">
              {s.doctor_name?.slice(0, 1) || "?"}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-xs font-bold text-slate-900 dark:text-white truncate">{s.doctor_name}</div>
              <div className="text-[11px] text-slate-500 truncate">
                {s.product_name} × {s.quantity} · {s.rep_name}
              </div>
              <div className="text-[10px] text-slate-400 mt-0.5">{fmtDate(s.sold_at)}</div>
            </div>
            <div className="text-end shrink-0">
              <div className="text-sm font-bold text-teal-600 tabular-nums">{fmtMoney(s.total_price)}</div>
              {s.profit > 0 && (
                <div className="text-[10px] text-slate-500">ربح: {fmtMoney(s.profit)}</div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function SalesDashboard({ title, subtitle }: { title: string; subtitle: string }) {
  const [days, setDays] = useState(30);
  const [analytics, setAnalytics] = useState<SalesAnalytics | null>(null);
  const [recent, setRecent] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    try {
      const [a, r] = await Promise.all([
        getSalesAnalytics({ days }).catch(() => null),
        getSales({ days }).catch(() => ({ items: [], total: 0, total_revenue: 0, total_cost: 0, total_profit: 0 })),
      ]);
      setAnalytics(a);
      setRecent(r.items || []);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, [days]);

  const topProducts = useMemo(
    () => (analytics?.top_products || []).map((p) => ({
      id: p.id,
      name: p.name,
      subtitle: p.category ? `${p.category} · ${p.quantity} وحدة` : `${p.quantity} وحدة`,
      value: p.revenue,
    })),
    [analytics]
  );

  const topReps = useMemo(
    () => (analytics?.top_reps || []).map((r) => ({
      id: r.id,
      name: r.name,
      subtitle: `${r.sales_count} عملية بيع`,
      value: r.revenue,
    })),
    [analytics]
  );

  const topDoctors = useMemo(
    () => (analytics?.top_doctors || []).map((d) => ({
      id: d.id,
      name: d.name,
      subtitle: d.specialty ? `${d.specialty}${d.area ? ` · ${d.area}` : ""}` : null,
      value: d.revenue,
    })),
    [analytics]
  );

  return (
    <div className="max-w-7xl mx-auto pb-10 space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight">{title}</h1>
          <p className="mt-1 text-slate-600 dark:text-slate-400 text-sm">{subtitle}</p>
        </div>
        <div className="inline-flex bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-1">
          {DAYS_OPTIONS.map((o) => (
            <button
              key={o.value}
              onClick={() => setDays(o.value)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                days === o.value
                  ? "bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-sm"
                  : "text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800"
              }`}
            >
              {o.label}
            </button>
          ))}
        </div>
      </div>

      {/* Metrics */}
      {loading ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-32 rounded-2xl bg-slate-100 dark:bg-slate-800 animate-pulse" />
          ))}
        </div>
      ) : analytics ? (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <MetricCard
              label="إجمالي الإيرادات"
              value={fmtMoney(analytics.total_revenue)}
              hint={`${analytics.total_sales} عملية بيع`}
              accent="teal"
              icon={icons.visits}
            />
            <MetricCard
              label="إجمالي الأرباح"
              value={fmtMoney(analytics.total_profit)}
              hint={analytics.total_revenue > 0
                ? `هامش ${Math.round((analytics.total_profit / analytics.total_revenue) * 100)}%`
                : "—"}
              accent="sky"
              icon={icons.target}
            />
            <MetricCard
              label="تكلفة المبيعات"
              value={fmtMoney(analytics.total_cost)}
              accent="amber"
              icon={icons.doctors}
            />
            <MetricCard
              label="متوسط البيع"
              value={fmtMoney(analytics.avg_sale_value)}
              accent="rose"
              icon={icons.check}
            />
          </div>

          {/* Revenue Trend */}
          <RevenueChart trend={analytics.revenue_trend} />

          {/* Top Lists */}
          <div className="grid md:grid-cols-3 gap-4">
            <TopList
              title="أفضل المنتجات"
              items={topProducts}
              emptyText="لا توجد مبيعات"
              formatValue={fmtMoney}
            />
            <TopList
              title="أفضل المندوبين"
              items={topReps}
              emptyText="لا توجد مبيعات"
              formatValue={fmtMoney}
            />
            <TopList
              title="أفضل الأطباء"
              items={topDoctors}
              emptyText="لا توجد مبيعات"
              formatValue={fmtMoney}
            />
          </div>

          {/* Recent Sales */}
          <RecentSalesList sales={recent} />
        </>
      ) : (
        <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-12 text-center text-sm text-slate-500">
          فشل تحميل البيانات
        </div>
      )}
    </div>
  );
}