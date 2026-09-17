"use client";

import { useEffect, useMemo, useState } from "react";
import { apiFetch } from "@/lib/api";
import { Icon, icons } from "@/components/ui/Icons";
import { downloadCsv, printReport } from "@/lib/export";

type PeriodReport = {
  period: string;
  start_date: string;
  end_date: string;
  total_revenue: number;
  total_cost: number;
  total_profit: number;
  total_sales: number;
  avg_sale_value: number;
  top_reps: Array<{ id: string; name: string; revenue: number; cost: number; profit: number; count: number }>;
  top_products: Array<{ id: string; name: string; quantity: number; revenue: number }>;
  daily_trend: Array<{ date: string; revenue: number; cost: number; count: number }>;
};

function fmtMoney(n: number): string {
  return n.toLocaleString("ar-EG", { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

export default function SalesReportsPage() {
  const [report, setReport] = useState<PeriodReport | null>(null);
  const [period, setPeriod] = useState<"week" | "month">("week");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    apiFetch<PeriodReport>(`/api/sales/reports/period?period=${period}`)
      .then(setReport)
      .catch(() => setReport(null))
      .finally(() => setLoading(false));
  }, [period]);

  const maxRevenue = useMemo(() => {
    if (!report?.daily_trend?.length) return 1;
    return Math.max(...report.daily_trend.map((d) => d.revenue), 1);
  }, [report]);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">تقارير المبيعات</h1>
        <p className="text-sm text-slate-600 dark:text-slate-400 mt-0.5">
          {loading ? "جاري التحميل..." : `${report?.total_sales || 0} مبيعة`}
        </p>
      </div>

      {/* Period toggle */}
      <div className="flex gap-2">
        <button onClick={() => setPeriod("week")}
          className={`flex-1 py-2.5 rounded-xl text-xs font-semibold transition border ${period === "week" ? "bg-sky-500 text-white border-sky-500" : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700"}`}>
          أسبوعي
        </button>
        <button onClick={() => setPeriod("month")}
          className={`flex-1 py-2.5 rounded-xl text-xs font-semibold transition border ${period === "month" ? "bg-sky-500 text-white border-sky-500" : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700"}`}>
          شهري
        </button>
      </div>

      {/* Export buttons */}
      {report && (
        <div className="flex gap-2">
          <button
            onClick={() => {
              if (!report) return;
              const csvData = report.top_reps.map((r) => ({
                "المندوب": r.name,
                "المبيعات": r.count,
                "الإيراد": r.revenue,
                "التكلفة": r.cost,
                "الربح": r.profit,
              }));
              downloadCsv(csvData, `sales-report-${period}-${new Date().toISOString().slice(0, 10)}.csv`);
            }}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 transition"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"/></svg>
            تصدير CSV
          </button>
          <button
            onClick={() => {
              if (!report) return;
              const html = `
                <h1>تقرير المبيعات ${report.period === "أسبوعي" ? "الأسبوعي" : "الشهري"}</h1>
                <div class="subtitle">${new Date(report.start_date).toLocaleDateString("ar-EG")} — ${new Date(report.end_date).toLocaleDateString("ar-EG")}</div>
                <div class="stat-row">
                  <div class="stat"><div class="num">${report.total_revenue.toLocaleString("ar-EG")}</div><div class="label">الإيراد</div></div>
                  <div class="stat"><div class="num">${report.total_profit.toLocaleString("ar-EG")}</div><div class="label">الربح</div></div>
                  <div class="stat"><div class="num">${report.total_sales}</div><div class="label">عدد المبيعات</div></div>
                </div>
                <table>
                  <tr><th>المندوب</th><th>المبيعات</th><th>الإيراد</th><th>الربح</th></tr>
                  ${report.top_reps.map((r) => `<tr><td>${r.name}</td><td>${r.count}</td><td>${r.revenue.toLocaleString("ar-EG")}</td><td>${r.profit.toLocaleString("ar-EG")}</td></tr>`).join("")}
                </table>
                ${report.top_products.length > 0 ? `
                <h2 style="margin-top:30px;font-size:16px;">المنتجات</h2>
                <table>
                  <tr><th>المنتج</th><th>الكمية</th><th>الإيراد</th></tr>
                  ${report.top_products.map((p) => `<tr><td>${p.name}</td><td>${p.quantity}</td><td>${p.revenue.toLocaleString("ar-EG")}</td></tr>`).join("")}
                </table>` : ""}
              `;
              printReport(html, `تقرير المبيعات ${report.period}`);
            }}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 transition"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 9V2h12v7M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>
            طباعة
          </button>
        </div>
      )}

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => <div key={i} className="h-24 bg-slate-100 dark:bg-slate-800 rounded-2xl animate-pulse" />)}
        </div>
      ) : !report ? (
        <div className="rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-12 text-center">
          <div className="text-base font-semibold text-slate-900 dark:text-white mb-1">مفيش بيانات</div>
        </div>
      ) : (
        <>
          {/* Summary cards */}
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-2xl bg-gradient-to-br from-sky-500 to-cyan-500 text-white p-4">
              <div className="text-[11px] font-medium opacity-80">الإيراد</div>
              <div className="text-2xl font-bold mt-1">{fmtMoney(report.total_revenue)}</div>
              <div className="text-[10px] opacity-70 mt-0.5">جنيه</div>
            </div>
            <div className="rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-500 text-white p-4">
              <div className="text-[11px] font-medium opacity-80">الربح</div>
              <div className="text-2xl font-bold mt-1">{fmtMoney(report.total_profit)}</div>
              <div className="text-[10px] opacity-70 mt-0.5">جنيه</div>
            </div>
            <div className="rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-4">
              <div className="text-[11px] text-slate-500 dark:text-slate-400">التكلفة</div>
              <div className="text-xl font-bold text-slate-900 dark:text-white mt-1">{fmtMoney(report.total_cost)}</div>
            </div>
            <div className="rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-4">
              <div className="text-[11px] text-slate-500 dark:text-slate-400">متوسط المبيعة</div>
              <div className="text-xl font-bold text-slate-900 dark:text-white mt-1">{fmtMoney(report.avg_sale_value)}</div>
            </div>
          </div>

          {/* Daily trend chart */}
          {report.daily_trend.length > 0 && (
            <div className="rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-4">
              <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">المبيعات اليومية</h3>
              <div className="flex items-end gap-1 h-32">
                {report.daily_trend.map((d) => (
                  <div key={d.date} className="flex-1 flex flex-col items-center gap-1">
                    <div
                      className="w-full bg-sky-400 dark:bg-sky-500 rounded-t transition-all duration-300 min-h-[2px]"
                      style={{ height: `${(d.revenue / maxRevenue) * 100}%` }}
                    />
                    <span className="text-[8px] text-slate-400 dark:text-slate-500 whitespace-nowrap">
                      {new Date(d.date).toLocaleDateString("ar-EG", { day: "numeric", month: "short" })}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Top reps */}
          {report.top_reps.length > 0 && (
            <div className="rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-4">
              <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">أفضل المناديب</h3>
              <div className="space-y-2">
                {report.top_reps.map((r, i) => (
                  <div key={r.id} className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${i === 0 ? "bg-amber-100 text-amber-700" : i === 1 ? "bg-slate-100 text-slate-600" : "bg-slate-50 text-slate-500"}`}>
                      {i + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-slate-900 dark:text-white truncate">{r.name}</div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400">{r.count} مبيعة</div>
                    </div>
                    <div className="text-sm font-bold text-slate-900 dark:text-white">{fmtMoney(r.revenue)}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Top products */}
          {report.top_products.length > 0 && (
            <div className="rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-4">
              <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">أفضل المنتجات</h3>
              <div className="space-y-2">
                {report.top_products.map((p) => (
                  <div key={p.id} className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-sky-50 dark:bg-sky-900/30 flex items-center justify-center text-sky-600 dark:text-sky-400 shrink-0">
                      <Icon d={icons.cart} size={14} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-slate-900 dark:text-white truncate">{p.name}</div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400">{p.quantity} وحدة</div>
                    </div>
                    <div className="text-sm font-bold text-slate-900 dark:text-white">{fmtMoney(p.revenue)}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
