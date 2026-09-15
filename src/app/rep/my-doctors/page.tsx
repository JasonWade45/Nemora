"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Doctor,
  buildMapsUrl,
  doctorDisplayName,
  getAllDoctors,
} from "@/lib/api";
import { Icon, icons } from "@/components/ui/Icons";

const DoctorsMiniMap = dynamic(
  () => import("@/components/map/DoctorsMiniMap").then((m) => m.DoctorsMiniMap),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-full flex items-center justify-center bg-slate-100">
        <div className="text-xs text-slate-500">جاري تحميل الخريطة...</div>
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

type AreaSelection = string | null | undefined;

type AreaItem = { area: string | null; label: string; count: number };

export default function MyDoctorsPage() {
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeArea, setActiveArea] = useState<AreaSelection>(undefined);
  const [search, setSearch] = useState("");
  const [showMap, setShowMap] = useState(true);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    (async () => {
      try {
        const all = await getAllDoctors();
        setDoctors(all);
      } catch {}
      setLoading(false);
    })();
  }, []);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node)
      ) {
        setDropdownOpen(false);
      }
    }
    if (dropdownOpen) {
      document.addEventListener("mousedown", onClickOutside);
      return () => document.removeEventListener("mousedown", onClickOutside);
    }
  }, [dropdownOpen]);

  // Areas computed from doctors the rep actually sees
  const areas = useMemo<AreaItem[]>(() => {
    const map = new Map<string, number>();
    let noArea = 0;
    for (const d of doctors) {
      const a = (d.area || "").trim();
      if (!a) {
        noArea += 1;
      } else {
        map.set(a, (map.get(a) ?? 0) + 1);
      }
    }
    const list: AreaItem[] = Array.from(map.entries())
      .map(([area, count]) => ({ area, label: area, count }))
      .sort((a, b) => b.count - a.count);
    if (noArea > 0) {
      list.push({ area: null, label: "غير محدد", count: noArea });
    }
    return list;
  }, [doctors]);

  const filtered = useMemo(() => {
    let list = doctors;

    if (activeArea !== undefined) {
      if (activeArea === null) {
        list = list.filter((d) => !d.area);
      } else {
        list = list.filter((d) => d.area === activeArea);
      }
    }

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
  }, [doctors, activeArea, search]);

  const mappedDoctors = useMemo(
    () => filtered.filter((d) => d.latitude != null && d.longitude != null),
    [filtered]
  );

  const activeLabel = useMemo(() => {
    if (activeArea === undefined) return "كل المناطق";
    if (activeArea === null) return "غير محدد";
    return activeArea;
  }, [activeArea]);

  const activeCount = useMemo(() => {
    if (activeArea === undefined) return doctors.length;
    if (activeArea === null) return doctors.filter((d) => !d.area).length;
    return doctors.filter((d) => d.area === activeArea).length;
  }, [doctors, activeArea]);

  function selectArea(area: AreaSelection) {
    setActiveArea(area);
    setDropdownOpen(false);
  }

  return (
    <div className="space-y-4 pb-4">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">أطبائي</h1>
        <p className="text-sm text-slate-600 mt-0.5">
          {loading
            ? "جاري التحميل..."
            : `${activeLabel} · ${filtered.length} طبيب`}
        </p>
      </div>

      {/* Area Dropdown */}
      {!loading && areas.length > 0 && (
        <div className="relative z-[1000]" ref={dropdownRef}>
          <button
            onClick={() => setDropdownOpen((v) => !v)}
            className={`w-full flex items-center justify-between gap-3 px-4 py-3 rounded-2xl border bg-white transition-all duration-200 ${
              dropdownOpen
                ? "border-sky-400 ring-4 ring-sky-500/10 shadow-sm"
                : "border-slate-200 hover:border-slate-300"
            }`}
          >
            <div className="flex items-center gap-3 min-w-0">
              <span
                className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 transition-colors ${
                  activeArea !== undefined
                    ? "bg-sky-500 text-white shadow-sm shadow-sky-500/20"
                    : "bg-slate-100 text-slate-500"
                }`}
              >
                <Icon d={icons.pin} size={16} />
              </span>
              <div className="flex flex-col items-start min-w-0">
                <span className="text-[10px] font-medium text-slate-500 leading-none mb-1">
                  المنطقة
                </span>
                <span className="text-sm font-bold text-slate-900 truncate leading-none">
                  {activeLabel}
                </span>
              </div>
              {activeArea !== undefined && (
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-sky-50 text-sky-700 border border-sky-100 shrink-0">
                  {activeCount}
                </span>
              )}
            </div>
            <span
              className={`text-slate-400 transition-transform duration-300 ${
                dropdownOpen ? "rotate-180" : "rotate-0"
              }`}
            >
              <Icon d={icons.chevron} size={20} />
            </span>
          </button>

          {/* Dropdown menu */}
          <div
            className={`absolute top-full start-0 end-0 mt-2 z-[1000] transition-all duration-200 origin-top ${
              dropdownOpen
                ? "opacity-100 scale-y-100 translate-y-0 pointer-events-auto"
                : "opacity-0 scale-y-95 -translate-y-1 pointer-events-none"
            }`}
            style={{ transformOrigin: "top" }}
          >
            <div className="rounded-2xl border border-slate-200 bg-white shadow-xl shadow-slate-900/5 overflow-hidden">
              <div className="max-h-96 overflow-y-auto py-1">
                <button
                  onClick={() => selectArea(undefined)}
                  className={`w-full flex items-center justify-between gap-3 px-4 py-2.5 text-start transition-colors ${
                    activeArea === undefined
                      ? "bg-sky-50 text-sky-700"
                      : "text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span
                      className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                        activeArea === undefined
                          ? "bg-sky-500 text-white"
                          : "bg-slate-100 text-slate-500"
                      }`}
                    >
                      <Icon d={icons.doctors} size={13} />
                    </span>
                    <span className="text-sm font-medium truncate">
                      كل المناطق
                    </span>
                  </div>
                  <span className="text-[10px] tabular-nums text-slate-400 shrink-0">
                    {doctors.length}
                  </span>
                </button>

                <div className="h-px bg-slate-100 mx-4 my-1" />

                {areas.map((a, idx) => {
                  const active = activeArea === a.area;
                  return (
                    <button
                      key={a.label}
                      onClick={() => selectArea(a.area)}
                      className={`w-full flex items-center justify-between gap-3 px-4 py-2.5 text-start transition-all duration-150 animate-slide-in-down ${
                        active
                          ? "bg-sky-50 text-sky-700"
                          : "text-slate-700 hover:bg-slate-50"
                      }`}
                      style={{ animationDelay: `${idx * 15}ms` }}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <span
                          className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                            active
                              ? "bg-sky-500 text-white"
                              : "bg-slate-100 text-slate-500"
                          }`}
                        >
                          <Icon d={icons.pin} size={13} />
                        </span>
                        <span className="text-sm font-medium truncate">
                          {a.label}
                        </span>
                      </div>
                      <span
                        className={`text-[10px] tabular-nums shrink-0 ${
                          active ? "text-sky-600 font-semibold" : "text-slate-400"
                        }`}
                      >
                        {a.count}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
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

      {/* Mini Map */}
      {!loading && mappedDoctors.length > 0 && (
        <div className="rounded-2xl bg-white border border-slate-200 overflow-hidden relative z-0">
          <div className="px-4 py-2.5 border-b border-slate-200 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-7 h-7 rounded-lg bg-sky-50 text-sky-600 flex items-center justify-center">
                <Icon d={icons.pin} size={13} />
              </span>
              <h2 className="text-xs font-semibold text-slate-700">
                على الخريطة ({mappedDoctors.length})
              </h2>
            </div>
            <button
              onClick={() => setShowMap((v) => !v)}
              className="text-[11px] font-medium text-sky-600 hover:text-sky-800 px-2 py-1 rounded-md hover:bg-sky-50 transition"
            >
              {showMap ? "إخفاء" : "إظهار"}
            </button>
          </div>
          {showMap && (
            <div className="h-64">
              <DoctorsMiniMap
                doctors={mappedDoctors}
                activeArea={activeArea}
              />
            </div>
          )}
        </div>
      )}

      {/* Doctors list */}
      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
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
            لا توجد نتائج
          </div>
          <p className="text-xs text-slate-500">
            جرّب تعديل البحث أو الفلتر
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
                className="group block rounded-2xl bg-white border border-slate-200 p-4 hover:border-sky-300 hover:shadow-lg hover:shadow-sky-500/5 transition-all duration-200"
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-sky-500 to-teal-500 text-white flex items-center justify-center font-bold text-sm shadow-sm shrink-0">
                    {initials(name)}
                  </div>

                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-bold text-slate-900 leading-tight truncate group-hover:text-sky-700 transition">
                      {name}
                    </h3>
                    {d.specialty && (
                      <div className="text-[11px] text-slate-500 mt-0.5">
                        {d.specialty}
                      </div>
                    )}
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1.5 text-[11px] text-slate-500">
                      {d.phone && (
                        <span className="inline-flex items-center gap-1">
                          <Icon d={icons.phone} size={11} />
                          <span dir="ltr" className="tabular-nums">
                            {d.phone}
                          </span>
                        </span>
                      )}
                      {d.area && (
                        <span className="inline-flex items-center gap-1 text-sky-600 font-medium">
                          <Icon d={icons.pin} size={11} />
                          {d.area}
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