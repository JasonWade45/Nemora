import pathlib

root = pathlib.Path(r"C:\Users\ATG\Documents\Default Project\pharma-crm\src\app\admin")

reports = r'''"use client";

import { useEffect, useMemo, useState } from "react";
import { Doctor, Visit, getAllDoctors, getMyVisits } from "@/lib/api";
import { useLanguage } from "@/lib/language-context";
import { Icon, icons } from "@/components/ui/Icons";

type TimeRange = "7d" | "30d" | "90d" | "all";

const RANGES: { key: TimeRange; ar: string; en: string; days: number | null }[] = [
  { key: "7d", ar: "آخر 7 أيام", en: "Last 7 days", days: 7 },
  { key: "30d", ar: "آخر 30 يوم", en: "Last 30 days", days: 30 },
  { key: "90d", ar: "آخر 90 يوم", en: "Last 90 days", days: 90 },
  { key: "all", ar: "الكل", en: "All time", days: null },
];

function csvEscape(v: unknown): string {
  if (v === null || v === undefined) return "";
  const s = String(v).replace(/"/g, '""');
  if (/[",\n\r]/.test(s)) return `"${s}"`;
  return s;
}

function downloadCSV(filename: string, rows: Record<string, unknown>[]) {
  if (rows.length === 0) return;
  const headers = Object.keys(rows[0]);
  const lines: string[] = [];
  lines.push(headers.join(","));
  for (const row of rows) {
    lines.push(headers.map((h) => csvEscape(row[h])).join(","));
  }
  // BOM so Excel opens Arabic correctly
  const blob = new Blob(["\uFEFF" + lines.join("\r\n")], {
    type: "text/csv;charset=utf-8;",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function StatCard({
  label,
  value,
  hint,
  icon,
  accent,
  loading,
}: {
  label: string;
  value: number | string;
  hint?: string;
  icon: string;
  accent: "sky" | "teal" | "amber" | "indigo";
  loading?: boolean;
}) {
  const colors: Record<string, { bg: string; fg: string; grad: string }> = {
    sky: { bg: "bg-sky-50", fg: "text-sky-600", grad: "from-sky-500 to-cyan-400" },
    teal: { bg: "bg-teal-50", fg: "text-teal-600", grad: "from-teal-500 to-emerald-400" },
    amber: { bg: "bg-amber-50", fg: "text-amber-600", grad: "from-amber-500 to-orange-400" },
    indigo: { bg: "bg-indigo-50", fg: "text-indigo-600", grad: "from-indigo-500 to-violet-400" },
  };
  const c = colors[accent];
  return (
    <div className="relative rounded-2xl bg-white border border-slate-200 p-5 overflow-hidden group hover:shadow-lg hover:shadow-slate-200/50 transition-all">
      <div className={`absolute top-0 end-0 w-32 h-32 bg-gradient-to-br ${c.grad} opacity-0 group-hover:opacity-5 rounded-full blur-2xl transition-opacity`} />
      <div className="relative">
        <div className={`w-10 h-10 rounded-xl ${c.bg} ${c.fg} flex items-center justify-center mb-3`}>
          <Icon d={icon} size={20} />
        </div>
        <div className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">{label}</div>
        <div className="text-3xl font-bold text-slate-900 tabular-nums mb-1">
          {loading ? <span className="inline-block w-14 h-8 bg-slate-100 rounded animate-pulse" /> : value}
        </div>
        {hint && <div className="text-xs text-slate-500">{hint}</div>}
      </div>
    </div>
  );
}

function SpecialtyBar({ name, count, total }: { name: string; count: number; total: number }) {
  const pct = total > 0 ? Math.round((count / total) * 100) : 0;
  return (
    <div>
      <div className="flex items-center justify-between text-xs mb-1.5">
        <span className="font-medium text-slate-700 truncate">{name}</span>
        <span className="text-slate-500 tabular-nums">
          <span className="font-semibold text-slate-900">{count}</span> · {pct}%
        </span>
      </div>
      <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-sky-500 to-teal-500 rounded-full transition-all duration-700"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

function ActivityBars({ visits }: { visits: Visit[] }) {
  const days = 14;
  const data: { date: Date; label: string; count: number }[] = [];
  const now = new Date();
  now.setHours(0, 0, 0, 0);

  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    data.push({
      date: d,
      label: d.toLocaleDateString("ar-EG", { day: "numeric", month: "short" }),
      count: 0,
    });
  }

  for (const v of visits) {
    const t = v.check_in_at || v.planned_at || v.created_at;
    if (!t) continue;
    const d = new Date(t);
    d.setHours(0, 0, 0, 0);
    const idx = data.findIndex((x) => x.date.getTime() === d.getTime());
    if (idx >= 0) data[idx].count += 1;
  }

  const max = Math.max(...data.map((d) => d.count), 1);

  return (
    <div className="h-40 flex items-end gap-1.5">
      {data.map((d, i) => {
        const h = (d.count / max) * 100;
        return (
          <div key={i} className="flex-1 flex flex-col items-center gap-1.5 group" title={`${d.label}: ${d.count}`}>
            <div className="text-[9px] text-slate-400 font-medium opacity-0 group-hover:opacity-100 transition tabular-nums">
              {d.count || ""}
            </div>
            <div
              className={`w-full rounded-t-md transition-all duration-500 ${
                d.count > 0 ? "bg-gradient-to-t from-sky-500 to-teal-400" : "bg-slate-100"
              }`}
              style={{ height: `${Math.max(h, 3)}%`, minHeight: "3px" }}
            />
            <span className="text-[9px] text-slate-400 whitespace-nowrap">
              {i % 3 === 0 ? d.date.getDate() : ""}
            </span>
          </div>
        );
      })}
    </div>
  );
}

function ExportCard({
  title,
  description,
  rows,
  filename,
  disabled,
  icon,
  accent,
  lang,
}: {
  title: string;
  description: string;
  rows: Record<string, unknown>[];
  filename: string;
  disabled?: boolean;
  icon: string;
  accent: "sky" | "teal" | "indigo";
  lang: string;
}) {
  const [done, setDone] = useState(false);
  const canExport = !disabled && rows.length > 0;

  const colors: Record<string, string> = {
    sky: "from-sky-500 to-cyan-400",
    teal: "from-teal-500 to-emerald-400",
    indigo: "from-indigo-500 to-violet-400",
  };

  function handleExport() {
    downloadCSV(filename, rows);
    setDone(true);
    setTimeout(() => setDone(false), 2000);
  }

  return (
    <div className="rounded-2xl bg-white border border-slate-200 p-5 hover:border-slate-300 transition">
      <div className="flex items-start gap-3 mb-4">
        <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${colors[accent]} text-white flex items-center justify-center shrink-0 shadow-sm`}>
          <Icon d={icon} size={18} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-semibold text-slate-900">{title}</div>
          <div className="text-xs text-slate-500 mt-0.5">{description}</div>
        </div>
      </div>
      <button
        onClick={handleExport}
        disabled={!canExport}
        className={`w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-xs font-medium transition ${
          !canExport
            ? "bg-slate-100 text-slate-400 cursor-not-allowed"
            : done
            ? "bg-teal-500 text-white"
            : "bg-slate-900 hover:bg-slate-800 text-white"
        }`}
      >
        {done ? (
          <>
            <Icon d={icons.check} size={13} />
            {lang === "ar" ? "تم التنزيل" : "Downloaded"}
          </>
        ) : (
          <>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4 M7 10l5 5 5-5 M12 15V3" />
            </svg>
            {canExport
              ? lang === "ar"
                ? `تصدير CSV (${rows.length})`
                : `Export CSV (${rows.length})`
              : lang === "ar"
              ? "لا توجد بيانات"
              : "No data"}
          </>
        )}
      </button>
    </div>
  );
}

export default function ReportsPage() {
  const { lang } = useLanguage();
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [visits, setVisits] = useState<Visit[]>([]);
  const [loading, setLoading] = useState(true);
  const [range, setRange] = useState<TimeRange>("30d");

  useEffect(() => {
    (async () => {
      try {
        const [d, v] = await Promise.all([
          getAllDoctors().catch(() => []),
          getMyVisits().catch(() => []),
        ]);
        setDoctors(d);
        setVisits(v);
      } catch {}
      setLoading(false);
    })();
  }, []);

  const filteredVisits = useMemo(() => {
    const cfg = RANGES.find((r) => r.key === range);
    if (!cfg || cfg.days === null) return visits;
    const cutoff = Date.now() - cfg.days * 24 * 60 * 60 * 1000;
    return visits.filter((v) => {
      const t = v.check_in_at || v.planned_at || v.created_at;
      if (!t) return false;
      return new Date(t).getTime() >= cutoff;
    });
  }, [visits, range]);

  const stats = useMemo(() => {
    const completed = filteredVisits.filter((v) => v.status === "COMPLETED").length;
    const active = filteredVisits.filter((v) => v.status === "CHECKED_IN").length;
    return {
      doctors: doctors.length,
      visits: filteredVisits.length,
      completed,
      active,
      completionRate:
        filteredVisits.length > 0 ? Math.round((completed / filteredVisits.length) * 100) : 0,
    };
  }, [doctors, filteredVisits]);

  const specialtyDist = useMemo(() => {
    const map = new Map<string, number>();
    for (const d of doctors) {
      const s = (d.specialty || "أخرى").trim();
      map.set(s, (map.get(s) || 0) + 1);
    }
    return Array.from(map.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10);
  }, [doctors]);

  // ===== Export data builders =====
  const doctorsRows = useMemo(
    () =>
      doctors.map((d) => ({
        Name: d.full_name || `${d.first_name ?? ""} ${d.last_name ?? ""}`.trim(),
        Specialty: d.specialty ?? "",
        Phone: d.phone ?? "",
        Address: d.address ?? "",
        City: d.city ?? "",
        State: d.state ?? "",
        Latitude: d.latitude ?? "",
        Longitude: d.longitude ?? "",
        Priority: d.priority ?? "",
        Status: d.status ?? "",
      })),
    [doctors]
  );

  const visitsRows = useMemo(
    () =>
      filteredVisits.map((v) => ({
        VisitID: v.id,
        DoctorID: v.doctor_id,
        Status: v.status ?? "",
        PlannedAt: v.planned_at ?? "",
        CheckInAt: v.check_in_at ?? "",
        CheckOutAt: v.check_out_at ?? "",
        CheckInLat: v.check_in_latitude ?? "",
        CheckInLng: v.check_in_longitude ?? "",
        CheckOutLat: v.check_out_latitude ?? "",
        CheckOutLng: v.check_out_longitude ?? "",
        DistanceMeters: v.check_in_distance ?? "",
        Notes: v.notes ?? "",
        Outcome: v.outcome ?? "",
      })),
    [filteredVisits]
  );

  const specialtyRows = useMemo(() => {
    const map = new Map<string, number>();
    for (const d of doctors) {
      const s = (d.specialty || "أخرى").trim();
      map.set(s, (map.get(s) || 0) + 1);
    }
    const total = doctors.length || 1;
    return Array.from(map.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([spec, count]) => ({
        Specialty: spec,
        Count: count,
        Percentage: `${Math.round((count / total) * 100)}%`,
      }));
  }, [doctors]);

  const today = new Date().toISOString().slice(0, 10);

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">
            {lang === "ar" ? "التقارير" : "Reports"}
          </h1>
          <p className="mt-1 text-slate-600 text-sm">
            {lang === "ar" ? "نظرة عامة على النشاط الميداني" : "Overview of field activity"}
          </p>
        </div>

        <div className="inline-flex bg-white border border-slate-200 rounded-xl p-1">
          {RANGES.map((r) => (
            <button
              key={r.key}
              onClick={() => setRange(r.key)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                range === r.key ? "bg-slate-900 text-white shadow-sm" : "text-slate-600 hover:bg-slate-50"
              }`}
            >
              {lang === "ar" ? r.ar : r.en}
            </button>
          ))}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard
          label={lang === "ar" ? "إجمالي الأطباء" : "Total doctors"}
          value={stats.doctors}
          icon={icons.doctors}
          accent="sky"
          loading={loading}
        />
        <StatCard
          label={lang === "ar" ? "الزيارات" : "Visits"}
          value={stats.visits}
          icon={icons.visits}
          accent="indigo"
          loading={loading}
          hint={lang === "ar" ? "في الفترة المحددة" : "In selected range"}
        />
        <StatCard
          label={lang === "ar" ? "مكتملة" : "Completed"}
          value={stats.completed}
          icon={icons.check}
          accent="teal"
          loading={loading}
          hint={`${stats.completionRate}%`}
        />
        <StatCard
          label={lang === "ar" ? "نشطة" : "Active"}
          value={stats.active}
          icon={icons.visits}
          accent="amber"
          loading={loading}
        />
      </div>

      {/* Activity + Distribution */}
      <div className="grid lg:grid-cols-3 gap-4 mb-6">
        <div className="lg:col-span-2 rounded-2xl bg-white border border-slate-200 p-6">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="text-sm font-semibold text-slate-700">
                {lang === "ar" ? "النشاط خلال آخر 14 يوم" : "Activity — last 14 days"}
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                {lang === "ar" ? "عدد الزيارات المسجّلة يومياً" : "Daily recorded visits"}
              </p>
            </div>
            <span className="inline-flex items-center gap-1.5 text-xs text-slate-500">
              <span className="w-2 h-2 rounded-full bg-sky-500" />
              {lang === "ar" ? "زيارات" : "Visits"}
            </span>
          </div>
          {loading ? (
            <div className="h-40 bg-slate-100 rounded animate-pulse" />
          ) : (
            <ActivityBars visits={visits} />
          )}
        </div>

        <div className="rounded-2xl bg-white border border-slate-200 p-6">
          <h2 className="text-sm font-semibold text-slate-700 mb-1">
            {lang === "ar" ? "الأطباء حسب التخصص" : "Doctors by specialty"}
          </h2>
          <p className="text-xs text-slate-500 mb-5">
            {lang === "ar" ? "أعلى 10 تخصصات" : "Top 10 specialties"}
          </p>
          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="h-8 bg-slate-100 rounded animate-pulse" />
              ))}
            </div>
          ) : specialtyDist.length === 0 ? (
            <div className="text-sm text-slate-500 text-center py-8">
              {lang === "ar" ? "لا توجد بيانات" : "No data"}
            </div>
          ) : (
            <div className="space-y-3 max-h-80 overflow-y-auto">
              {specialtyDist.map(([spec, count]) => (
                <SpecialtyBar key={spec} name={spec} count={count} total={doctors.length} />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Exports */}
      <div className="mb-4">
        <h2 className="text-sm font-semibold text-slate-700 mb-3">
          {lang === "ar" ? "تصدير التقارير" : "Export reports"}
        </h2>
        <div className="grid sm:grid-cols-3 gap-4">
          <ExportCard
            title={lang === "ar" ? "قائمة الأطباء" : "Doctors list"}
            description={lang === "ar" ? "كل الأطباء بالبيانات الكاملة" : "All doctors with full data"}
            rows={doctorsRows}
            filename={`nemora-doctors-${today}.csv`}
            disabled={loading}
            icon={icons.doctors}
            accent="sky"
            lang={lang}
          />
          <ExportCard
            title={lang === "ar" ? "سجل الزيارات" : "Visits log"}
            description={
              lang === "ar"
                ? `الزيارات في الفترة المحددة`
                : `Visits in the selected range`
            }
            rows={visitsRows}
            filename={`nemora-visits-${today}.csv`}
            disabled={loading}
            icon={icons.visits}
            accent="indigo"
            lang={lang}
          />
          <ExportCard
            title={lang === "ar" ? "توزيع التخصصات" : "Specialty breakdown"}
            description={lang === "ar" ? "عدد الأطباء لكل تخصص" : "Doctor count per specialty"}
            rows={specialtyRows}
            filename={`nemora-specialties-${today}.csv`}
            disabled={loading}
            icon={icons.reports}
            accent="teal"
            lang={lang}
          />
        </div>
      </div>
    </div>
  );
}
'''
(root / "reports" / "page.tsx").write_text(reports, encoding="utf-8")
print("OK - reports/page.tsx")
print("Done!")