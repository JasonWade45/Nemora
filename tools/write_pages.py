import pathlib

root = pathlib.Path(r"C:\Users\ATG\Documents\Default Project\pharma-crm\src\app\admin")

# ============ REPORTS — better layout ============
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

        {/* Time range selector */}
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

      {/* Stats grid */}
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
      <div className="grid lg:grid-cols-3 gap-4 mb-4">
        {/* Activity chart */}
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

        {/* Specialty distribution */}
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

      {/* Coming soon */}
      <div className="rounded-2xl bg-gradient-to-r from-sky-50 to-teal-50 border border-sky-100 p-6">
        <div className="flex items-start gap-4">
          <span className="w-10 h-10 rounded-xl bg-white text-sky-600 flex items-center justify-center shrink-0 shadow-sm">
            <Icon d={icons.reports} size={20} />
          </span>
          <div className="flex-1">
            <div className="text-sm font-semibold text-slate-900 mb-1">
              {lang === "ar" ? "تقارير متقدمة" : "Advanced reports"}
            </div>
            <p className="text-xs text-slate-600 leading-relaxed mb-3">
              {lang === "ar"
                ? "تصدير PDF / Excel، فلترة بالتاريخ، وتقارير تفصيلية لكل مندوب — قريباً."
                : "PDF/Excel export, date filtering, and per-rep detailed reports — coming soon."}
            </p>
            <button
              disabled
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-white border border-slate-200 text-slate-400 text-xs font-medium cursor-not-allowed"
            >
              {lang === "ar" ? "تصدير (قريباً)" : "Export (soon)"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
'''
(root / "reports" / "page.tsx").write_text(reports, encoding="utf-8")
print("OK - reports/page.tsx")

# ============ SETTINGS — fully editable ============
settings = r'''"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import { useLanguage } from "@/lib/language-context";
import { Icon, icons } from "@/components/ui/Icons";

type OrgSettings = {
  check_in_radius_meters?: number;
  gps_ping_interval_minutes?: number;
  working_hours?: { start?: string; end?: string };
  notifications?: {
    followup_due?: boolean;
    visit_reminder?: boolean;
    daily_report?: boolean;
  };
};

type Organization = {
  id: string;
  name: string;
  slug: string;
  settings?: OrgSettings;
  created_at?: string;
};

function SectionCard({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl bg-white border border-slate-200 overflow-hidden">
      <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50">
        <h2 className="text-sm font-semibold text-slate-900">{title}</h2>
        {description && <p className="text-xs text-slate-500 mt-0.5">{description}</p>}
      </div>
      <div className="p-6">{children}</div>
    </div>
  );
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mb-5 last:mb-0">
      <label className="block text-xs font-medium text-slate-700 mb-1.5">{label}</label>
      {children}
      {hint && <p className="mt-1.5 text-[11px] text-slate-500">{hint}</p>}
    </div>
  );
}

function Toggle({
  checked,
  onChange,
  label,
  description,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
  description?: string;
}) {
  return (
    <div className="flex items-start justify-between gap-4 py-3 border-b border-slate-100 last:border-0">
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium text-slate-900">{label}</div>
        {description && <div className="text-xs text-slate-500 mt-0.5">{description}</div>}
      </div>
      <button
        type="button"
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-6 w-11 shrink-0 rounded-full transition ${
          checked ? "bg-teal-500" : "bg-slate-300"
        }`}
      >
        <span
          className={`inline-block h-5 w-5 mt-0.5 rounded-full bg-white shadow transition ${
            checked ? "translate-x-5 rtl:-translate-x-5" : "translate-x-0.5 rtl:-translate-x-0.5"
          }`}
        />
      </button>
    </div>
  );
}

export default function SettingsPage() {
  const { lang } = useLanguage();
  const [org, setOrg] = useState<Organization | null>(null);
  const [me, setMe] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [toast, setToast] = useState<{ msg: string; type: "ok" | "err" } | null>(null);

  // Editable state
  const [orgName, setOrgName] = useState("");
  const [gpsRadius, setGpsRadius] = useState(100);
  const [gpsInterval, setGpsInterval] = useState(10);
  const [workStart, setWorkStart] = useState("09:00");
  const [workEnd, setWorkEnd] = useState("17:00");
  const [notifyFollowup, setNotifyFollowup] = useState(true);
  const [notifyVisit, setNotifyVisit] = useState(true);
  const [notifyDaily, setNotifyDaily] = useState(true);

  function showToast(msg: string, type: "ok" | "err" = "ok") {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  }

  async function load() {
    try {
      const [o, m] = await Promise.all([
        apiFetch<Organization>("/api/organizations/me").catch(() => null),
        apiFetch<any>("/api/auth/me").catch(() => null),
      ]);
      if (o) {
        setOrg(o);
        setOrgName(o.name || "");
        const s = o.settings || {};
        setGpsRadius(s.check_in_radius_meters ?? 100);
        setGpsInterval(s.gps_ping_interval_minutes ?? 10);
        setWorkStart(s.working_hours?.start ?? "09:00");
        setWorkEnd(s.working_hours?.end ?? "17:00");
        setNotifyFollowup(s.notifications?.followup_due ?? true);
        setNotifyVisit(s.notifications?.visit_reminder ?? true);
        setNotifyDaily(s.notifications?.daily_report ?? true);
      }
      setMe(m);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const isAdmin = me?.role === "ADMIN";

  async function saveOrgName() {
    if (!orgName.trim() || orgName === org?.name) return;
    setSaving("name");
    try {
      const updated = await apiFetch<Organization>("/api/organizations/me", {
        method: "PATCH",
        body: JSON.stringify({ name: orgName.trim() }),
      });
      setOrg(updated);
      showToast(lang === "ar" ? "تم حفظ اسم الشركة" : "Organization name saved");
    } catch (e: any) {
      showToast(e?.message || "Failed", "err");
    } finally {
      setSaving(null);
    }
  }

  async function saveSettings(patch: Partial<OrgSettings>, key: string) {
    setSaving(key);
    try {
      const updated = await apiFetch<Organization>("/api/organizations/me", {
        method: "PATCH",
        body: JSON.stringify({ settings: patch }),
      });
      setOrg(updated);
      showToast(lang === "ar" ? "تم الحفظ" : "Saved");
    } catch (e: any) {
      showToast(e?.message || "Failed", "err");
    } finally {
      setSaving(null);
    }
  }

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto">
        <div className="animate-pulse space-y-4">
          <div className="h-10 w-48 bg-slate-100 rounded" />
          <div className="h-40 bg-slate-100 rounded-2xl" />
          <div className="h-40 bg-slate-100 rounded-2xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto pb-10">
      {/* Toast */}
      {toast && (
        <div
          className={`fixed top-4 end-4 z-50 px-4 py-2.5 rounded-xl shadow-lg text-sm font-medium transition ${
            toast.type === "ok"
              ? "bg-teal-500 text-white"
              : "bg-red-500 text-white"
          }`}
        >
          {toast.msg}
        </div>
      )}

      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-slate-900 tracking-tight">
          {lang === "ar" ? "الإعدادات" : "Settings"}
        </h1>
        <p className="mt-1 text-slate-600 text-sm">
          {lang === "ar"
            ? "إعدادات الشركة، GPS، ساعات العمل، والإشعارات"
            : "Organization, GPS, working hours, and notifications"}
        </p>
      </div>

      {!isAdmin && (
        <div className="mb-6 rounded-xl bg-amber-50 border border-amber-200 px-4 py-3 text-xs text-amber-800">
          {lang === "ar"
            ? "أنت لست أدمن — يمكنك المشاهدة فقط."
            : "You are not an admin — view only."}
        </div>
      )}

      <div className="space-y-4">
        {/* Organization */}
        <SectionCard
          title={lang === "ar" ? "الشركة" : "Organization"}
          description={lang === "ar" ? "اسم الشركة الظاهر للنظام" : "Your organization's display name"}
        >
          <Field label={lang === "ar" ? "اسم الشركة" : "Organization name"}>
            <div className="flex gap-2">
              <input
                type="text"
                value={orgName}
                onChange={(e) => setOrgName(e.target.value)}
                disabled={!isAdmin}
                className="flex-1 px-3 py-2 rounded-lg border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-400 transition disabled:bg-slate-50"
              />
              {isAdmin && (
                <button
                  onClick={saveOrgName}
                  disabled={saving === "name" || orgName === org?.name || !orgName.trim()}
                  className="px-4 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 disabled:bg-slate-300 disabled:cursor-not-allowed text-white text-xs font-medium transition"
                >
                  {saving === "name"
                    ? "..."
                    : lang === "ar"
                    ? "حفظ"
                    : "Save"}
                </button>
              )}
            </div>
          </Field>
          <Field
            label={lang === "ar" ? "المعرف (Slug)" : "Slug"}
            hint={lang === "ar" ? "لا يمكن تعديله حالياً" : "Cannot be changed yet"}
          >
            <input
              type="text"
              value={org?.slug ?? ""}
              disabled
              className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-slate-50 text-sm font-mono text-slate-500"
            />
          </Field>
        </SectionCard>

        {/* GPS */}
        <SectionCard
          title={lang === "ar" ? "GPS والتتبع" : "GPS & Tracking"}
          description={lang === "ar" ? "إعدادات التحقق من الموقع" : "Location verification settings"}
        >
          <Field
            label={lang === "ar" ? "نطاق التحقق (بالمتر)" : "Check-in radius (meters)"}
            hint={
              lang === "ar"
                ? "أقصى مسافة بين المندوب والعيادة للتحقق من الزيارة"
                : "Max distance between rep and clinic for a verified visit"
            }
          >
            <div className="flex gap-2">
              <input
                type="number"
                min={10}
                max={1000}
                value={gpsRadius}
                onChange={(e) => setGpsRadius(parseInt(e.target.value) || 0)}
                disabled={!isAdmin}
                className="flex-1 px-3 py-2 rounded-lg border border-slate-200 bg-white text-sm tabular-nums focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-400 transition disabled:bg-slate-50"
              />
              {isAdmin && (
                <button
                  onClick={() =>
                    saveSettings({ check_in_radius_meters: gpsRadius }, "radius")
                  }
                  disabled={saving === "radius" || gpsRadius === (org?.settings?.check_in_radius_meters ?? 100)}
                  className="px-4 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 disabled:bg-slate-300 disabled:cursor-not-allowed text-white text-xs font-medium transition"
                >
                  {saving === "radius" ? "..." : lang === "ar" ? "حفظ" : "Save"}
                </button>
              )}
            </div>
          </Field>

          <Field
            label={lang === "ar" ? "معدّل إرسال الموقع (دقائق)" : "Location ping interval (minutes)"}
            hint={
              lang === "ar"
                ? "كل كم دقيقة يرسل التطبيق موقع المندوب أثناء الشفت"
                : "How often the app reports rep location during a shift"
            }
          >
            <div className="flex gap-2">
              <input
                type="number"
                min={1}
                max={60}
                value={gpsInterval}
                onChange={(e) => setGpsInterval(parseInt(e.target.value) || 0)}
                disabled={!isAdmin}
                className="flex-1 px-3 py-2 rounded-lg border border-slate-200 bg-white text-sm tabular-nums focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-400 transition disabled:bg-slate-50"
              />
              {isAdmin && (
                <button
                  onClick={() =>
                    saveSettings({ gps_ping_interval_minutes: gpsInterval }, "interval")
                  }
                  disabled={saving === "interval" || gpsInterval === (org?.settings?.gps_ping_interval_minutes ?? 10)}
                  className="px-4 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 disabled:bg-slate-300 disabled:cursor-not-allowed text-white text-xs font-medium transition"
                >
                  {saving === "interval" ? "..." : lang === "ar" ? "حفظ" : "Save"}
                </button>
              )}
            </div>
          </Field>
        </SectionCard>

        {/* Working hours */}
        <SectionCard
          title={lang === "ar" ? "ساعات العمل" : "Working hours"}
          description={lang === "ar" ? "أوقات الدوام الرسمي للفريق" : "Official team hours"}
        >
          <div className="grid grid-cols-2 gap-4">
            <Field label={lang === "ar" ? "من" : "From"}>
              <input
                type="time"
                value={workStart}
                onChange={(e) => setWorkStart(e.target.value)}
                disabled={!isAdmin}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white text-sm tabular-nums focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-400 transition disabled:bg-slate-50"
              />
            </Field>
            <Field label={lang === "ar" ? "إلى" : "To"}>
              <input
                type="time"
                value={workEnd}
                onChange={(e) => setWorkEnd(e.target.value)}
                disabled={!isAdmin}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white text-sm tabular-nums focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-400 transition disabled:bg-slate-50"
              />
            </Field>
          </div>
          {isAdmin && (
            <button
              onClick={() =>
                saveSettings({ working_hours: { start: workStart, end: workEnd } }, "hours")
              }
              disabled={
                saving === "hours" ||
                (workStart === (org?.settings?.working_hours?.start ?? "09:00") &&
                  workEnd === (org?.settings?.working_hours?.end ?? "17:00"))
              }
              className="mt-2 px-4 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 disabled:bg-slate-300 disabled:cursor-not-allowed text-white text-xs font-medium transition"
            >
              {saving === "hours" ? "..." : lang === "ar" ? "حفظ ساعات العمل" : "Save hours"}
            </button>
          )}
        </SectionCard>

        {/* Notifications */}
        <SectionCard
          title={lang === "ar" ? "الإشعارات" : "Notifications"}
          description={lang === "ar" ? "تحكم في الإشعارات المُرسلة للفريق" : "Control notifications sent to your team"}
        >
          <Toggle
            checked={notifyFollowup}
            onChange={(v) => {
              setNotifyFollowup(v);
              saveSettings(
                { notifications: { followup_due: v, visit_reminder: notifyVisit, daily_report: notifyDaily } },
                "notify-followup"
              );
            }}
            label={lang === "ar" ? "تنبيه عند استحقاق متابعة" : "Follow-up due reminder"}
            description={lang === "ar" ? "إشعار للمندوب عند وجود متابعة مستحقة" : "Notify rep when a follow-up is due"}
          />
          <Toggle
            checked={notifyVisit}
            onChange={(v) => {
              setNotifyVisit(v);
              saveSettings(
                { notifications: { followup_due: notifyFollowup, visit_reminder: v, daily_report: notifyDaily } },
                "notify-visit"
              );
            }}
            label={lang === "ar" ? "تنبيه قبل الزيارة" : "Visit reminder"}
            description={lang === "ar" ? "تذكير المندوب قبل الزيارة بوقت" : "Remind rep before scheduled visits"}
          />
          <Toggle
            checked={notifyDaily}
            onChange={(v) => {
              setNotifyDaily(v);
              saveSettings(
                { notifications: { followup_due: notifyFollowup, visit_reminder: notifyVisit, daily_report: v } },
                "notify-daily"
              );
            }}
            label={lang === "ar" ? "تقرير يومي للإدارة" : "Daily report to managers"}
            description={lang === "ar" ? "إرسال ملخص يومي تلقائي للمدير" : "Auto-send daily summary to managers"}
          />
        </SectionCard>

        {/* Account */}
        <SectionCard
          title={lang === "ar" ? "الحساب" : "Account"}
          description={lang === "ar" ? "بياناتك الشخصية" : "Your personal information"}
        >
          <div className="space-y-4">
            <div>
              <div className="text-xs text-slate-500 mb-1">{lang === "ar" ? "الاسم" : "Name"}</div>
              <div className="text-sm font-medium text-slate-900">{me?.full_name ?? "—"}</div>
            </div>
            <div>
              <div className="text-xs text-slate-500 mb-1">{lang === "ar" ? "البريد" : "Email"}</div>
              <div className="text-sm text-slate-700">{me?.email ?? "—"}</div>
            </div>
            <div>
              <div className="text-xs text-slate-500 mb-1">{lang === "ar" ? "الدور" : "Role"}</div>
              <div className="text-sm text-slate-700">{me?.role ?? "—"}</div>
            </div>
          </div>
        </SectionCard>
      </div>
    </div>
  );
}
'''
(root / "settings" / "page.tsx").write_text(settings, encoding="utf-8")
print("OK - settings/page.tsx")
print("Done!")