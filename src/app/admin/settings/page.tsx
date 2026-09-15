"use client";

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
