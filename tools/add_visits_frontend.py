import pathlib

frontend = pathlib.Path(r"C:\Users\ATG\Documents\Default Project\pharma-crm\src")
app = frontend / "app"

# ============ 1) Update api.ts — add/update visit functions ============
api_file = frontend / "lib" / "api.ts"
content = api_file.read_text(encoding="utf-8")

# Remove old visit section if exists
if "// ============ Rep-specific ============" in content:
    idx = content.index("// ============ Rep-specific ============")
    content = content[:idx]

# Append new visit functions
content += '''// ============ Visits ============

export type Visit = {
  id: string;
  organization_id: string;
  rep_id: string;
  doctor_id: string;
  doctor_name?: string | null;
  doctor_specialty?: string | null;
  doctor_phone?: string | null;
  doctor_address?: string | null;
  doctor_latitude?: number | null;
  doctor_longitude?: number | null;
  visit_purpose: string;
  status: string;
  planned_at?: string | null;
  checked_in_at?: string | null;
  checked_out_at?: string | null;
  duration_minutes?: number | null;
  checkin_latitude?: number | null;
  checkin_longitude?: number | null;
  checkout_latitude?: number | null;
  checkout_longitude?: number | null;
  distance_from_doctor?: number | null;
  is_verified: boolean;
  doctor_response?: string | null;
  notes?: string | null;
  next_follow_up_date?: string | null;
  next_follow_up_type?: string | null;
  next_follow_up_notes?: string | null;
  created_at: string;
  updated_at: string;
};

export async function getVisits(params?: { status?: string; doctor_id?: string }): Promise<{ items: Visit[]; total: number }> {
  const q = new URLSearchParams();
  if (params?.status) q.set("status", params.status);
  if (params?.doctor_id) q.set("doctor_id", params.doctor_id);
  const suffix = q.toString() ? "?" + q.toString() : "";
  return apiFetch("/api/visits" + suffix);
}

export async function getActiveVisit(): Promise<Visit | null> {
  return apiFetch("/api/visits/active");
}

export async function getVisit(id: string): Promise<Visit> {
  return apiFetch("/api/visits/" + id);
}

export async function createVisit(payload: {
  doctor_id: string;
  visit_purpose?: string;
  planned_at?: string | null;
  notes?: string | null;
}): Promise<Visit> {
  return apiFetch("/api/visits", {
    method: "POST",
    body: JSON.stringify({
      doctor_id: payload.doctor_id,
      visit_purpose: payload.visit_purpose || "DETAILING",
      planned_at: payload.planned_at || null,
      notes: payload.notes || null,
    }),
  });
}

export async function checkInVisit(visitId: string, latitude: number, longitude: number, accuracy?: number): Promise<Visit> {
  return apiFetch("/api/visits/" + visitId + "/check-in", {
    method: "POST",
    body: JSON.stringify({ latitude, longitude, accuracy: accuracy ?? null }),
  });
}

export async function checkOutVisit(visitId: string, payload: {
  latitude: number;
  longitude: number;
  accuracy?: number;
  notes?: string | null;
  doctor_response?: string | null;
  next_follow_up_date?: string | null;
  next_follow_up_type?: string | null;
  next_follow_up_notes?: string | null;
}): Promise<Visit> {
  return apiFetch("/api/visits/" + visitId + "/check-out", {
    method: "POST",
    body: JSON.stringify({
      latitude: payload.latitude,
      longitude: payload.longitude,
      accuracy: payload.accuracy ?? null,
      notes: payload.notes ?? null,
      doctor_response: payload.doctor_response ?? null,
      next_follow_up_date: payload.next_follow_up_date ?? null,
      next_follow_up_type: payload.next_follow_up_type ?? null,
      next_follow_up_notes: payload.next_follow_up_notes ?? null,
    }),
  });
}

export async function updateVisit(id: string, payload: { visit_purpose?: string; planned_at?: string | null; notes?: string | null }): Promise<Visit> {
  return apiFetch("/api/visits/" + id, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

// ============ Shifts ============

export type ShiftInfo = {
  id: string;
  user_id: string;
  status: string;
  started_at: string;
  ended_at: string | null;
  notes: string | null;
};

export type ShiftCurrentResponse = {
  active: boolean;
  shift: ShiftInfo | null;
};

export async function getCurrentShift(): Promise<ShiftCurrentResponse> {
  return apiFetch("/api/shifts/current");
}

export async function startShift(notes?: string): Promise<ShiftInfo> {
  return apiFetch("/api/shifts/start", {
    method: "POST",
    body: JSON.stringify({ notes: notes ?? null }),
  });
}

export async function endShift(notes?: string): Promise<ShiftInfo> {
  return apiFetch("/api/shifts/end", {
    method: "POST",
    body: JSON.stringify({ notes: notes ?? null }),
  });
}

export async function sendLocationPing(latitude: number, longitude: number, accuracy?: number) {
  return apiFetch("/api/location/ping", {
    method: "POST",
    body: JSON.stringify({ latitude, longitude, accuracy: accuracy ?? null }),
  });
}
'''

api_file.write_text(content, encoding="utf-8")
print("OK - api.ts updated with visits + shifts")

# ============ 2) Visits list page ============
visits_dir = app / "rep" / "visits"
visits_dir.mkdir(parents=True, exist_ok=True)

list_page = visits_dir / "page.tsx"
list_page.write_text(r'''"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Visit, getActiveVisit, getVisits } from "@/lib/api";
import { Icon, icons } from "@/components/ui/Icons";

function fmtTime(dt) {
  if (!dt) return "—";
  try {
    return new Date(dt).toLocaleTimeString("ar-EG", { hour: "2-digit", minute: "2-digit" });
  } catch { return "—"; }
}

function fmtDate(dt) {
  if (!dt) return "—";
  try {
    return new Date(dt).toLocaleDateString("ar-EG", { day: "numeric", month: "short" });
  } catch { return "—"; }
}

function isToday(dt) {
  if (!dt) return false;
  try {
    return new Date(dt).toDateString() === new Date().toDateString();
  } catch { return false; }
}

const STATUS_META = {
  PLANNED: { ar: "مخططة", color: "bg-slate-100 text-slate-700 border-slate-200", dot: "bg-slate-400" },
  CHECKED_IN: { ar: "نشطة", color: "bg-amber-100 text-amber-700 border-amber-200", dot: "bg-amber-500" },
  COMPLETED: { ar: "مكتملة", color: "bg-teal-100 text-teal-700 border-teal-200", dot: "bg-teal-500" },
  MISSED: { ar: "فائتة", color: "bg-red-100 text-red-700 border-red-200", dot: "bg-red-500" },
  CANCELLED: { ar: "ملغاة", color: "bg-slate-100 text-slate-500 border-slate-200", dot: "bg-slate-300" },
};

function statusMeta(s) {
  return STATUS_META[s] || STATUS_META.PLANNED;
}

export default function VisitsListPage() {
  const [visits, setVisits] = useState([]);
  const [active, setActive] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("today");

  useEffect(() => {
    (async () => {
      try {
        const [res, act] = await Promise.all([
          getVisits().catch(() => ({ items: [], total: 0 })),
          getActiveVisit().catch(() => null),
        ]);
        setVisits(res.items || []);
        setActive(act);
      } catch {}
      setLoading(false);
    })();
  }, []);

  const filtered = useMemo(() => {
    if (tab === "today") {
      return visits.filter((v) => isToday(v.checked_in_at) || isToday(v.planned_at) || isToday(v.created_at));
    }
    if (tab === "completed") return visits.filter((v) => v.status === "COMPLETED");
    if (tab === "planned") return visits.filter((v) => v.status === "PLANNED");
    return visits;
  }, [visits, tab]);

  const todayCount = visits.filter((v) => isToday(v.checked_in_at) || isToday(v.planned_at)).length;
  const completedCount = visits.filter((v) => v.status === "COMPLETED").length;
  const plannedCount = visits.filter((v) => v.status === "PLANNED").length;

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">زياراتي</h1>
          <p className="text-sm text-slate-600 mt-0.5">
            {loading ? "جاري التحميل..." : visits.length + " زيارة"}
          </p>
        </div>
        <Link
          href="/rep/visits/new"
          className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold transition shadow-sm shrink-0"
        >
          <Icon d={icons.plus} size={14} />
          زيارة جديدة
        </Link>
      </div>

      {active && (
        <Link
          href={"/rep/visits/" + active.id}
          className="block rounded-2xl bg-gradient-to-br from-amber-500 to-orange-500 text-white p-4 shadow-lg shadow-amber-500/20 hover:shadow-amber-500/40 transition"
        >
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-full bg-white/20 flex items-center justify-center shrink-0">
              <span className="w-3 h-3 rounded-full bg-white animate-pulse" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[11px] font-medium text-white/90">زيارة نشطة الآن</div>
              <div className="text-sm font-bold truncate mt-0.5">{active.doctor_name || "زيارة"}</div>
              <div className="text-[11px] text-white/80 mt-0.5">
                بدأت {fmtTime(active.checked_in_at)}
              </div>
            </div>
            <span className="rtl:rotate-180 shrink-0 text-white/80">
              <Icon d={icons.chevron} size={20} />
            </span>
          </div>
        </Link>
      )}

      <div className="flex gap-2">
        {[
          { key: "today", label: "اليوم", count: todayCount },
          { key: "planned", label: "مخططة", count: plannedCount },
          { key: "completed", label: "مكتملة", count: completedCount },
          { key: "all", label: "الكل", count: visits.length },
        ].map((t) => {
          const on = tab === t.key;
          return (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={
                "inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold transition border " +
                (on
                  ? "bg-sky-500 text-white border-sky-500 shadow-sm"
                  : "bg-white text-slate-600 border-slate-200 hover:border-sky-300")
              }
            >
              {t.label}
              <span className={"text-[10px] tabular-nums " + (on ? "text-white/80" : "text-slate-400")}>
                {t.count}
              </span>
            </button>
          );
        })}
      </div>

      {loading ? (
        <div className="space-y-2.5">
          {[1, 2, 3].map((i) => (
            <div key={i} className="rounded-2xl bg-white border border-slate-200 p-4">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-xl bg-slate-100 animate-pulse" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-40 bg-slate-100 rounded animate-pulse" />
                  <div className="h-3 w-24 bg-slate-100 rounded animate-pulse" />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl bg-white border border-slate-200 p-12 text-center">
          <div className="w-14 h-14 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 mx-auto mb-4">
            <Icon d={icons.visits} size={26} />
          </div>
          <div className="text-base font-semibold text-slate-900 mb-1">لا توجد زيارات</div>
          <p className="text-xs text-slate-500 mb-4">ابدأ زيارتك الأولى من هنا</p>
          <Link
            href="/rep/visits/new"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-medium transition"
          >
            <Icon d={icons.plus} size={14} />
            زيارة جديدة
          </Link>
        </div>
      ) : (
        <div className="space-y-2.5">
          {filtered.map((v) => {
            const meta = statusMeta(v.status);
            return (
              <Link
                key={v.id}
                href={"/rep/visits/" + v.id}
                className="group block rounded-2xl bg-white border border-slate-200 p-4 hover:border-sky-300 hover:shadow-lg hover:shadow-sky-500/5 transition-all"
              >
                <div className="flex items-start gap-3.5">
                  <div className={"w-11 h-11 rounded-xl flex items-center justify-center shrink-0 " + meta.color}>
                    <Icon d={icons.visits} size={18} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <h3 className="text-sm font-bold text-slate-900 truncate group-hover:text-sky-700 transition">
                          {v.doctor_name || "زيارة"}
                        </h3>
                        {v.doctor_specialty && (
                          <div className="text-[11px] text-slate-500 mt-0.5">{v.doctor_specialty}</div>
                        )}
                      </div>
                      <span className={"inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border shrink-0 " + meta.color}>
                        <span className={"w-1.5 h-1.5 rounded-full " + meta.dot} />
                        {meta.ar}
                      </span>
                    </div>

                    <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-slate-500">
                      {v.status === "COMPLETED" && v.duration_minutes != null && (
                        <span className="inline-flex items-center gap-1">
                          <Icon d={icons.dashboard} size={11} />
                          {v.duration_minutes} دقيقة
                        </span>
                      )}
                      {v.checked_in_at && (
                        <span className="inline-flex items-center gap-1">
                          <Icon d={icons.visits} size={11} />
                          بدأت {fmtTime(v.checked_in_at)}
                        </span>
                      )}
                      {!v.checked_in_at && v.planned_at && (
                        <span className="inline-flex items-center gap-1">
                          <Icon d={icons.visits} size={11} />
                          مخططة {fmtDate(v.planned_at)} · {fmtTime(v.planned_at)}
                        </span>
                      )}
                      {v.distance_from_doctor != null && v.is_verified && (
                        <span className="inline-flex items-center gap-1 text-teal-600 font-medium">
                          <Icon d={icons.check} size={11} />
                          موثقة GPS
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
''', encoding="utf-8")
print("OK - /rep/visits list page")

# ============ 3) New visit — pick a doctor ============
new_page = visits_dir / "new" / "page.tsx"
new_page.parent.mkdir(parents=True, exist_ok=True)
new_page.write_text(r'''"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Doctor, createVisit, doctorDisplayName, getAllDoctors } from "@/lib/api";
import { Icon, icons } from "@/components/ui/Icons";

function initials(name) {
  const parts = name.replace(/^(د\.?|د\/|دكتور|دكتورة|Dr\.?|Doctor)\s*/i, "").split(/\s+/).filter(Boolean);
  if (!parts.length) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2);
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

const PURPOSES = [
  { value: "DETAILING", ar: "تعريف بالمنتج" },
  { value: "FOLLOW_UP", ar: "متابعة" },
  { value: "PRODUCT_LAUNCH", ar: "إطلاق منتج" },
  { value: "SAMPLE_DELIVERY", ar: "تسليم عينات" },
  { value: "MEDICAL_EDUCATION", ar: "تعليم طبي" },
  { value: "RELATIONSHIP_BUILDING", ar: "بناء علاقة" },
];

export default function NewVisitPage() {
  const router = useRouter();
  const [doctors, setDoctors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState(null);
  const [purpose, setPurpose] = useState("DETAILING");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        const all = await getAllDoctors();
        setDoctors(all);
      } catch {}
      setLoading(false);
    })();
  }, []);

  const filtered = useMemo(() => {
    if (!search.trim()) return doctors;
    const q = search.trim().toLowerCase();
    return doctors.filter(
      (d) =>
        doctorDisplayName(d).toLowerCase().includes(q) ||
        (d.specialty || "").toLowerCase().includes(q) ||
        (d.phone || "").toLowerCase().includes(q)
    );
  }, [doctors, search]);

  async function handleCreate() {
    if (!selected) return;
    setCreating(true);
    setError(null);
    try {
      const v = await createVisit({
        doctor_id: selected.id,
        visit_purpose: purpose,
      });
      router.push("/rep/visits/" + v.id);
    } catch (e) {
      let msg = (e && e.message) || "Failed";
      try { msg = JSON.parse(msg).detail || msg; } catch {}
      setError(msg);
      setCreating(false);
    }
  }

  return (
    <div className="space-y-4">
      <Link
        href="/rep/visits"
        className="inline-flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900"
      >
        <span className="rtl:rotate-180"><Icon d={icons.arrow_left} size={16} /></span>
        رجوع
      </Link>

      <div>
        <h1 className="text-2xl font-bold text-slate-900">زيارة جديدة</h1>
        <p className="text-sm text-slate-600 mt-0.5">اختر الدكتور والغرض من الزيارة</p>
      </div>

      {/* Purpose */}
      <div className="rounded-2xl bg-white border border-slate-200 p-4">
        <div className="text-[11px] font-semibold text-slate-500 mb-2">الغرض من الزيارة</div>
        <div className="flex flex-wrap gap-1.5">
          {PURPOSES.map((p) => {
            const on = purpose === p.value;
            return (
              <button
                key={p.value}
                type="button"
                onClick={() => setPurpose(p.value)}
                className={
                  "inline-flex items-center px-3 py-1.5 rounded-full text-xs font-medium transition border " +
                  (on
                    ? "bg-sky-500 text-white border-sky-500"
                    : "bg-white text-slate-600 border-slate-200 hover:border-sky-300")
                }
              >
                {p.ar}
              </button>
            );
          })}
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <span className="absolute start-3 top-1/2 -translate-y-1/2 text-slate-400">
          <Icon d={icons.search} size={16} />
        </span>
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="ابحث عن دكتور..."
          className="w-full ps-9 pe-3 py-2.5 rounded-xl border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-400 transition"
        />
      </div>

      {/* Doctors list */}
      {loading ? (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="rounded-2xl bg-white border border-slate-200 p-3">
              <div className="h-10 bg-slate-100 rounded animate-pulse" />
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-2 max-h-[50vh] overflow-y-auto">
          {filtered.slice(0, 50).map((d) => {
            const on = selected && selected.id === d.id;
            const name = doctorDisplayName(d);
            return (
              <button
                key={d.id}
                type="button"
                onClick={() => setSelected(d)}
                className={
                  "w-full text-start rounded-xl bg-white border p-3 transition flex items-center gap-3 " +
                  (on
                    ? "border-sky-500 bg-sky-50/40 ring-2 ring-sky-500/20"
                    : "border-slate-200 hover:border-sky-300")
                }
              >
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-sky-500 to-teal-500 text-white flex items-center justify-center text-xs font-bold shrink-0">
                  {initials(name)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold text-slate-900 truncate">{name}</div>
                  {d.specialty && (
                    <div className="text-[11px] text-slate-500 truncate">{d.specialty}</div>
                  )}
                </div>
                {on && (
                  <span className="w-6 h-6 rounded-full bg-sky-500 text-white flex items-center justify-center shrink-0">
                    <Icon d={icons.check} size={13} />
                  </span>
                )}
              </button>
            );
          })}
          {filtered.length === 0 && (
            <div className="rounded-xl bg-white border border-slate-200 p-6 text-center text-sm text-slate-500">
              لا توجد نتائج
            </div>
          )}
        </div>
      )}

      {error && (
        <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-xs text-red-700">
          {error}
        </div>
      )}

      <button
        onClick={handleCreate}
        disabled={!selected || creating}
        className={
          "w-full py-3 rounded-xl text-sm font-semibold transition " +
          (!selected || creating
            ? "bg-slate-200 text-slate-400 cursor-not-allowed"
            : "bg-gradient-to-r from-sky-500 to-teal-500 text-white hover:from-sky-600 hover:to-teal-600 shadow-lg shadow-sky-500/20")
        }
      >
        {creating
          ? "جاري الإنشاء..."
          : selected
          ? "ابدأ زيارة " + doctorDisplayName(selected)
          : "اختر دكتور أولاً"}
      </button>
    </div>
  );
}
''', encoding="utf-8")
print("OK - /rep/visits/new page")

# ============ 4) Visit detail page ============
detail_page = visits_dir / "[id]" / "page.tsx"
detail_page.parent.mkdir(parents=True, exist_ok=True)
detail_page.write_text(r'''"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { Visit, checkInVisit, checkOutVisit, getVisit } from "@/lib/api";
import { Icon, icons } from "@/components/ui/Icons";

function fmtTime(dt) {
  if (!dt) return "—";
  try { return new Date(dt).toLocaleTimeString("ar-EG", { hour: "2-digit", minute: "2-digit" }); }
  catch { return "—"; }
}

function fmtDistance(m) {
  if (m == null) return null;
  if (m < 1000) return Math.round(m) + " م";
  return (m / 1000).toFixed(2) + " كم";
}

function durationFrom(start) {
  if (!start) return "0:00";
  const diff = Math.floor((Date.now() - new Date(start).getTime()) / 1000);
  const m = Math.floor(diff / 60);
  const s = diff % 60;
  return m + ":" + String(s).padStart(2, "0");
}

const RESPONSES = [
  { value: "INTERESTED", ar: "مهتم" },
  { value: "NEUTRAL", ar: "محايد" },
  { value: "NOT_INTERESTED", ar: "غير مهتم" },
];

export default function VisitDetailPage() {
  const router = useRouter();
  const params = useParams();
  const id = params && params.id;

  const [visit, setVisit] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);
  const [tick, setTick] = useState(0);

  // Check-out form
  const [notes, setNotes] = useState("");
  const [response, setResponse] = useState("");
  const [followUpDate, setFollowUpDate] = useState("");
  const [followUpNotes, setFollowUpNotes] = useState("");
  const [showCheckout, setShowCheckout] = useState(false);

  async function load() {
    if (!id) return;
    try {
      const v = await getVisit(id);
      setVisit(v);
    } catch (e) {
      setError((e && e.message) || "Failed");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, [id]);

  // Timer tick
  useEffect(() => {
    if (!visit || visit.status !== "CHECKED_IN") return;
    const t = setInterval(() => setTick((x) => x + 1), 1000);
    return () => clearInterval(t);
  }, [visit]);

  function getPosition() {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) return reject(new Error("GPS غير مدعوم"));
      navigator.geolocation.getCurrentPosition(
        (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude, acc: pos.coords.accuracy }),
        (err) => reject(new Error(err.message || "فشل الوصول للموقع")),
        { enableHighAccuracy: true, timeout: 15000, maximumAge: 30000 }
      );
    });
  }

  async function handleCheckIn() {
    setBusy(true);
    setError(null);
    try {
      const pos = await getPosition();
      const updated = await checkInVisit(id, pos.lat, pos.lng, pos.acc);
      setVisit(updated);
    } catch (e) {
      let msg = (e && e.message) || "Failed";
      setError(msg);
    } finally {
      setBusy(false);
    }
  }

  async function handleCheckOut() {
    setBusy(true);
    setError(null);
    try {
      const pos = await getPosition();
      const updated = await checkOutVisit(id, {
        latitude: pos.lat,
        longitude: pos.lng,
        accuracy: pos.acc,
        notes: notes || null,
        doctor_response: response || null,
        next_follow_up_date: followUpDate ? new Date(followUpDate).toISOString() : null,
        next_follow_up_notes: followUpNotes || null,
      });
      setVisit(updated);
      setShowCheckout(false);
    } catch (e) {
      let msg = (e && e.message) || "Failed";
      try { msg = JSON.parse(msg).detail || msg; } catch {}
      setError(msg);
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-24 bg-slate-100 rounded animate-pulse" />
        <div className="h-40 bg-slate-100 rounded-2xl animate-pulse" />
        <div className="h-64 bg-slate-100 rounded-2xl animate-pulse" />
      </div>
    );
  }

  if (error && !visit) {
    return (
      <div className="space-y-4">
        <Link href="/rep/visits" className="inline-flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900">
          <span className="rtl:rotate-180"><Icon d={icons.arrow_left} size={16} /></span>
          رجوع
        </Link>
        <div className="rounded-2xl bg-red-50 border border-red-200 px-6 py-8 text-center">
          <div className="text-red-700 font-medium mb-1">تعذّر تحميل الزيارة</div>
          <p className="text-sm text-red-600">{error}</p>
        </div>
      </div>
    );
  }

  if (!visit) return null;

  const isActive = visit.status === "CHECKED_IN";
  const isPlanned = visit.status === "PLANNED";
  const isCompleted = visit.status === "COMPLETED";

  return (
    <div className="space-y-4 pb-4">
      <Link href="/rep/visits" className="inline-flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900">
        <span className="rtl:rotate-180"><Icon d={icons.arrow_left} size={16} /></span>
        رجوع
      </Link>

      {/* Doctor card */}
      <div className="rounded-2xl bg-white border border-slate-200 p-4">
        <div className="flex items-start gap-3">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-sky-500 to-teal-500 text-white flex items-center justify-center font-bold shrink-0">
            {visit.doctor_name ? visit.doctor_name.slice(0, 1) : "?"}
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-base font-bold text-slate-900 truncate">
              {visit.doctor_name || "دكتور"}
            </h1>
            {visit.doctor_specialty && (
              <div className="text-xs text-slate-500 mt-0.5">{visit.doctor_specialty}</div>
            )}
            {visit.doctor_address && (
              <div className="text-[11px] text-slate-500 mt-1 line-clamp-2">
                {visit.doctor_address}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Timer / status */}
      {isActive && (
        <div className="rounded-2xl bg-gradient-to-br from-amber-500 to-orange-500 text-white p-5 shadow-lg shadow-amber-500/20">
          <div className="text-[11px] font-medium text-white/90 mb-1">الزيارة نشطة</div>
          <div className="text-4xl font-bold tabular-nums tracking-wider" dir="ltr">
            {durationFrom(visit.checked_in_at)}
          </div>
          <div className="mt-2 text-xs text-white/90">
            بدأت الساعة {fmtTime(visit.checked_in_at)}
          </div>
        </div>
      )}

      {isCompleted && (
        <div className="rounded-2xl bg-gradient-to-br from-teal-500 to-emerald-500 text-white p-5 shadow-lg shadow-teal-500/20">
          <div className="flex items-center gap-2 mb-2">
            <Icon d={icons.check} size={20} />
            <div className="text-sm font-semibold">زيارة مكتملة</div>
          </div>
          <div className="text-2xl font-bold tabular-nums">
            {visit.duration_minutes != null ? visit.duration_minutes + " دقيقة" : "—"}
          </div>
          <div className="mt-2 text-xs text-white/90">
            {fmtTime(visit.checked_in_at)} → {fmtTime(visit.checked_out_at)}
          </div>
        </div>
      )}

      {/* Verification badge */}
      {visit.distance_from_doctor != null && (
        <div className={"rounded-2xl border p-3 flex items-center gap-3 " + (visit.is_verified ? "bg-teal-50 border-teal-200" : "bg-amber-50 border-amber-200")}>
          <span className={"w-9 h-9 rounded-xl flex items-center justify-center shrink-0 " + (visit.is_verified ? "bg-teal-100 text-teal-600" : "bg-amber-100 text-amber-600")}>
            <Icon d={visit.is_verified ? icons.check : icons.pin} size={16} />
          </span>
          <div className="flex-1 min-w-0">
            <div className={"text-xs font-semibold " + (visit.is_verified ? "text-teal-900" : "text-amber-900")}>
              {visit.is_verified ? "موثقة GPS" : "خارج النطاق"}
            </div>
            <div className={"text-[11px] mt-0.5 " + (visit.is_verified ? "text-teal-700" : "text-amber-700")}>
              المسافة من العيادة: {fmtDistance(visit.distance_from_doctor)}
            </div>
          </div>
        </div>
      )}

      {error && (
        <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-xs text-red-700">
          {error}
        </div>
      )}

      {/* Action buttons */}
      {isPlanned && (
        <button
          onClick={handleCheckIn}
          disabled={busy}
          className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-sky-500 to-teal-500 text-white text-sm font-bold shadow-lg shadow-sky-500/20 hover:from-sky-600 hover:to-teal-600 transition disabled:opacity-60"
        >
          {busy ? "جاري التحقق من الموقع..." : "تسجيل الوصول (Check-In)"}
        </button>
      )}

      {isActive && !showCheckout && (
        <button
          onClick={() => setShowCheckout(true)}
          className="w-full py-3.5 rounded-2xl bg-slate-900 text-white text-sm font-bold shadow-lg hover:bg-slate-800 transition"
        >
          إنهاء الزيارة (Check-Out)
        </button>
      )}

      {isActive && showCheckout && (
        <div className="rounded-2xl bg-white border border-slate-200 p-4 space-y-3">
          <div className="text-sm font-semibold text-slate-900">إنهاء الزيارة</div>

          <div>
            <label className="block text-[11px] font-medium text-slate-600 mb-1.5">ملاحظات الزيارة</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              placeholder="اكتب ملاحظاتك..."
              className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-400 transition resize-none"
            />
          </div>

          <div>
            <label className="block text-[11px] font-medium text-slate-600 mb-1.5">رد الدكتور</label>
            <div className="flex gap-1.5">
              {RESPONSES.map((r) => {
                const on = response === r.value;
                return (
                  <button
                    key={r.value}
                    type="button"
                    onClick={() => setResponse(on ? "" : r.value)}
                    className={
                      "flex-1 py-2 rounded-lg text-xs font-medium transition border " +
                      (on
                        ? "bg-sky-500 text-white border-sky-500"
                        : "bg-white text-slate-600 border-slate-200")
                    }
                  >
                    {r.ar}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-medium text-slate-600 mb-1.5">موعد المتابعة (اختياري)</label>
            <input
              type="datetime-local"
              value={followUpDate}
              onChange={(e) => setFollowUpDate(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-400"
            />
          </div>

          <div>
            <label className="block text-[11px] font-medium text-slate-600 mb-1.5">ملاحظات المتابعة</label>
            <input
              type="text"
              value={followUpNotes}
              onChange={(e) => setFollowUpNotes(e.target.value)}
              placeholder="مثال: إرسال عينات"
              className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-400"
            />
          </div>

          <div className="flex gap-2 pt-1">
            <button
              onClick={handleCheckOut}
              disabled={busy}
              className="flex-1 py-3 rounded-xl bg-gradient-to-r from-teal-500 to-emerald-500 text-white text-sm font-bold shadow-lg shadow-teal-500/20 hover:from-teal-600 hover:to-emerald-600 transition disabled:opacity-60"
            >
              {busy ? "جاري الحفظ..." : "إنهاء وحفظ"}
            </button>
            <button
              onClick={() => setShowCheckout(false)}
              disabled={busy}
              className="px-4 py-3 rounded-xl bg-white border border-slate-200 text-slate-700 text-xs font-medium hover:bg-slate-50"
            >
              إلغاء
            </button>
          </div>
        </div>
      )}

      {/* Notes display */}
      {visit.notes && !showCheckout && (
        <div className="rounded-2xl bg-white border border-slate-200 p-4">
          <div className="text-[11px] font-semibold text-slate-500 mb-2">ملاحظات</div>
          <p className="text-sm text-slate-700 whitespace-pre-wrap leading-relaxed break-words">{visit.notes}</p>
        </div>
      )}

      {visit.next_follow_up_date && (
        <div className="rounded-2xl bg-amber-50 border border-amber-200 p-4">
          <div className="text-[11px] font-semibold text-amber-900 mb-1">متابعة قادمة</div>
          <div className="text-sm font-medium text-amber-900">
            {new Date(visit.next_follow_up_date).toLocaleString("ar-EG", { dateStyle: "medium", timeStyle: "short" })}
          </div>
          {visit.next_follow_up_notes && (
            <div className="text-xs text-amber-700 mt-1">{visit.next_follow_up_notes}</div>
          )}
        </div>
      )}
    </div>
  );
}
''', encoding="utf-8")
print("OK - /rep/visits/[id] detail page")
print("Done!")