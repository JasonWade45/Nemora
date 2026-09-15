"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Doctor, doctorDisplayName, getAllDoctors } from "@/lib/api";
import { useLanguage } from "@/lib/language-context";
import { Icon, icons } from "@/components/ui/Icons";

function initials(name: string) {
  const parts = name.replace(/^(د\.?|د\/|دكتور|دكتورة|Dr\.?|Doctor)\s*/i, "").split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2);
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

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

export default function DoctorsPage() {
  const { lang } = useLanguage();
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [activeSpec, setActiveSpec] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const items = await getAllDoctors();
        setDoctors(items);
      } catch (e: any) {
        setError(e.message || "Failed to load doctors");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const specialties = useMemo(() => {
    const counts = new Map<string, number>();
    for (const d of doctors) {
      const s = (d.specialty ?? "").trim();
      if (!s) continue;
      counts.set(s, (counts.get(s) ?? 0) + 1);
    }
    return Array.from(counts.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([name, count]) => ({ name, count }));
  }, [doctors]);

  const filtered = useMemo(() => {
    let list = doctors;
    if (activeSpec) list = list.filter(d => (d.specialty ?? "").trim() === activeSpec);
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(d => {
        const name = doctorDisplayName(d).toLowerCase();
        return name.includes(q)
          || (d.phone ?? "").toLowerCase().includes(q)
          || (d.specialty ?? "").toLowerCase().includes(q)
          || (d.address ?? "").toLowerCase().includes(q);
      });
    }
    return list;
  }, [doctors, activeSpec, search]);

  const totalLabel = lang === "ar" ? "دكتور" : "doctors";
  const allLabel = lang === "ar" ? "الكل" : "All";

  return (
    <div className="max-w-7xl mx-auto">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">
            {lang === "ar" ? "الأطباء" : "Doctors"}
          </h1>
          <p className="mt-1 text-slate-600 text-sm">
            {doctors.length} {totalLabel} · {filtered.length} {lang === "ar" ? "ظاهر" : "shown"}
          </p>
        </div>
        <button
          onClick={() => alert("Add Doctor — coming soon")}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-slate-900 hover:bg-slate-800 text-white text-sm font-medium transition shadow-sm"
        >
          <Icon d={icons.plus} size={16} />
          {lang === "ar" ? "إضافة طبيب" : "Add Doctor"}
        </button>
      </div>

      <div className="mb-4">
        <div className="relative max-w-md">
          <span className="absolute start-3 top-1/2 -translate-y-1/2 text-slate-400">
            <Icon d={icons.search} size={18} />
          </span>
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder={lang === "ar" ? "ابحث بالاسم أو التخصص أو الهاتف..." : "Search by name, specialty, or phone..."}
            className="w-full ps-10 pe-4 py-2.5 rounded-xl border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-400 transition"
          />
        </div>
      </div>

      <div className="mb-6 -mx-1 overflow-x-auto pb-2">
        <div className="flex flex-wrap gap-2 px-1">
          <button
            onClick={() => setActiveSpec(null)}
            className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold transition whitespace-nowrap border ${
              activeSpec === null
                ? "bg-slate-900 text-white border-slate-900"
                : "bg-white text-slate-600 border-slate-200 hover:border-slate-300"
            }`}
          >
            {allLabel}
            <span className={`text-[10px] tabular-nums ${activeSpec === null ? "text-white/70" : "text-slate-400"}`}>{doctors.length}</span>
          </button>
          {specialties.map(s => {
            const active = activeSpec === s.name;
            return (
              <button
                key={s.name}
                onClick={() => setActiveSpec(active ? null : s.name)}
                className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold transition whitespace-nowrap border ${
                  active
                    ? "bg-sky-500 text-white border-sky-500"
                    : "bg-white text-slate-600 border-slate-200 hover:border-sky-300"
                }`}
              >
                {s.name}
                <span className={`text-[10px] tabular-nums ${active ? "text-white/80" : "text-slate-400"}`}>{s.count}</span>
              </button>
            );
          })}
        </div>
      </div>

      {error && (
        <div className="mb-6 rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">{error}</div>
      )}

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="rounded-2xl bg-white border border-slate-200 p-5">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-full bg-slate-100 animate-pulse" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-32 bg-slate-100 rounded animate-pulse" />
                  <div className="h-3 w-24 bg-slate-100 rounded animate-pulse" />
                  <div className="h-3 w-40 bg-slate-100 rounded animate-pulse" />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl bg-white border border-slate-200 p-12 text-center">
          <div className="text-slate-900 font-medium mb-1">
            {doctors.length === 0
              ? (lang === "ar" ? "لا يوجد أطباء بعد" : "No healthcare professionals yet.")
              : (lang === "ar" ? "لا توجد نتائج" : "No results found.")}
          </div>
          <p className="text-sm text-slate-500">
            {doctors.length === 0
              ? (lang === "ar" ? "ابدأ بإضافة أطباء إلى شركتك." : "Start by adding doctors to your organization.")
              : (lang === "ar" ? "جرّب تعديل البحث أو الفلتر." : "Try adjusting your search or filter.")}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map(d => {
            const name = doctorDisplayName(d);
            return (
              <Link
                key={d.id}
                href={`/admin/doctors/${d.id}`}
                className="group rounded-2xl bg-white border border-slate-200 p-5 hover:border-sky-300 hover:shadow-lg hover:shadow-sky-500/5 hover:-translate-y-0.5 transition-all"
              >
                <div className="flex items-start gap-4">
                  <div className={`w-12 h-12 rounded-full bg-gradient-to-br ${specColor(d.specialty)} text-white flex items-center justify-center font-semibold text-sm shrink-0`}>
                    {initials(name)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-slate-900 truncate leading-tight">{name}</div>
                    {d.specialty && (
                      <div className="text-xs text-slate-500 mt-1 truncate">{d.specialty}</div>
                    )}
                    <div className="mt-3 space-y-1.5 text-xs text-slate-600">
                      {d.phone && (
                        <div className="flex items-center gap-1.5">
                          <span className="text-slate-400"><Icon d={icons.phone} size={13} /></span>
                          <span dir="ltr" className="tabular-nums">{d.phone}</span>
                        </div>
                      )}
                      {d.address && (
                        <div className="flex items-start gap-1.5">
                          <span className="text-slate-400 mt-0.5 shrink-0"><Icon d={icons.pin} size={13} /></span>
                          <span className="line-clamp-2 leading-snug">{d.address}</span>
                        </div>
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