import pathlib

frontend = pathlib.Path(r"C:\Users\ATG\Documents\Default Project\pharma-crm\src")
app = frontend / "app"

# ============ 1) My Doctors page — better cards + chips always visible ============
doctors_page = app / "rep" / "my-doctors" / "page.tsx"
page = r'''"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Doctor, apiFetch, doctorDisplayName, getAllDoctors } from "@/lib/api";
import { Icon, icons } from "@/components/ui/Icons";

const SPECIALTY_COLORS: Record<string, string> = {
  "جلدية": "from-rose-500 to-pink-500",
  "أسنان": "from-sky-500 to-cyan-500",
  "أطفال": "from-amber-500 to-orange-500",
  "عيون": "from-indigo-500 to-violet-500",
  "عظام": "from-slate-600 to-slate-800",
  "باطنة": "from-teal-500 to-emerald-500",
  "نساء وتوليد": "from-fuchsia-500 to-purple-500",
  "قلب": "from-red-500 to-rose-600",
  "مخ وأعصاب": "from-violet-500 to-purple-600",
  "مسالك بولية": "from-cyan-500 to-blue-500",
  "أنف وأذن وحنجرة": "from-lime-500 to-green-500",
  "جهاز هضمي": "from-orange-500 to-red-500",
  "نفسية": "from-emerald-500 to-teal-500",
  "صدر وحساسية": "from-sky-400 to-blue-500",
  "مستشفى": "from-slate-500 to-slate-700",
  "مختبرات": "from-yellow-500 to-amber-500",
};

function specColor(spec?: string | null) {
  if (!spec) return "from-slate-400 to-slate-600";
  return SPECIALTY_COLORS[spec] ?? "from-sky-500 to-teal-500";
}

function initials(name: string) {
  const parts = name.replace(/^(د\.?|د\/|دكتور|دكتورة|Dr\.?|Doctor)\s*/i, "").split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2);
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

export default function MyDoctorsPage() {
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [mySpecs, setMySpecs] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [activeSpec, setActiveSpec] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const me: any = await apiFetch("/api/auth/me").catch(() => null);
        setMySpecs(me?.specialties ?? []);
        const all = await getAllDoctors();
        setDoctors(all);
      } catch {}
      setLoading(false);
    })();
  }, []);

  const specCounts = useMemo(() => {
    const map = new Map<string, number>();
    for (const d of doctors) {
      const s = (d.specialty ?? "").trim();
      if (!s) continue;
      map.set(s, (map.get(s) ?? 0) + 1);
    }
    return map;
  }, [doctors]);

  const filtered = useMemo(() => {
    let list = doctors;
    if (activeSpec) list = list.filter((d) => (d.specialty ?? "").trim() === activeSpec);
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(
        (d) =>
          doctorDisplayName(d).toLowerCase().includes(q) ||
          (d.specialty ?? "").toLowerCase().includes(q) ||
          (d.phone ?? "").toLowerCase().includes(q) ||
          (d.address ?? "").toLowerCase().includes(q)
      );
    }
    return list;
  }, [doctors, activeSpec, search]);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">أطبائي</h1>
        <p className="text-sm text-slate-600 mt-0.5">
          {loading
            ? "جاري التحميل..."
            : activeSpec
            ? `${activeSpec} · ${filtered.length} طبيب`
            : `${doctors.length} طبيب في تخصصاتك`}
        </p>
      </div>

      {/* Specialty chips — always show if rep has any */}
      {mySpecs.length > 0 && (
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setActiveSpec(null)}
            className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold transition border ${
              activeSpec === null
                ? "bg-slate-900 text-white border-slate-900 shadow-sm"
                : "bg-white text-slate-600 border-slate-200 hover:border-slate-300"
            }`}
          >
            الكل
            <span
              className={`text-[10px] tabular-nums ${
                activeSpec === null ? "text-white/70" : "text-slate-400"
              }`}
            >
              {doctors.length}
            </span>
          </button>
          {mySpecs.map((s) => {
            const active = activeSpec === s;
            const count = specCounts.get(s) ?? 0;
            return (
              <button
                key={s}
                onClick={() => setActiveSpec(active ? null : s)}
                className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold transition border ${
                  active
                    ? "bg-sky-500 text-white border-sky-500 shadow-sm"
                    : "bg-white text-slate-600 border-slate-200 hover:border-sky-300"
                }`}
              >
                {s}
                <span
                  className={`text-[10px] tabular-nums ${
                    active ? "text-white/80" : "text-slate-400"
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      )}

      {/* Search */}
      <div className="relative">
        <span className="absolute start-3 top-1/2 -translate-y-1/2 text-slate-400">
          <Icon d={icons.search} size={16} />
        </span>
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="ابحث بالاسم أو التخصص أو الهاتف..."
          className="w-full ps-9 pe-3 py-2.5 rounded-xl border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-400 transition"
        />
      </div>

      {/* List */}
      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="rounded-2xl bg-white border border-slate-200 p-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-slate-100 animate-pulse" />
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
            <Icon d={icons.doctors} size={26} />
          </div>
          <div className="text-base font-semibold text-slate-900 mb-1">
            {search ? "لا توجد نتائج" : "لا يوجد أطباء"}
          </div>
          <p className="text-xs text-slate-500 max-w-xs mx-auto">
            {search
              ? "جرّب تعديل البحث أو الفلتر."
              : "تواصل مع الأدمن لإضافة تخصصات لك."}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((d) => {
            const name = doctorDisplayName(d);
            return (
              <Link
                key={d.id}
                href={`/rep/doctors/${d.id}`}
                className="group block rounded-2xl bg-white border border-slate-200 p-4 hover:border-sky-300 hover:shadow-lg hover:shadow-sky-500/5 hover:-translate-y-0.5 transition-all duration-200"
              >
                <div className="flex items-center gap-4">
                  <div
                    className={`w-12 h-12 rounded-xl bg-gradient-to-br ${specColor(d.specialty)} text-white flex items-center justify-center font-bold text-sm shadow-sm shrink-0`}
                  >
                    {initials(name)}
                  </div>

                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-bold text-slate-900 leading-tight truncate group-hover:text-sky-700 transition">
                      {name}
                    </h3>
                    {d.specialty && (
                      <div className="text-[11px] text-slate-500 mt-0.5">{d.specialty}</div>
                    )}
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1.5 text-[11px] text-slate-500">
                      {d.phone && (
                        <span className="inline-flex items-center gap-1">
                          <Icon d={icons.phone} size={11} />
                          <span dir="ltr" className="tabular-nums">{d.phone}</span>
                        </span>
                      )}
                      {d.address && (
                        <span className="inline-flex items-center gap-1 min-w-0">
                          <Icon d={icons.pin} size={11} />
                          <span className="truncate max-w-[200px]">{d.address}</span>
                        </span>
                      )}
                    </div>
                  </div>

                  <span className="text-slate-300 group-hover:text-sky-500 transition rtl:rotate-180 shrink-0">
                    <Icon d={icons.chevron} size={18} />
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
'''
doctors_page.write_text(page, encoding="utf-8")
print("OK - my-doctors (chips always + clean cards)")

# ============ 2) Doctor profile — reorganize + "ملاحظاتي" ============
profile_dir = app / "rep" / "doctors" / "[id]"
profile_dir.mkdir(parents=True, exist_ok=True)

profile = r'''"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { Doctor, doctorDisplayName, getDoctor, buildMapsUrl, apiFetch } from "@/lib/api";
import { Icon, icons } from "@/components/ui/Icons";

const DoctorMiniMap = dynamic(
  () => import("@/components/map/DoctorMiniMap").then((m) => m.DoctorMiniMap),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-full flex items-center justify-center bg-slate-100 rounded-2xl">
        <div className="text-xs text-slate-500">...</div>
      </div>
    ),
  }
);

function initials(name: string) {
  const parts = name
    .replace(/^(د\.?|د\/|دكتور|دكتورة|Dr\.?|Doctor)\s*/i, "")
    .split(/\s+/)
    .filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2);
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

export default function RepDoctorProfilePage() {
  const params = useParams<{ id: string }>();
  const id = params?.id;
  const [doctor, setDoctor] = useState<Doctor | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // My notes (rep-editable)
  const [myNotes, setMyNotes] = useState("");
  const [editingNotes, setEditingNotes] = useState(false);
  const [savingNotes, setSavingNotes] = useState(false);
  const [saveToast, setSaveToast] = useState(false);

  useEffect(() => {
    if (!id) return;
    (async () => {
      try {
        const d = await getDoctor(id);
        setDoctor(d);
        setMyNotes(d.notes ?? "");
      } catch (e: any) {
        setError(e.message || "Failed to load doctor");
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  async function saveMyNotes() {
    if (!doctor) return;
    setSavingNotes(true);
    try {
      await apiFetch(`/api/doctors/${doctor.id}`, {
        method: "PATCH",
        body: JSON.stringify({ notes: myNotes }),
      });
      setDoctor({ ...doctor, notes: myNotes });
      setEditingNotes(false);
      setSaveToast(true);
      setTimeout(() => setSaveToast(false), 2000);
    } catch (e: any) {
      alert(e.message || "Failed to save");
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
      {/* Toast */}
      {saveToast && (
        <div className="fixed top-20 start-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-full bg-teal-500 text-white text-xs font-medium shadow-lg animate-slide-in-down">
          ✓ تم حفظ ملاحظاتك
        </div>
      )}

      {/* Back */}
      <Link
        href="/rep/my-doctors"
        className="inline-flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900"
      >
        <span className="rtl:rotate-180">
          <Icon d={icons.arrow_left} size={16} />
        </span>
        رجوع
      </Link>

      {/* Header card */}
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

      {/* Actions row */}
      <div className="grid grid-cols-2 gap-3">
        {doctor.phone && (
          <a
            href={`tel:${doctor.phone}`}
            className="flex items-center gap-3 p-3 rounded-2xl bg-white border border-slate-200 hover:border-teal-300 hover:bg-teal-50/30 transition"
          >
            <span className="w-10 h-10 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center shrink-0">
              <Icon d={icons.phone} size={17} />
            </span>
            <div className="flex-1 min-w-0">
              <div className="text-[10px] text-slate-500">اتصال</div>
              <div dir="ltr" className="text-xs font-semibold text-slate-900 tabular-nums truncate text-start">
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

      {/* Address */}
      {(doctor.address || doctor.city) && (
        <div className="rounded-2xl bg-white border border-slate-200 p-4">
          <div className="flex items-start gap-3">
            <span className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
              <Icon d={icons.pin} size={17} />
            </span>
            <div className="flex-1 min-w-0">
              <div className="text-[10px] text-slate-500 mb-0.5">العنوان</div>
              <div className="text-sm font-medium text-slate-900 leading-relaxed">
                {[doctor.address, doctor.city, doctor.state].filter(Boolean).join("، ")}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Map */}
      <div className="rounded-2xl bg-white border border-slate-200 overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between">
          <h2 className="text-xs font-semibold text-slate-700">الموقع على الخريطة</h2>
          {hasLocation && (
            <span dir="ltr" className="text-[10px] text-slate-400 tabular-nums">
              {doctor.latitude!.toFixed(4)}, {doctor.longitude!.toFixed(4)}
            </span>
          )}
        </div>
        <div className="h-56">
          {hasLocation ? (
            <DoctorMiniMap
              latitude={doctor.latitude!}
              longitude={doctor.longitude!}
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

      {/* ===== My Notes ===== */}
      <div className="rounded-2xl bg-white border border-slate-200 overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between bg-gradient-to-r from-amber-50 to-transparent">
          <div className="flex items-center gap-2">
            <span className="w-7 h-7 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z M14 2v6h6 M16 13H8 M16 17H8 M10 9H8" />
              </svg>
            </span>
            <h2 className="text-xs font-semibold text-amber-900">ملاحظاتي</h2>
          </div>
          {!editingNotes && (
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
                    setMyNotes(doctor.notes ?? "");
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
            <div className="text-center py-6">
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
'''
(profile_dir / "page.tsx").write_text(profile, encoding="utf-8")
print("OK - rep doctor profile (my notes + clean layout)")
print("Done!")