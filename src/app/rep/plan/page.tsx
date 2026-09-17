"use client";

import { useEffect, useState } from "react";
import { Icon, icons } from "@/components/ui/Icons";
import { getPlanToday, PlanItem, buildMapsUrl, doctorDisplayName } from "@/lib/api";

function fmtDate(dt: string | null | undefined) {
  if (!dt) return "لم يُزَر";
  try {
    return new Date(dt).toLocaleDateString("ar-EG", { day: "numeric", month: "short" });
  } catch {
    return "—";
  }
}

const PRIORITY_COLORS: Record<string, string> = {
  A: "bg-red-100 text-red-700 border-red-200",
  HIGH: "bg-red-100 text-red-700 border-red-200",
  URGENT: "bg-red-100 text-red-700 border-red-200",
  B: "bg-amber-100 text-amber-700 border-amber-200",
  MEDIUM: "bg-amber-100 text-amber-700 border-amber-200",
  C: "bg-green-100 text-green-700 border-green-200",
  LOW: "bg-green-100 text-green-700 border-green-200",
};

export default function RepPlanPage() {
  const [items, setItems] = useState<PlanItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [limit, setLimit] = useState(10);
  const [generatedAt, setGeneratedAt] = useState("");

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const res = await getPlanToday({ limit });
      setItems(res.items || []);
      setGeneratedAt(res.generated_at);
    } catch (e: any) {
      setError(e?.message || "خطأ في تحميل الخطة");
    }
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, [limit]);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-800">خطتي اليومية</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            الدctors المراد زيارتهم اليوم مرتبين بالأولوية
          </p>
        </div>
        <button
          onClick={load}
          disabled={loading}
          className="px-3 py-1.5 text-xs font-medium bg-sky-50 text-sky-600 rounded-lg border border-sky-200 hover:bg-sky-100 transition disabled:opacity-50"
        >
          {loading ? "جاري التحميل..." : "تحديث"}
        </button>
      </div>

      {/* Limit selector */}
      <div className="flex items-center gap-2">
        <span className="text-xs text-slate-500">عدد الدكاترة:</span>
        {[5, 10, 15, 20].map((n) => (
          <button
            key={n}
            onClick={() => setLimit(n)}
            className={`px-2.5 py-1 text-xs rounded-lg border transition ${
              limit === n
                ? "bg-sky-500 text-white border-sky-500"
                : "bg-white text-slate-600 border-slate-200 hover:border-sky-300"
            }`}
          >
            {n}
          </button>
        ))}
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <div className="w-6 h-6 border-2 border-slate-300 border-t-sky-500 rounded-full animate-spin" />
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-center">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      {/* Empty */}
      {!loading && !error && items.length === 0 && (
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-8 text-center">
          <Icon d={icons.calendar} size={40} className="mx-auto text-slate-300 mb-3" />
          <p className="text-sm text-slate-500">مفيش دctors مخططين النهاردة</p>
        </div>
      )}

      {/* Plan items */}
      {!loading && !error && items.length > 0 && (
        <div className="space-y-3">
          {items.map((item, idx) => {
            const priorityKey = (item.priority || "").toUpperCase();
            const priorityColor = PRIORITY_COLORS[priorityKey] || "bg-slate-100 text-slate-600 border-slate-200";

            return (
              <div
                key={item.doctor_id}
                className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow"
              >
                {/* Top row: rank + name + priority */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-sky-400 to-teal-400 flex items-center justify-center text-white text-sm font-bold shrink-0">
                      {idx + 1}
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-slate-800">{item.doctor_name}</h3>
                      {item.specialty && (
                        <p className="text-xs text-slate-500">{item.specialty}</p>
                      )}
                    </div>
                  </div>
                  <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full border ${priorityColor}`}>
                    {item.priority || "—"}
                  </span>
                </div>

                {/* Details */}
                <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                  {item.area && (
                    <div className="flex items-center gap-1.5 text-slate-500">
                      <Icon d={icons.pin} size={12} />
                      <span>{item.area}</span>
                    </div>
                  )}
                  {item.phone && (
                    <div className="flex items-center gap-1.5 text-slate-500">
                      <Icon d={icons.phone} size={12} />
                      <span>{item.phone}</span>
                    </div>
                  )}
                  {item.days_since_visit != null && (
                    <div className="flex items-center gap-1.5 text-slate-500">
                      <Icon d={icons.visits} size={12} />
                      <span>آخر زيارة: {fmtDate(item.last_visit_at)}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-1.5 text-slate-500">
                    <Icon d={icons.target} size={12} />
                    <span>النقاط: {item.score}</span>
                  </div>
                </div>

                {/* Reason */}
                <div className="mt-2 px-2.5 py-1.5 bg-sky-50 rounded-lg border border-sky-100">
                  <p className="text-xs text-sky-700 font-medium">{item.reason}</p>
                </div>

                {/* Actions */}
                <div className="mt-3 flex items-center gap-2">
                  {item.latitude && item.longitude && (
                    <a
                      href={`https://www.google.com/maps/dir/?api=1&destination=${item.latitude},${item.longitude}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-teal-50 text-teal-600 rounded-lg border border-teal-200 hover:bg-teal-100 transition"
                    >
                      <Icon d={icons.navigation} size={12} />
                      <span>اتجاه</span>
                    </a>
                  )}
                  {item.phone && (
                    <a
                      href={`tel:${item.phone}`}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-sky-50 text-sky-600 rounded-lg border border-sky-200 hover:bg-sky-100 transition"
                    >
                      <Icon d={icons.phone} size={12} />
                      <span>اتصال</span>
                    </a>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Generated at */}
      {generatedAt && !loading && (
        <p className="text-center text-[10px] text-slate-400 mt-4">
          تم التحديث: {new Date(generatedAt).toLocaleString("ar-EG")}
        </p>
      )}
    </div>
  );
}
