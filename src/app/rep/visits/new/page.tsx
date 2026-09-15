"use client";

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
