"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Doctor, buildMapsUrl, doctorDisplayName, getAllDoctors } from "@/lib/api";
import { Icon, icons } from "@/components/ui/Icons";

function initials(name: string) {
  const parts = name.replace(/^(د\.?|د\/|دكتور|دكتورة|Dr\.?|Doctor)\s*/i, "").split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2);
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

export default function ManagerDoctorsPage() {
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [specFilter, setSpecFilter] = useState<string | null>(null);
  const [areaFilter, setAreaFilter] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const all = await getAllDoctors();
        setDoctors(all);
      } catch {}
      setLoading(false);
    })();
  }, []);

  const specs = useMemo(() => {
    const map = new Map<string, number>();
    for (const d of doctors) {
      const s = (d.specialty || "").trim();
      if (!s) continue;
      map.set(s, (map.get(s) || 0) + 1);
    }
    return Array.from(map.entries()).sort((a, b) => b[1] - a[1]).slice(0, 12);
  }, [doctors]);

  const areas = useMemo(() => {
    const map = new Map<string, number>();
    for (const d of doctors) {
      const a = (d.area || "").trim();
      if (!a) continue;
      map.set(a, (map.get(a) || 0) + 1);
    }
    return Array.from(map.entries()).sort((a, b) => b[1] - a[1]).slice(0, 12);
  }, [doctors]);

  const filtered = useMemo(() => {
    let list = doctors;
    if (specFilter) list = list.filter((d) => (d.specialty || "").trim() === specFilter);
    if (areaFilter) list = list.filter((d) => (d.area || "").trim() === areaFilter);
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(
        (d) =>
          doctorDisplayName(d).toLowerCase().includes(q) ||
          (d.specialty || "").toLowerCase().includes(q) ||
          (d.phone || "").toLowerCase().includes(q) ||
          (d.area || "").toLowerCase().includes(q)
      );
    }
    return list;
  }, [doctors, specFilter, areaFilter, search]);

  return (
    <div className="max-w-7xl mx-auto pb-10 space-y-4">
      <div>
        <h1 className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight">الأطباء</h1>
        <p className="mt-1 text-slate-600 dark:text-slate-400 text-sm">
          {loading ? "..." : `${filtered.length} من ${doctors.length} طبيب`}
        </p>
      </div>

      {/* Specialty chips */}
      {!loading && specs.length > 0 && (
        <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
          <button
            onClick={() => setSpecFilter(null)}
            className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold transition whitespace-nowrap border ${
              specFilter === null ? "bg-slate-900 dark:bg-white text-white dark:text-slate-900 border-slate-900 dark:border-white" : "bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-800"
            }`}
          >
            كل التخصصات
          </button>
          {specs.map(([s, cnt]) => (
            <button
              key={s}
              onClick={() => setSpecFilter(specFilter === s ? null : s)}
              className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold transition whitespace-nowrap border ${
                specFilter === s ? "bg-sky-500 text-white border-sky-500" : "bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:border-sky-300"
              }`}
            >
              {s}
              <span className={`text-[10px] tabular-nums ${specFilter === s ? "text-white/80" : "text-slate-400"}`}>{cnt}</span>
            </button>
          ))}
        </div>
      )}

      {/* Area chips */}
      {!loading && areas.length > 0 && (
        <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
          <button
            onClick={() => setAreaFilter(null)}
            className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-medium transition whitespace-nowrap border ${
              areaFilter === null ? "bg-teal-500 text-white border-teal-500" : "bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-800"
            }`}
          >
            كل المناطق
          </button>
          {areas.map(([a, cnt]) => (
            <button
              key={a}
              onClick={() => setAreaFilter(areaFilter === a ? null : a)}
              className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-medium transition whitespace-nowrap border ${
                areaFilter === a ? "bg-teal-600 text-white border-teal-600" : "bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:border-teal-300"
              }`}
            >
              {a}
              <span className={`text-[10px] tabular-nums ${areaFilter === a ? "text-white/80" : "text-slate-400"}`}>{cnt}</span>
            </button>
          ))}
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
          className="w-full ps-9 pe-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/20 transition"
        />
      </div>

      {/* Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="h-24 bg-slate-100 dark:bg-slate-800 rounded-2xl animate-pulse" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-12 text-center">
          <div className="w-14 h-14 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400 mx-auto mb-4">
            <Icon d={icons.doctors} size={26} />
          </div>
          <div className="text-base font-semibold text-slate-900 dark:text-white mb-1">لا توجد نتائج</div>
          <p className="text-xs text-slate-500">جرّب تعديل الفلتر أو البحث</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
          {filtered.slice(0, 200).map((d) => {
            const name = doctorDisplayName(d);
            const mapsUrl = buildMapsUrl(d);
            return (
              <div key={d.id} className="group rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 hover:border-sky-300 transition">
                <div className="flex items-start gap-3">
                  <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-sky-500 to-teal-500 text-white flex items-center justify-center text-xs font-bold shrink-0">
                    {initials(name)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-bold text-slate-900 dark:text-white truncate">{name}</div>
                    {d.specialty && <div className="text-[11px] text-slate-500 mt-0.5">{d.specialty}</div>}
                    <div className="flex flex-wrap gap-x-2 gap-y-0.5 mt-1.5 text-[11px] text-slate-500">
                      {d.phone && <span dir="ltr" className="tabular-nums">{d.phone}</span>}
                      {d.area && <span className="text-sky-600">· {d.area}</span>}
                    </div>
                  </div>
                </div>
                <a
                  href={mapsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-3 flex items-center justify-center gap-1.5 w-full py-1.5 rounded-lg bg-sky-50 dark:bg-sky-500/10 text-sky-700 text-[11px] font-medium hover:bg-sky-100 transition"
                >
                  <Icon d={icons.navigation} size={12} />
                  وصّلني
                </a>
              </div>
            );
          })}
        </div>
      )}

      {!loading && filtered.length > 200 && (
        <div className="text-center text-xs text-slate-500 py-3">
          يعرض أول 200 من {filtered.length} — استخدم البحث للوصول للباقي
        </div>
      )}
    </div>
  );
}