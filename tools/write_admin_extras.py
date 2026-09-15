import pathlib

root = pathlib.Path(r"C:\Users\ATG\Documents\Default Project\pharma-crm\src\app\admin")

# ============ SETTINGS PAGE ============
settings = r'''"use client";

import { useEffect, useState } from "react";
import { apiFetch, getToken } from "@/lib/api";
import { useLanguage } from "@/lib/language-context";
import { Icon, icons } from "@/components/ui/Icons";

export default function SettingsPage() {
  const { lang } = useLanguage();
  const [org, setOrg] = useState<any>(null);
  const [me, setMe] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const [o, m] = await Promise.all([
          apiFetch("/api/organizations/me").catch(() => null),
          apiFetch("/api/auth/me").catch(() => null),
        ]);
        setOrg(o);
        setMe(m);
      } catch {}
      setLoading(false);
    })();
  }, []);

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-slate-900 tracking-tight">
          {lang === "ar" ? "الإعدادات" : "Settings"}
        </h1>
        <p className="mt-1 text-slate-600 text-sm">
          {lang === "ar" ? "إعدادات الشركة والحساب" : "Organization and account settings"}
        </p>
      </div>

      {/* Organization */}
      <div className="rounded-2xl bg-white border border-slate-200 p-6 mb-4">
        <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-4">
          {lang === "ar" ? "الشركة" : "Organization"}
        </h2>
        {loading ? (
          <div className="h-16 bg-slate-100 rounded animate-pulse" />
        ) : (
          <div className="space-y-3">
            <div>
              <div className="text-xs text-slate-500 mb-1">
                {lang === "ar" ? "الاسم" : "Name"}
              </div>
              <div className="text-sm font-medium text-slate-900">{org?.name ?? "—"}</div>
            </div>
            <div>
              <div className="text-xs text-slate-500 mb-1">
                {lang === "ar" ? "المعرف" : "Slug"}
              </div>
              <div className="text-sm font-mono text-slate-700">{org?.slug ?? "—"}</div>
            </div>
          </div>
        )}
      </div>

      {/* Account */}
      <div className="rounded-2xl bg-white border border-slate-200 p-6 mb-4">
        <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-4">
          {lang === "ar" ? "الحساب" : "Account"}
        </h2>
        {loading ? (
          <div className="h-16 bg-slate-100 rounded animate-pulse" />
        ) : (
          <div className="space-y-3">
            <div>
              <div className="text-xs text-slate-500 mb-1">
                {lang === "ar" ? "الاسم" : "Name"}
              </div>
              <div className="text-sm font-medium text-slate-900">{me?.full_name ?? "—"}</div>
            </div>
            <div>
              <div className="text-xs text-slate-500 mb-1">
                {lang === "ar" ? "البريد" : "Email"}
              </div>
              <div className="text-sm text-slate-700">{me?.email ?? "—"}</div>
            </div>
            <div>
              <div className="text-xs text-slate-500 mb-1">
                {lang === "ar" ? "الدور" : "Role"}
              </div>
              <div className="text-sm text-slate-700">{me?.role ?? "—"}</div>
            </div>
          </div>
        )}
      </div>

      {/* Coming soon */}
      <div className="rounded-2xl bg-sky-50 border border-sky-200 p-6">
        <div className="flex items-start gap-3">
          <span className="w-9 h-9 rounded-lg bg-sky-100 text-sky-600 flex items-center justify-center shrink-0">
            <Icon d={icons.settings} size={18} />
          </span>
          <div>
            <div className="text-sm font-semibold text-sky-900 mb-1">
              {lang === "ar" ? "قريباً" : "Coming soon"}
            </div>
            <p className="text-xs text-sky-700 leading-relaxed">
              {lang === "ar"
                ? "تعديل بيانات الشركة، الشعار، إعدادات GPS، والإشعارات."
                : "Edit organization info, logo, GPS radius, and notifications."}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
'''
(root / "settings" / "page.tsx").parent.mkdir(parents=True, exist_ok=True)
(root / "settings" / "page.tsx").write_text(settings, encoding="utf-8")
print("OK - settings/page.tsx")

# ============ REPORTS PAGE ============
reports = r'''"use client";

import { useEffect, useState } from "react";
import { getAllDoctors, getMyVisits, Doctor } from "@/lib/api";
import { useLanguage } from "@/lib/language-context";
import { Icon, icons } from "@/components/ui/Icons";

export default function ReportsPage() {
  const { lang } = useLanguage();
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [visits, setVisits] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

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

  const bySpec = doctors.reduce((acc: Record<string, number>, d) => {
    const s = (d.specialty || "أخرى").trim();
    acc[s] = (acc[s] || 0) + 1;
    return acc;
  }, {});
  const topSpecs = Object.entries(bySpec)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8);

  const completed = visits.filter((v) => v.status === "COMPLETED").length;
  const active = visits.filter((v) => v.status === "CHECKED_IN").length;

  return (
    <div className="max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-slate-900 tracking-tight">
          {lang === "ar" ? "التقارير" : "Reports"}
        </h1>
        <p className="mt-1 text-slate-600 text-sm">
          {lang === "ar" ? "نظرة عامة على النشاط الميداني" : "Overview of field activity"}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="rounded-2xl bg-white border border-slate-200 p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="w-9 h-9 rounded-lg bg-sky-50 text-sky-600 flex items-center justify-center">
              <Icon d={icons.doctors} size={18} />
            </span>
          </div>
          <div className="text-3xl font-bold text-slate-900 tabular-nums">
            {loading ? "—" : doctors.length}
          </div>
          <div className="text-xs text-slate-500 mt-1">
            {lang === "ar" ? "إجمالي الأطباء" : "Total doctors"}
          </div>
        </div>

        <div className="rounded-2xl bg-white border border-slate-200 p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="w-9 h-9 rounded-lg bg-teal-50 text-teal-600 flex items-center justify-center">
              <Icon d={icons.visits} size={18} />
            </span>
          </div>
          <div className="text-3xl font-bold text-slate-900 tabular-nums">
            {loading ? "—" : completed}
          </div>
          <div className="text-xs text-slate-500 mt-1">
            {lang === "ar" ? "زيارات مكتملة" : "Completed visits"}
          </div>
        </div>

        <div className="rounded-2xl bg-white border border-slate-200 p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="w-9 h-9 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
              <Icon d={icons.visits} size={18} />
            </span>
          </div>
          <div className="text-3xl font-bold text-slate-900 tabular-nums">
            {loading ? "—" : active}
          </div>
          <div className="text-xs text-slate-500 mt-1">
            {lang === "ar" ? "زيارات نشطة" : "Active visits"}
          </div>
        </div>
      </div>

      <div className="rounded-2xl bg-white border border-slate-200 p-6 mb-4">
        <h2 className="text-sm font-semibold text-slate-700 mb-4">
          {lang === "ar" ? "الأطباء حسب التخصص" : "Doctors by specialty"}
        </h2>
        {loading ? (
          <div className="h-32 bg-slate-100 rounded animate-pulse" />
        ) : topSpecs.length === 0 ? (
          <div className="text-sm text-slate-500 text-center py-8">
            {lang === "ar" ? "لا توجد بيانات بعد" : "No data yet"}
          </div>
        ) : (
          <div className="space-y-3">
            {topSpecs.map(([spec, count]) => {
              const pct = Math.round((count / doctors.length) * 100);
              return (
                <div key={spec}>
                  <div className="flex items-center justify-between text-xs mb-1.5">
                    <span className="font-medium text-slate-700">{spec}</span>
                    <span className="text-slate-500 tabular-nums">
                      {count} ({pct}%)
                    </span>
                  </div>
                  <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-sky-500 to-teal-500 rounded-full transition-all"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="rounded-2xl bg-sky-50 border border-sky-200 p-6">
        <div className="flex items-start gap-3">
          <span className="w-9 h-9 rounded-lg bg-sky-100 text-sky-600 flex items-center justify-center shrink-0">
            <Icon d={icons.reports} size={18} />
          </span>
          <div>
            <div className="text-sm font-semibold text-sky-900 mb-1">
              {lang === "ar" ? "تقارير متقدمة قريباً" : "Advanced reports soon"}
            </div>
            <p className="text-xs text-sky-700 leading-relaxed">
              {lang === "ar"
                ? "تصدير PDF / Excel، فلترة بالتاريخ، وتقارير تفصيلية لكل مندوب."
                : "PDF/Excel export, date filters, and per-rep detailed reports."}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
'''
(root / "reports" / "page.tsx").parent.mkdir(parents=True, exist_ok=True)
(root / "reports" / "page.tsx").write_text(reports, encoding="utf-8")
print("OK - reports/page.tsx")
print("Done!")