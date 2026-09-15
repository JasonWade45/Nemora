"use client";

import { useEffect, useMemo, useState } from "react";
import {
  AnalyticsDetailsItem,
  AnalyticsFilters,
  AnalyticsOverview,
  getAnalyticsDetails,
  getAnalyticsFilters,
  getAnalyticsOverview,
} from "@/lib/api";
import { Icon, icons } from "@/components/ui/Icons";

const DAYS_OPTIONS = [
  { value: 7, label: "آخر 7 أيام" },
  { value: 30, label: "آخر 30 يوم" },
  { value: 90, label: "آخر 90 يوم" },
  { value: 365, label: "كل الوقت" },
];

const RESPONSE_LABELS: Record<string, string> = {
  VERY_INTERESTED: "مهتم جداً",
  INTERESTED: "مهتم",
  NEUTRAL: "محايد",
  NOT_INTERESTED: "غير مهتم",
};

function fmtDate(dt: string | null | undefined): string {
  if (!dt) return "—";
  try {
    return new Date(dt).toLocaleDateString("ar-EG", {
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "—";
  }
}

function StatCard({
  label,
  value,
  suffix,
  icon,
  accent,
  onClick,
}: {
  label: string;
  value: number | string;
  suffix?: string;
  icon: string;
  accent: "sky" | "teal" | "amber" | "indigo" | "rose";
  onClick?: () => void;
}) {
  const colors: Record<string, { bg: string; fg: string }> = {
    sky: { bg: "bg-sky-50", fg: "text-sky-600" },
    teal: { bg: "bg-teal-50", fg: "text-teal-600" },
    amber: { bg: "bg-amber-50", fg: "text-amber-600" },
    indigo: { bg: "bg-indigo-50", fg: "text-indigo-600" },
    rose: { bg: "bg-rose-50", fg: "text-rose-600" },
  };
  const c = colors[accent];

  return (
    <button
      onClick={onClick}
      disabled={!onClick}
      className={`text-start rounded-2xl bg-white border border-slate-200 p-5 transition-all ${
        onClick
          ? "hover:border-sky-300 hover:shadow-lg hover:shadow-sky-500/5 hover:-translate-y-0.5 cursor-pointer"
          : ""
      }`}
    >
      <div className={`w-10 h-10 rounded-xl ${c.bg} ${c.fg} flex items-center justify-center mb-3`}>
        <Icon d={icon} size={20} />
      </div>
      <div className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">
        {label}
      </div>
      <div className="text-3xl font-bold text-slate-900 tabular-nums">
        {value}
        {suffix && <span className="text-base text-slate-500 ms-1">{suffix}</span>}
      </div>
      {onClick && (
        <div className="mt-2 text-[10px] font-medium text-sky-600 flex items-center gap-1">
          عرض التفاصيل
          <span className="rtl:rotate-180">
            <Icon d={icons.chevron} size={10} />
          </span>
        </div>
      )}
    </button>
  );
}

function BarsList({
  title,
  items,
  emptyText,
  colorClass = "from-sky-500 to-teal-500",
}: {
  title: string;
  items: { label: string; count: number }[];
  emptyText: string;
  colorClass?: string;
}) {
  const max = Math.max(...items.map((i) => i.count), 1);

  return (
    <div className="rounded-2xl bg-white border border-slate-200 p-5">
      <h3 className="text-sm font-semibold text-slate-800 mb-4">{title}</h3>
      {items.length === 0 ? (
        <div className="text-xs text-slate-400 text-center py-6">{emptyText}</div>
      ) : (
        <div className="space-y-3">
          {items.map((item, idx) => {
            const pct = (item.count / max) * 100;
            return (
              <div key={idx}>
                <div className="flex items-center justify-between text-xs mb-1.5">
                  <span className="font-medium text-slate-700 truncate">
                    {item.label}
                  </span>
                  <span className="text-slate-500 tabular-nums shrink-0">
                    {item.count}
                  </span>
                </div>
                <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
                  <div
                    className={`h-full bg-gradient-to-r ${colorClass} rounded-full transition-all duration-500`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function TrendChart({ data }: { data: Array<{ date: string; count: number }> }) {
  const max = Math.max(...data.map((d) => d.count), 1);
  const last14 = data.slice(-14);

  return (
    <div className="rounded-2xl bg-white border border-slate-200 p-5">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h3 className="text-sm font-semibold text-slate-800">النشاط اليومي</h3>
          <p className="text-xs text-slate-500 mt-0.5">آخر 14 يوم</p>
        </div>
        <span className="inline-flex items-center gap-1.5 text-xs text-slate-500">
          <span className="w-2 h-2 rounded-full bg-sky-500" />
          زيارات
        </span>
      </div>
      <div className="h-40 flex items-end gap-1.5">
        {last14.map((d, i) => {
          const h = (d.count / max) * 100;
          const day = new Date(d.date).getDate();
          return (
            <div key={i} className="flex-1 flex flex-col items-center gap-1.5 group" title={`${d.date}: ${d.count}`}>
              <div className="text-[9px] text-slate-400 font-medium opacity-0 group-hover:opacity-100 transition tabular-nums">
                {d.count || ""}
              </div>
              <div
                className={`w-full rounded-t-md transition-all duration-500 ${
                  d.count > 0 ? "bg-gradient-to-t from-sky-500 to-teal-400" : "bg-slate-100"
                }`}
                style={{ height: `${Math.max(h, 3)}%`, minHeight: "3px" }}
              />
              <span className="text-[9px] text-slate-400">{day}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function FilterChips({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: { value: string; label: string }[];
  value: string | null;
  onChange: (v: string | null) => void;
}) {
  if (options.length === 0) return null;
  return (
    <div className="rounded-2xl bg-white border border-slate-200 p-4">
      <div className="text-[11px] font-semibold text-slate-500 mb-2">{label}</div>
      <div className="flex flex-wrap gap-1.5">
        <button
          onClick={() => onChange(null)}
          className={`inline-flex items-center px-3 py-1.5 rounded-full text-xs font-medium transition border ${
            value === null
              ? "bg-slate-900 text-white border-slate-900"
              : "bg-white text-slate-600 border-slate-200 hover:border-slate-300"
          }`}
        >
          الكل
        </button>
        {options.map((o) => {
          const active = value === o.value;
          return (
            <button
              key={o.value}
              onClick={() => onChange(active ? null : o.value)}
              className={`inline-flex items-center px-3 py-1.5 rounded-full text-xs font-medium transition border ${
                active
                  ? "bg-sky-500 text-white border-sky-500"
                  : "bg-white text-slate-600 border-slate-200 hover:border-sky-300"
              }`}
            >
              {o.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ============ Details Modal ============

function DetailsModal({
  title,
  items,
  loading,
  onClose,
  kind,
}: {
  title: string;
  items: AnalyticsDetailsItem[];
  loading: boolean;
  onClose: () => void;
  kind: "visits" | "completed" | "doctors" | "reps" | "responses";
}) {
  return (
    <div className="fixed inset-0 z-[9999] flex items-end md:items-center justify-center">
      <div
        className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative bg-white w-full max-w-2xl mx-4 md:rounded-2xl rounded-t-3xl shadow-2xl max-h-[85vh] flex flex-col animate-slide-in-down">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 shrink-0">
          <div className="flex items-center gap-3">
            <span className="w-9 h-9 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center">
              <Icon d={icons.doctors} size={18} />
            </span>
            <div>
              <h3 className="text-base font-bold text-slate-900">{title}</h3>
              <p className="text-[11px] text-slate-500 mt-0.5">
                {loading ? "جاري التحميل..." : `${items.length} عنصر`}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-lg hover:bg-slate-100 flex items-center justify-center text-slate-500"
          >
            <Icon d={icons.close} size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="overflow-y-auto p-4 flex-1">
          {loading ? (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-16 bg-slate-100 rounded-xl animate-pulse" />
              ))}
            </div>
          ) : items.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-sm text-slate-400">لا توجد بيانات</div>
            </div>
          ) : (
            <div className="space-y-2">
              {items.map((item, idx) => (
                <div
                  key={item.id || idx}
                  className="rounded-xl bg-slate-50 hover:bg-slate-100 transition p-3"
                >
                  {kind === "doctors" ? (
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-sky-500 to-teal-500 text-white flex items-center justify-center text-xs font-bold shrink-0">
                        {(item.name || "?").slice(0, 2)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-bold text-slate-900 truncate">
                          {item.name}
                        </div>
                        <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 mt-0.5 text-[11px] text-slate-500">
                          {item.specialty && <span>{item.specialty}</span>}
                          {item.area && <span>· {item.area}</span>}
                          {item.phone && <span dir="ltr">· {item.phone}</span>}
                        </div>
                      </div>
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-sky-50 text-sky-700 border border-sky-100 shrink-0">
                        {item.count} زيارة
                      </span>
                    </div>
                  ) : kind === "reps" ? (
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-500 text-white flex items-center justify-center text-xs font-bold shrink-0">
                        {(item.name || "?").slice(0, 2)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-bold text-slate-900 truncate">
                          {item.name}
                        </div>
                        <div className="text-[11px] text-slate-500 mt-0.5 truncate">
                          {item.email}
                        </div>
                      </div>
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-100 shrink-0">
                        {item.count} زيارة
                      </span>
                    </div>
                  ) : (
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-sky-500 to-teal-500 text-white flex items-center justify-center text-xs font-bold shrink-0">
                        {(item.doctor_name || "?").slice(0, 2)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-bold text-slate-900 truncate">
                          {item.doctor_name}
                        </div>
                        <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 mt-0.5 text-[11px] text-slate-500">
                          {item.doctor_specialty && <span>{item.doctor_specialty}</span>}
                          {item.doctor_area && <span>· {item.doctor_area}</span>}
                        </div>
                        <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 mt-1.5 text-[10px] text-slate-500">
                          <span className="font-medium text-slate-700">
                            {item.rep_name}
                          </span>
                          <span>·</span>
                          <span>{fmtDate(item.checked_in_at)}</span>
                          {item.duration_minutes != null && (
                            <>
                              <span>·</span>
                              <span>{item.duration_minutes} دقيقة</span>
                            </>
                          )}
                        </div>
                        {item.doctor_response && (
                          <span className="inline-flex mt-1.5 px-2 py-0.5 rounded-full text-[10px] font-medium bg-teal-50 text-teal-700 border border-teal-100">
                            {RESPONSE_LABELS[item.doctor_response] || item.doctor_response}
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-slate-100 bg-slate-50/50 shrink-0">
          <button
            onClick={onClose}
            className="w-full py-2.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold transition"
          >
            إغلاق
          </button>
        </div>
      </div>
    </div>
  );
}

// ============ Main Component ============

export function AnalyticsView({ title, subtitle }: { title: string; subtitle: string }) {
  const [data, setData] = useState<AnalyticsOverview | null>(null);
  const [filters, setFilters] = useState<AnalyticsFilters | null>(null);
  const [loading, setLoading] = useState(true);

  const [days, setDays] = useState(30);
  const [specialty, setSpecialty] = useState<string | null>(null);
  const [area, setArea] = useState<string | null>(null);
  const [repId, setRepId] = useState<string | null>(null);
  const [productId, setProductId] = useState<string | null>(null);

  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [modalTitle, setModalTitle] = useState("");
  const [modalKind, setModalKind] =
    useState<"visits" | "completed" | "doctors" | "reps" | "responses">("visits");
  const [modalItems, setModalItems] = useState<AnalyticsDetailsItem[]>([]);
  const [modalLoading, setModalLoading] = useState(false);

  useEffect(() => {
    getAnalyticsFilters().then(setFilters).catch(() => {});
  }, []);

  useEffect(() => {
    setLoading(true);
    getAnalyticsOverview({
      days,
      specialty: specialty || undefined,
      area: area || undefined,
      rep_id: repId || undefined,
      product_id: productId || undefined,
    })
      .then(setData)
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, [days, specialty, area, repId, productId]);

  async function openDetails(
    kind: "visits" | "completed" | "doctors" | "reps" | "responses",
    title: string,
    responseType?: string
  ) {
    setModalOpen(true);
    setModalTitle(title);
    setModalKind(kind);
    setModalItems([]);
    setModalLoading(true);
    try {
      const res = await getAnalyticsDetails({
        type: kind,
        response_type: responseType,
        days,
        specialty: specialty || undefined,
        area: area || undefined,
        rep_id: repId || undefined,
        product_id: productId || undefined,
      });
      setModalItems(res.items);
    } catch {
      setModalItems([]);
    } finally {
      setModalLoading(false);
    }
  }

  const filterOptions = useMemo(() => {
    if (!filters) return null;
    return {
      specialties: filters.specialties.map((s) => ({ value: s, label: s })),
      areas: filters.areas.map((a) => ({ value: a, label: a })),
      products: filters.products.map((p) => ({ value: p.id, label: p.name })),
      reps: filters.reps
        .filter((r) => r.role === "MEDICAL_REP")
        .map((r) => ({ value: r.id, label: r.name })),
    };
  }, [filters]);

  const hasActiveFilter = !!(specialty || area || repId || productId);

  return (
    <div className="max-w-7xl mx-auto pb-10 space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">{title}</h1>
          <p className="mt-1 text-slate-600 text-sm">{subtitle}</p>
        </div>
        <div className="inline-flex bg-white border border-slate-200 rounded-xl p-1">
          {DAYS_OPTIONS.map((o) => (
            <button
              key={o.value}
              onClick={() => setDays(o.value)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                days === o.value
                  ? "bg-slate-900 text-white shadow-sm"
                  : "text-slate-600 hover:bg-slate-50"
              }`}
            >
              {o.label}
            </button>
          ))}
        </div>
      </div>

      {/* Filters */}
      {filterOptions && (
        <div className="grid md:grid-cols-2 gap-3">
          <FilterChips
            label="التخصص"
            options={filterOptions.specialties}
            value={specialty}
            onChange={setSpecialty}
          />
          <FilterChips
            label="المنطقة"
            options={filterOptions.areas}
            value={area}
            onChange={setArea}
          />
          <FilterChips
            label="المنتج"
            options={filterOptions.products}
            value={productId}
            onChange={setProductId}
          />
          {filterOptions.reps.length > 1 && (
            <FilterChips
              label="المندوب"
              options={filterOptions.reps}
              value={repId}
              onChange={setRepId}
            />
          )}
        </div>
      )}

      {hasActiveFilter && (
        <button
          onClick={() => {
            setSpecialty(null);
            setArea(null);
            setRepId(null);
            setProductId(null);
          }}
          className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-slate-800"
        >
          <Icon d={icons.close} size={14} />
          مسح الفلاتر
        </button>
      )}

      {/* Stats */}
      {loading ? (
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-28 bg-slate-100 rounded-2xl animate-pulse" />
          ))}
        </div>
      ) : !data ? (
        <div className="rounded-2xl bg-white border border-slate-200 p-12 text-center text-sm text-slate-500">
          فشل تحميل البيانات
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
            <StatCard
              label="إجمالي الزيارات"
              value={data.totals.visits}
              icon={icons.visits}
              accent="sky"
              onClick={() => openDetails("visits", "كل الزيارات")}
            />
            <StatCard
              label="زيارات مكتملة"
              value={data.totals.completed}
              icon={icons.check}
              accent="teal"
              onClick={() => openDetails("completed", "الزيارات المكتملة")}
            />
            <StatCard
              label="أطباء مميزين"
              value={data.totals.unique_doctors}
              icon={icons.doctors}
              accent="indigo"
              onClick={() => openDetails("doctors", "الأطباء الذين تمت زيارتهم")}
            />
            <StatCard
              label="مندوبين نشطين"
              value={data.totals.unique_reps}
              icon={icons.users}
              accent="amber"
              onClick={() => openDetails("reps", "المندوبين النشطين")}
            />
            <StatCard
              label="معدل التحويل"
              value={data.totals.conversion_rate}
              suffix="%"
              icon={icons.target}
              accent="rose"
            />
          </div>

          {/* Response breakdown */}
          <div className="rounded-2xl bg-white border border-slate-200 p-5">
            <h3 className="text-sm font-semibold text-slate-800 mb-4">
              ردود الأطباء
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                { label: "مهتم جداً", key: "VERY_INTERESTED", value: data.responses.very_interested, color: "bg-teal-500" },
                { label: "مهتم", key: "INTERESTED", value: data.responses.interested, color: "bg-sky-500" },
                { label: "محايد", key: "NEUTRAL", value: data.responses.neutral, color: "bg-amber-500" },
                { label: "غير مهتم", key: "NOT_INTERESTED", value: data.responses.not_interested, color: "bg-rose-500" },
              ].map((r) => (
                <button
                  key={r.label}
                  onClick={() => openDetails("responses", `رد: ${r.label}`, r.key)}
                  className="text-start rounded-xl bg-slate-50 hover:bg-slate-100 transition p-3 cursor-pointer"
                >
                  <div className="flex items-center gap-2 mb-2">
                    <span className={`w-2 h-2 rounded-full ${r.color}`} />
                    <span className="text-[11px] font-medium text-slate-600">
                      {r.label}
                    </span>
                  </div>
                  <div className="text-2xl font-bold text-slate-900 tabular-nums">
                    {r.value}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Trend */}
          <TrendChart data={data.visit_trend} />

          {/* Bars grid */}
          <div className="grid md:grid-cols-2 gap-4">
            <BarsList
              title="أكثر منتجات مناقشة"
              items={data.top_products.map((p) => ({ label: p.name, count: p.count }))}
              emptyText="لا توجد منتجات بعد"
              colorClass="from-indigo-500 to-purple-500"
            />
            <BarsList
              title="أفضل مندوبين"
              items={data.top_reps.map((r) => ({ label: r.name, count: r.count }))}
              emptyText="لا يوجد مندوبين بعد"
              colorClass="from-teal-500 to-emerald-500"
            />
            <BarsList
              title="أنشط المناطق"
              items={data.top_areas.map((a) => ({ label: a.area, count: a.count }))}
              emptyText="لا توجد بيانات"
              colorClass="from-sky-500 to-cyan-500"
            />
            <BarsList
              title="التخصصات الأكثر زيارة"
              items={data.top_specialties.map((s) => ({ label: s.specialty, count: s.count }))}
              emptyText="لا توجد بيانات"
              colorClass="from-amber-500 to-orange-500"
            />
          </div>
        </>
      )}

      {/* Modal */}
      {modalOpen && (
        <DetailsModal
          title={modalTitle}
          items={modalItems}
          loading={modalLoading}
          kind={modalKind}
          onClose={() => setModalOpen(false)}
        />
      )}
    </div>
  );
}