"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Icon, icons } from "@/components/ui/Icons";
import {
  buildPlan,
  confirmPlan,
  getCurrentShift,
  startShift,
  PlanDoctorItem,
  VISIT_PURPOSES,
  PlannedVisit,
  PlanConfirmResponse,
} from "@/lib/api";

const PRIORITY_COLORS: Record<string, string> = {
  HIGH: "bg-red-100 text-red-700 border-red-200",
  URGENT: "bg-red-100 text-red-700 border-red-200",
  MEDIUM: "bg-amber-100 text-amber-700 border-amber-200",
  LOW: "bg-green-100 text-green-700 border-green-200",
};

type Step = "loading" | "select" | "confirm" | "done";

export default function PlanBuilderPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("loading");
  const [doctors, setDoctors] = useState<PlanDoctorItem[]>([]);
  const [areas, setAreas] = useState<string[]>([]);
  const [specialties, setSpecialties] = useState<string[]>([]);
  const [filterArea, setFilterArea] = useState("");
  const [filterSpecialty, setFilterSpecialty] = useState("");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Map<string, string>>(new Map());
  const [gpsCoords, setGpsCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [result, setResult] = useState<PlanConfirmResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasActiveShift, setHasActiveShift] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const shift = await getCurrentShift();
        if (shift.active) {
          setHasActiveShift(true);
          setStep("select");
        }
      } catch {}

      try {
        if (typeof navigator !== "undefined" && navigator.geolocation) {
          navigator.geolocation.getCurrentPosition(
            (pos) => setGpsCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
            () => {},
            { enableHighAccuracy: true, timeout: 5000, maximumAge: 60000 }
          );
        }
      } catch {}
    })();
  }, []);

  useEffect(() => {
    if (step !== "loading" && step !== "select") return;
    if (hasActiveShift) return;
    (async () => {
      setLoading(true);
      try {
        const res = await buildPlan(gpsCoords ? { lat: gpsCoords.lat, lng: gpsCoords.lng } : undefined);
        setDoctors(res.doctors);
        setAreas(res.areas);
        setSpecialties(res.specialties);
        setStep("select");
      } catch (e: any) {
        setError(e?.message || "خطأ في تحميل الخطة");
        setStep("select");
      }
      setLoading(false);
    })();
  }, [step, gpsCoords, hasActiveShift]);

  const filtered = useMemo(() => {
    return doctors.filter((d) => {
      if (filterArea && d.area !== filterArea) return false;
      if (filterSpecialty && d.specialty !== filterSpecialty) return false;
      if (search) {
        const s = search.toLowerCase();
        if (
          !d.doctor_name.toLowerCase().includes(s) &&
          !(d.specialty || "").toLowerCase().includes(s) &&
          !(d.area || "").toLowerCase().includes(s)
        )
          return false;
      }
      return true;
    });
  }, [doctors, filterArea, filterSpecialty, search]);

  const toggleDoctor = useCallback(
    (doctorId: string) => {
      setSelected((prev) => {
        const next = new Map(prev);
        if (next.has(doctorId)) {
          next.delete(doctorId);
        } else {
          next.set(doctorId, "DETAILING");
        }
        return next;
      });
    },
    []
  );

  const setPurpose = useCallback((doctorId: string, purpose: string) => {
    setSelected((prev) => {
      const next = new Map(prev);
      next.set(doctorId, purpose);
      return next;
    });
  }, []);

  const selectAll = useCallback(() => {
    const newSelected = new Map<string, string>();
    filtered.forEach((d) => {
      if (!selected.has(d.doctor_id)) {
        newSelected.set(d.doctor_id, "DETAILING");
      }
    });
    setSelected((prev) => {
      const next = new Map(prev);
      newSelected.forEach((v, k) => next.set(k, v));
      return next;
    });
  }, [filtered, selected]);

  const deselectAll = useCallback(() => {
    setSelected(new Map());
  }, []);

  async function handleConfirm() {
    if (selected.size === 0) return;
    setLoading(true);
    setError(null);
    try {
      if (!hasActiveShift) {
        await startShift("خطة يومية");
      }
      const selections = Array.from(selected.entries()).map(([doctor_id, visit_purpose]) => ({
        doctor_id,
        visit_purpose,
      }));
      const res = await confirmPlan(selections);
      setResult(res);
      setStep("done");
    } catch (e: any) {
      let msg = "حدث خطأ";
      try {
        const parsed = JSON.parse(e.message);
        msg = parsed.detail || msg;
      } catch {
        msg = e.message || msg;
      }
      setError(msg);
    }
    setLoading(false);
  }

  const selectedDocs = useMemo(() => {
    return filtered.filter((d) => selected.has(d.doctor_id));
  }, [filtered, selected]);

  return (
    <div className="space-y-4 pb-28">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-800">خطتي اليومية</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            {step === "done"
              ? `خطة ${result?.visits.length || 0} زيارة جاهزة`
              : `اختر الدctors المراد زيارتهم_today`}
          </p>
        </div>
        {step === "select" && !loading && (
          <button
            onClick={selected.size > 0 ? deselectAll : selectAll}
            className="px-3 py-1.5 text-xs font-medium bg-slate-100 text-slate-600 rounded-lg hover:bg-slate-200 transition"
          >
            {selected.size > 0 ? "إلغاء الكل" : "اختيار الكل"}
          </button>
        )}
      </div>

      {/* Loading */}
      {step === "loading" && (
        <div className="flex items-center justify-center py-16">
          <div className="w-6 h-6 border-2 border-slate-300 border-t-sky-500 rounded-full animate-spin" />
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-center">
          <p className="text-sm text-red-600">{error}</p>
          <button onClick={() => setError(null)} className="text-xs text-red-500 mt-2 underline">
            إخفاء
          </button>
        </div>
      )}

      {/* Select Step */}
      {step === "select" && !loading && (
        <>
          {hasActiveShift && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-center">
              <p className="text-xs text-amber-700 font-medium">لديك شيفت نشط بالفعل — الزيارات الجديدة هتتضاف للشيفت الحالي</p>
            </div>
          )}

          {/* Filters */}
          {doctors.length > 0 && (
            <div className="space-y-2">
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="بحث بالاسم أو التخصص أو المنطقة..."
                className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 bg-white"
              />
              <div className="flex gap-2 flex-wrap">
                {areas.length > 0 && (
                  <select
                    value={filterArea}
                    onChange={(e) => setFilterArea(e.target.value)}
                    className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs bg-white text-slate-700"
                  >
                    <option value="">كل المناطق</option>
                    {areas.map((a) => (
                      <option key={a} value={a}>{a}</option>
                    ))}
                  </select>
                )}
                {specialties.length > 0 && (
                  <select
                    value={filterSpecialty}
                    onChange={(e) => setFilterSpecialty(e.target.value)}
                    className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs bg-white text-slate-700"
                  >
                    <option value="">كل التخصصات</option>
                    {specialties.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                )}
              </div>
            </div>
          )}

          {/* Doctor List */}
          {doctors.length === 0 ? (
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-8 text-center">
              <Icon d={icons.calendar} size={40} className="mx-auto text-slate-300 mb-3" />
              <p className="text-sm text-slate-500">مفيش أطباء متاحين للزيارة</p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-8 text-center">
              <p className="text-sm text-slate-500">لا توجد نتائج مطابقة لل filtro</p>
            </div>
          ) : (
            <div className="space-y-2">
              {filtered.map((d) => {
                const isSelected = selected.has(d.doctor_id);
                const purpose = selected.get(d.doctor_id) || "DETAILING";
                const priorityKey = (d.priority || "").toUpperCase();
                const priorityColor = PRIORITY_COLORS[priorityKey] || "bg-slate-100 text-slate-600 border-slate-200";

                return (
                  <div
                    key={d.doctor_id}
                    className={`bg-white border rounded-xl p-3 transition-all ${
                      isSelected ? "border-sky-400 ring-2 ring-sky-100 shadow-sm" : "border-slate-200"
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      {/* Checkbox */}
                      <button
                        onClick={() => toggleDoctor(d.doctor_id)}
                        className={`mt-1 w-5 h-5 rounded-lg border-2 flex items-center justify-center shrink-0 transition ${
                          isSelected
                            ? "bg-sky-500 border-sky-500"
                            : "border-slate-300 hover:border-sky-400"
                        }`}
                      >
                        {isSelected && (
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3">
                            <path d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                      </button>

                      {/* Doctor Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h3 className="text-sm font-bold text-slate-800 truncate">{d.doctor_name}</h3>
                          <span className={`px-1.5 py-0.5 text-[9px] font-bold rounded-full border ${priorityColor}`}>
                            {d.priority || "—"}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 mt-0.5 text-[11px] text-slate-500">
                          {d.specialty && <span>{d.specialty}</span>}
                          {d.specialty && d.area && <span>·</span>}
                          {d.area && <span>{d.area}</span>}
                          {d.days_since_visit != null && (
                            <>
                              <span>·</span>
                              <span>آخر زيارة: {d.days_since_visit} يوم</span>
                            </>
                          )}
                        </div>
                      </div>

                      {/* Order number */}
                      {isSelected && (
                        <div className="w-6 h-6 rounded-full bg-sky-500 text-white flex items-center justify-center text-[10px] font-bold shrink-0">
                          {Array.from(selected.keys()).indexOf(d.doctor_id) + 1}
                        </div>
                      )}
                    </div>

                    {/* Visit Purpose (only when selected) */}
                    {isSelected && (
                      <div className="mt-2.5 pt-2.5 border-t border-slate-100">
                        <div className="flex flex-wrap gap-1.5">
                          {VISIT_PURPOSES.map((p) => (
                            <button
                              key={p.value}
                              onClick={() => setPurpose(d.doctor_id, p.value)}
                              className={`px-2.5 py-1 text-[10px] font-medium rounded-lg border transition ${
                                purpose === p.value
                                  ? "bg-sky-500 text-white border-sky-500"
                                  : "bg-white text-slate-600 border-slate-200 hover:border-sky-300"
                              }`}
                            >
                              {p.label}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* Done Step */}
      {step === "done" && result && (
        <div className="space-y-4">
          {/* Success banner */}
          <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 text-center">
            <div className="w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-2">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2.5">
                <path d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <p className="text-sm font-bold text-emerald-800">{result.message}</p>
            {result.total_distance_km != null && (
              <p className="text-xs text-emerald-600 mt-1">
                المسافة الإجمالية: {result.total_distance_km} كم
              </p>
            )}
          </div>

          {/* Route map */}
          <div className="bg-white border border-slate-200 rounded-xl p-4">
            <h3 className="text-sm font-bold text-slate-800 mb-3">خط السير</h3>
            <div className="space-y-0">
              {result.visits.map((v, idx) => (
                <div key={v.visit_id} className="flex gap-3">
                  {/* Timeline */}
                  <div className="flex flex-col items-center">
                    <div className="w-7 h-7 rounded-full bg-sky-500 text-white flex items-center justify-center text-[10px] font-bold shrink-0">
                      {idx + 1}
                    </div>
                    {idx < result.visits.length - 1 && (
                      <div className="w-0.5 flex-1 bg-sky-200 my-1" />
                    )}
                  </div>
                  {/* Visit info */}
                  <div className="pb-4 flex-1">
                    <div className="text-sm font-bold text-slate-800">{v.doctor_name}</div>
                    <div className="text-[11px] text-slate-500 mt-0.5">
                      {VISIT_PURPOSES.find((p) => p.value === v.visit_purpose)?.label || v.visit_purpose}
                    </div>
                    {v.latitude && v.longitude && (
                      <a
                        href={`https://www.google.com/maps/dir/?api=1&destination=${v.latitude},${v.longitude}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 mt-1.5 px-2.5 py-1 text-[10px] font-medium bg-teal-50 text-teal-600 rounded-lg border border-teal-200 hover:bg-teal-100 transition"
                      >
                        <Icon d={icons.navigation} size={10} />
                        اتجاه
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-2">
            <button
              onClick={() => router.push("/rep/visits")}
              className="flex-1 py-3 rounded-xl bg-gradient-to-r from-sky-500 to-teal-500 text-white text-sm font-bold"
            >
              عرض الزيارات
            </button>
            <button
              onClick={() => router.push("/rep")}
              className="flex-1 py-3 rounded-xl bg-white border border-slate-200 text-slate-700 text-sm font-bold"
            >
              للرئيسية
            </button>
          </div>
        </div>
      )}

      {/* Floating confirm button */}
      {step === "select" && selected.size > 0 && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-30 w-[calc(100%-2rem)] max-w-md">
          <button
            onClick={handleConfirm}
            disabled={loading}
            className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-sky-500 to-teal-500 text-white text-sm font-bold shadow-lg shadow-sky-500/30 disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <Icon d={icons.calendar} size={16} />
                ابدأ الخطة ({selected.size} زيارة)
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
}
