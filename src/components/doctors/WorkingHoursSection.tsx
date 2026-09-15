"use client";

import { useEffect, useState } from "react";
import { apiFetch, Doctor } from "@/lib/api";
import { useLanguage } from "@/lib/language-context";
import { Icon, icons } from "@/components/ui/Icons";

const DAYS = [
  { key: "sat", ar: "السبت",     en: "Saturday"  },
  { key: "sun", ar: "الأحد",     en: "Sunday"    },
  { key: "mon", ar: "الإثنين",   en: "Monday"    },
  { key: "tue", ar: "الثلاثاء",  en: "Tuesday"   },
  { key: "wed", ar: "الأربعاء",  en: "Wednesday" },
  { key: "thu", ar: "الخميس",    en: "Thursday"  },
  { key: "fri", ar: "الجمعة",    en: "Friday"    },
];

type WorkingHours = Record<string, string | null>;

function parseRange(value: string | null): { from: string; to: string; open: boolean } {
  if (!value) return { from: "16:00", to: "22:00", open: false };
  const m = value.match(/^(\d{1,2}:\d{2})\s*-\s*(\d{1,2}:\d{2})$/);
  if (!m) return { from: "16:00", to: "22:00", open: false };
  return { from: m[1], to: m[2], open: true };
}

export function WorkingHoursSection({ doctor }: { doctor: Doctor }) {
  const { lang } = useLanguage();
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hours, setHours] = useState<WorkingHours>({});

  useEffect(() => {
    setHours(doctor.working_hours ?? {});
  }, [doctor.working_hours]);

  function updateDay(key: string, patch: Partial<{ from: string; to: string; open: boolean }>) {
    const current = parseRange(hours[key] ?? null);
    const next = { ...current, ...patch };
    setHours(h => ({ ...h, [key]: next.open ? `${next.from}-${next.to}` : null }));
  }

  async function handleSave() {
    setSaving(true);
    setError(null);
    try {
      await apiFetch(`/api/doctors/${doctor.id}`, {
        method: "PATCH",
        body: JSON.stringify({ working_hours: hours }),
      });
      setEditing(false);
    } catch (e: any) {
      setError(e.message || "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  function handleCancel() {
    setHours(doctor.working_hours ?? {});
    setEditing(false);
    setError(null);
  }

  const hasAny = DAYS.some(d => hours[d.key]);

  return (
    <div className="rounded-2xl bg-white border border-slate-200 overflow-hidden">
      <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold text-slate-700">
            {lang === "ar" ? "مواعيد العمل" : "Working hours"}
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            {lang === "ar" ? "الجدول الأسبوعي للعيادة" : "Weekly clinic schedule"}
          </p>
        </div>
        {!editing && (
          <button
            onClick={() => setEditing(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-sky-600 hover:bg-sky-50 transition"
          >
            <Icon d={icons.settings} size={14} />
            {lang === "ar" ? "تعديل" : "Edit"}
          </button>
        )}
      </div>

      <div className="p-4">
        {error && (
          <div className="mb-3 rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-xs text-red-700">
            {error}
          </div>
        )}

        <div className="space-y-1.5">
          {DAYS.map(day => {
            const r = parseRange(hours[day.key] ?? null);
            const label = lang === "ar" ? day.ar : day.en;
            return (
              <div key={day.key} className="flex items-center gap-3 py-1.5">
                <div className="w-20 shrink-0 text-xs font-medium text-slate-700">
                  {label}
                </div>

                {editing ? (
                  <>
                    <button
                      type="button"
                      onClick={() => updateDay(day.key, { open: !r.open })}
                      className={`relative inline-flex h-5 w-9 shrink-0 rounded-full transition ${r.open ? "bg-teal-500" : "bg-slate-300"}`}
                    >
                      <span className={`inline-block h-4 w-4 mt-0.5 rounded-full bg-white shadow transition ${r.open ? "translate-x-4 rtl:-translate-x-4" : "translate-x-0.5 rtl:-translate-x-0.5"}`} />
                    </button>

                    {r.open ? (
                      <div className="flex items-center gap-2 flex-1">
                        <input
                          type="time"
                          value={r.from}
                          onChange={e => updateDay(day.key, { from: e.target.value })}
                          className="text-xs border border-slate-200 rounded-lg px-2 py-1 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-400"
                        />
                        <span className="text-xs text-slate-400">→</span>
                        <input
                          type="time"
                          value={r.to}
                          onChange={e => updateDay(day.key, { to: e.target.value })}
                          className="text-xs border border-slate-200 rounded-lg px-2 py-1 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-400"
                        />
                      </div>
                    ) : (
                      <span className="text-xs text-slate-400 italic">
                        {lang === "ar" ? "مقفول" : "Closed"}
                      </span>
                    )}
                  </>
                ) : (
                  <>
                    {r.open ? (
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-teal-500" />
                        <span className="text-xs font-medium text-slate-900 tabular-nums" dir="ltr">
                          {r.from} — {r.to}
                        </span>
                      </div>
                    ) : (
                      <span className="text-xs text-slate-400">
                        {lang === "ar" ? "مقفول" : "Closed"}
                      </span>
                    )}
                  </>
                )}
              </div>
            );
          })}
        </div>

        {!editing && !hasAny && (
          <div className="mt-4 pt-4 border-t border-slate-100 text-center text-xs text-slate-500">
            {lang === "ar"
              ? "لم تُسجّل مواعيد بعد. اضغط \"تعديل\" لإضافتها."
              : "No hours recorded yet. Click \"Edit\" to add them."}
          </div>
        )}

        {editing && (
          <div className="mt-4 pt-4 border-t border-slate-100 flex items-center gap-2">
            <button
              onClick={handleSave}
              disabled={saving}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 disabled:bg-slate-400 text-white text-xs font-medium transition"
            >
              <Icon d={icons.check} size={13} />
              {saving
                ? (lang === "ar" ? "جاري الحفظ..." : "Saving...")
                : (lang === "ar" ? "حفظ" : "Save")}
            </button>
            <button
              onClick={handleCancel}
              disabled={saving}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-medium transition"
            >
              <Icon d={icons.close} size={13} />
              {lang === "ar" ? "إلغاء" : "Cancel"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}