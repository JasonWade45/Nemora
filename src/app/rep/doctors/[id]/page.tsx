"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { doctorDisplayName, getDoctor, buildMapsUrl, apiFetch } from "@/lib/api";
import { Icon, icons } from "@/components/ui/Icons";

const DoctorMiniMap = dynamic(
  () => import("@/components/map/DoctorMiniMap").then((m) => m.DoctorMiniMap),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-full flex items-center justify-center bg-slate-100">
        <div className="text-xs text-slate-500">...</div>
      </div>
    ),
  }
);

const HIDDEN_MARKER = "\n\n---HIDDEN---\n";

function extractNotes(raw) {
  if (!raw) return { user: "", hidden: "" };
  const s = String(raw);
  if (s.startsWith("OSM/GMaps import")) return { user: "", hidden: s };
  if (s.includes(HIDDEN_MARKER)) {
    const idx = s.indexOf(HIDDEN_MARKER);
    return { user: s.slice(0, idx), hidden: s.slice(idx + HIDDEN_MARKER.length) };
  }
  return { user: s, hidden: "" };
}

function combineNotes(user, hidden) {
  const u = (user || "").trim();
  const h = (hidden || "").trim();
  if (!u && !h) return "";
  if (!u) return h;
  if (!h) return u;
  return u + HIDDEN_MARKER + h;
}

function initials(name) {
  const parts = name
    .replace(/^(د\.?|د\/|دكتور|دكتورة|Dr\.?|Doctor)\s*/i, "")
    .split(/\s+/)
    .filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2);
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

export default function RepDoctorProfilePage() {
  const params = useParams();
  const id = params && params.id;
  const [doctor, setDoctor] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [myNotes, setMyNotes] = useState("");
  const [hiddenNotes, setHiddenNotes] = useState("");
  const [editingNotes, setEditingNotes] = useState(false);
  const [savingNotes, setSavingNotes] = useState(false);
  const [saveToast, setSaveToast] = useState(false);

  useEffect(() => {
    if (!id) return;
    (async () => {
      try {
        const d = await getDoctor(id);
        setDoctor(d);
        const parsed = extractNotes(d.notes);
        setMyNotes(parsed.user);
        setHiddenNotes(parsed.hidden);
      } catch (e) {
        setError((e && e.message) || "Failed to load doctor");
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  async function saveMyNotes() {
    if (!doctor) return;
    setSavingNotes(true);
    try {
      const combined = combineNotes(myNotes, hiddenNotes);
      await apiFetch("/api/doctors/" + doctor.id, {
        method: "PATCH",
        body: JSON.stringify({ notes: combined }),
      });
      setDoctor({ ...doctor, notes: combined });
      setEditingNotes(false);
      setSaveToast(true);
      setTimeout(() => setSaveToast(false), 2000);
    } catch (e) {
      alert((e && e.message) || "Failed to save");
    } finally {
      setSavingNotes(false);
    }
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-32 bg-slate-100 rounded animate-pulse" />
        <div className="h-40 bg-slate-100 rounded-2xl animate-pulse" />
        <div className="h-64 bg-slate-100 rounded-2xl animate-pulse" />
      </div>
    );
  }

  if (error || !doctor) {
    return (
      <div className="space-y-4">
        <Link
          href="/rep/my-doctors"
          className="inline-flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900"
        >
          <span className="rtl:rotate-180">
            <Icon d={icons.arrow_left} size={16} />
          </span>
          رجوع
        </Link>
        <div className="rounded-2xl bg-red-50 border border-red-200 px-6 py-8 text-center">
          <div className="text-red-700 font-medium mb-1">تعذّر تحميل بيانات الطبيب</div>
          <p className="text-sm text-red-600">{error}</p>
        </div>
      </div>
    );
  }

  const name = doctorDisplayName(doctor);
  const hasLocation = doctor.latitude != null && doctor.longitude != null;
  const mapsUrl = buildMapsUrl(doctor);

  return (
    <div className="space-y-4 pb-4">
      {saveToast && (
        <div className="fixed top-20 start-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-full bg-teal-500 text-white text-xs font-medium shadow-lg">
          ✓ تم حفظ ملاحظاتك
        </div>
      )}

      <Link
        href="/rep/my-doctors"
        className="inline-flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900"
      >
        <span className="rtl:rotate-180">
          <Icon d={icons.arrow_left} size={16} />
        </span>
        رجوع
      </Link>

      <div className="rounded-2xl bg-gradient-to-br from-slate-900 to-slate-800 text-white p-5 relative overflow-hidden">
        <div className="absolute -top-16 -end-16 w-56 h-56 bg-sky-500/20 rounded-full blur-3xl" />
        <div className="relative flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-sky-500 to-teal-500 flex items-center justify-center text-white font-bold text-xl shrink-0 shadow-lg">
            {initials(name)}
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-lg font-bold leading-tight">{name}</h1>
            <div className="mt-2 flex flex-wrap gap-1.5 text-[11px]">
              {doctor.specialty && (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full bg-white/10 backdrop-blur border border-white/20">
                  {doctor.specialty}
                </span>
              )}
              {doctor.priority && (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full bg-amber-500/20 border border-amber-400/30 text-amber-200">
                  {doctor.priority}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {doctor.phone && (
          <a
            href={"tel:" + doctor.phone}
            className="flex items-center gap-3 p-3 rounded-2xl bg-white border border-slate-200 hover:border-teal-300 hover:bg-teal-50/30 transition"
          >
            <span className="w-10 h-10 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center shrink-0">
              <Icon d={icons.phone} size={17} />
            </span>
            <div className="flex-1 min-w-0">
              <div className="text-[10px] text-slate-500">اتصال</div>
              <div
                dir="ltr"
                className="text-xs font-semibold text-slate-900 tabular-nums truncate text-start"
              >
                {doctor.phone}
              </div>
            </div>
          </a>
        )}

        <a
          href={mapsUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-3 p-3 rounded-2xl bg-gradient-to-r from-sky-500 to-teal-500 text-white hover:from-sky-600 hover:to-teal-600 transition shadow-md shadow-sky-500/20"
        >
          <span className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
            <Icon d={icons.navigation} size={17} />
          </span>
          <div className="flex-1 min-w-0">
            <div className="text-[10px] text-white/80">اتجاهات</div>
            <div className="text-xs font-semibold">وصّلني</div>
          </div>
        </a>
      </div>

      {(doctor.address || doctor.city) && (
        <div className="rounded-2xl bg-white border border-slate-200 p-4">
          <div className="flex items-start gap-3">
            <span className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
              <Icon d={icons.pin} size={17} />
            </span>
            <div className="flex-1 min-w-0">
              <div className="text-[10px] text-slate-500 mb-0.5">العنوان</div>
              <div className="text-sm font-medium text-slate-900 leading-relaxed">
                {[doctor.address, doctor.city, doctor.state]
                  .filter(Boolean)
                  .join("، ")}
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="rounded-2xl bg-white border border-slate-200 overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between">
          <h2 className="text-xs font-semibold text-slate-700">الموقع على الخريطة</h2>
          {hasLocation && (
            <span dir="ltr" className="text-[10px] text-slate-400 tabular-nums">
              {doctor.latitude.toFixed(4)}, {doctor.longitude.toFixed(4)}
            </span>
          )}
        </div>
        <div className="h-56">
          {hasLocation ? (
            <DoctorMiniMap
              latitude={doctor.latitude}
              longitude={doctor.longitude}
              label={name}
            />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center bg-slate-50 text-center px-6">
              <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 mb-3">
                <Icon d={icons.pin} size={22} />
              </div>
              <div className="text-sm font-medium text-slate-700 mb-1">
                لا يوجد إحداثيات محفوظة
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="rounded-2xl bg-white border border-amber-200 overflow-hidden">
        <div className="px-4 py-3 border-b border-amber-100 flex items-center justify-between bg-gradient-to-r from-amber-50 to-transparent">
          <div className="flex items-center gap-2">
            <span className="w-7 h-7 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
                <line x1="16" y1="13" x2="8" y2="13" />
                <line x1="16" y1="17" x2="8" y2="17" />
              </svg>
            </span>
            <h2 className="text-xs font-semibold text-amber-900">ملاحظاتي</h2>
          </div>
          {!editingNotes && myNotes && (
            <button
              onClick={() => setEditingNotes(true)}
              className="text-[11px] font-medium text-amber-700 hover:text-amber-900 px-2 py-1 rounded-md hover:bg-amber-100 transition"
            >
              تعديل
            </button>
          )}
        </div>

        <div className="p-4">
          {editingNotes ? (
            <div className="space-y-3">
              <textarea
                value={myNotes}
                onChange={(e) => setMyNotes(e.target.value)}
                rows={5}
                placeholder="اكتب ملاحظاتك عن الدكتور هنا..."
                className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-400 transition resize-none"
              />
              <div className="flex gap-2">
                <button
                  onClick={saveMyNotes}
                  disabled={savingNotes}
                  className="flex-1 px-4 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 disabled:bg-slate-400 text-white text-xs font-medium transition"
                >
                  {savingNotes ? "جاري الحفظ..." : "حفظ"}
                </button>
                <button
                  onClick={() => {
                    const parsed = extractNotes(doctor.notes);
                    setMyNotes(parsed.user);
                    setEditingNotes(false);
                  }}
                  disabled={savingNotes}
                  className="px-4 py-2 rounded-lg bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-medium transition"
                >
                  إلغاء
                </button>
              </div>
            </div>
          ) : myNotes ? (
            <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap break-words">
              {myNotes}
            </p>
          ) : (
            <div className="text-center py-4">
              <p className="text-xs text-slate-400 mb-2">لا توجد ملاحظات بعد</p>
              <button
                onClick={() => setEditingNotes(true)}
                className="text-[11px] font-medium text-amber-700 hover:text-amber-900 underline"
              >
                أضف أول ملاحظة
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
