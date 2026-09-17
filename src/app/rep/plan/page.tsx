"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Icon, icons } from "@/components/ui/Icons";
import {
  buildPlan,
  confirmPlan,
  getCurrentShift,
  PlanDoctorItem,
  VISIT_PURPOSES,
  PlannedVisit,
  PlanConfirmResponse,
  apiFetch,
} from "@/lib/api";

const PRIORITY_COLORS: Record<string, string> = {
  HIGH: "bg-red-100 text-red-700 border-red-200",
  URGENT: "bg-red-100 text-red-700 border-red-200",
  MEDIUM: "bg-amber-100 text-amber-700 border-amber-200",
  LOW: "bg-green-100 text-green-700 border-green-200",
};

type Step = "loading" | "select" | "active" | "done";

type VisitStatus = "PLANNED" | "CHECKED_IN" | "COMPLETED" | "MISSED" | "CANCELLED";

type ActiveVisit = PlannedVisit & { status: VisitStatus };

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
  const [activeVisits, setActiveVisits] = useState<ActiveVisit[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
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
  }, [step, gpsCoords]);

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

  const toggleDoctor = useCallback((doctorId: string) => {
    setSelected((prev) => {
      const next = new Map(prev);
      if (next.has(doctorId)) {
        next.delete(doctorId);
      } else {
        next.set(doctorId, "DETAILING");
      }
      return next;
    });
  }, []);

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

  const deselectAll = useCallback(() => setSelected(new Map()), []);

  async function handleConfirm() {
    if (selected.size === 0) return;
    setLoading(true);
    setError(null);
    try {
      const selections = Array.from(selected.entries()).map(([doctor_id, visit_purpose]) => ({
        doctor_id,
        visit_purpose,
      }));
      const res = await confirmPlan(selections);
      setResult(res);
      const visits: ActiveVisit[] = res.visits.map((v) => ({ ...v, status: "PLANNED" as VisitStatus }));
      setActiveVisits(visits);
      setStep("active");
    } catch (e: any) {
      let msg = "حدث خطأ";
      try { msg = JSON.parse(e.message).detail || msg; } catch { msg = e.message || msg; }
      setError(msg);
    }
    setLoading(false);
  }

  async function refreshVisitStatuses() {
    if (!result) return;
    try {
      const visitIds = result.visits.map((v) => v.visit_id);
      const statuses: ActiveVisit[] = [];
      for (const v of result.visits) {
        try {
          const data: any = await apiFetch(`/api/visits/${v.visit_id}`);
          statuses.push({ ...v, status: data.status || "PLANNED" });
        } catch {
          statuses.push({ ...v, status: "PLANNED" });
        }
      }
      setActiveVisits(statuses);
    } catch {}
  }

  useEffect(() => {
    if (step === "active") {
      refreshVisitStatuses();
      const interval = setInterval(refreshVisitStatuses, 10000);
      return () => clearInterval(interval);
    }
  }, [step, result]);

  const completedCount = activeVisits.filter((v) => v.status === "COMPLETED").length;
  const currentVisit = activeVisits.find((v) => v.status !== "COMPLETED");
  const allDone = activeVisits.length > 0 && activeVisits.every((v) => v.status === "COMPLETED");

  useEffect(() => {
    if (allDone && step === "active") {
      setStep("done");
    }
  }, [allDone, step]);

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
            {step === "active" && `${completedCount}/${activeVisits.length} زيارة مكتملة`}
            {step === "done" && `تم إكمال ${activeVisits.length} زيارة بنجاح`}
            {step === "select" && "اختر الدكاترة المراد زيارتهم اليوم"}
            {step === "loading" && "جاري تحميل الخطة..."}
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

      {/* Progress bar */}
      {step === "active" && activeVisits.length > 0 && (
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-slate-600">التقدم</span>
            <span className="text-xs font-bold text-sky-600">{completedCount}/{activeVisits.length}</span>
          </div>
          <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-sky-500 to-teal-500 rounded-full transition-all duration-500"
              style={{ width: `${activeVisits.length > 0 ? (completedCount / activeVisits.length) * 100 : 0}%` }}
            />
          </div>
        </div>
      )}

      {/* Current visit CTA */}
      {step === "active" && currentVisit && (
        <div className="bg-gradient-to-r from-sky-500 to-teal-500 rounded-2xl p-5 text-white text-center shadow-lg shadow-sky-500/20">
          <div className="text-xs opacity-80 mb-1">ابدأ بـ</div>
          <div className="text-lg font-bold mb-1">{currentVisit.doctor_name}</div>
          <div className="text-xs opacity-80 mb-3">
            {VISIT_PURPOSES.find((p) => p.value === currentVisit.visit_purpose)?.label || currentVisit.visit_purpose}
          </div>
          <a
            href={`/rep/visits/${currentVisit.visit_id}`}
            className="inline-flex items-center gap-2 px-6 py-2.5 bg-white text-sky-600 rounded-xl font-bold text-sm shadow-lg hover:shadow-xl transition"
          >
            <Icon d={icons.navigation} size={16} />
            ابدأ الزيارة
          </a>
        </div>
      )}

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

          {doctors.length === 0 ? (
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-8 text-center">
              <Icon d={icons.calendar} size={40} className="mx-auto text-slate-300 mb-3" />
              <p className="text-sm text-slate-500">مفيش أطباء متاحين للزيارة</p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-8 text-center">
              <p className="text-sm text-slate-500">لا توجد نتائج مطابقة للبحث</p>
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
                      <button
                        onClick={() => toggleDoctor(d.doctor_id)}
                        className={`mt-1 w-5 h-5 rounded-lg border-2 flex items-center justify-center shrink-0 transition ${
                          isSelected ? "bg-sky-500 border-sky-500" : "border-slate-300 hover:border-sky-400"
                        }`}
                      >
                        {isSelected && (
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3">
                            <path d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                      </button>
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
                      {isSelected && (
                        <div className="w-6 h-6 rounded-full bg-sky-500 text-white flex items-center justify-center text-[10px] font-bold shrink-0">
                          {Array.from(selected.keys()).indexOf(d.doctor_id) + 1}
                        </div>
                      )}
                    </div>
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

      {/* Active Step - Visit Queue */}
      {step === "active" && (
        <div className="space-y-2">
          {activeVisits.map((v, idx) => {
            const isCompleted = v.status === "COMPLETED";
            const isCurrent = !isCompleted && v.visit_id === currentVisit?.visit_id;
            const purposeLabel = VISIT_PURPOSES.find((p) => p.value === v.visit_purpose)?.label || v.visit_purpose;

            return (
              <div
                key={v.visit_id}
                className={`bg-white border rounded-xl p-4 transition-all ${
                  isCompleted
                    ? "border-emerald-200 bg-emerald-50/50"
                    : isCurrent
                    ? "border-sky-400 ring-2 ring-sky-100 shadow-sm"
                    : "border-slate-200 opacity-60"
                }`}
              >
                <div className="flex items-start gap-3">
                  {/* Status circle */}
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                      isCompleted
                        ? "bg-emerald-500 text-white"
                        : isCurrent
                        ? "bg-sky-500 text-white animate-pulse"
                        : "bg-slate-200 text-slate-500"
                    }`}
                  >
                    {isCompleted ? (
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3">
                        <path d="M5 13l4 4L19 7" />
                      </svg>
                    ) : (
                      idx + 1
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className={`text-sm font-bold ${isCompleted ? "text-emerald-700" : "text-slate-800"}`}>
                        {v.doctor_name}
                      </h3>
                      {isCompleted && (
                        <span className="px-2 py-0.5 text-[9px] font-bold bg-emerald-100 text-emerald-700 rounded-full">
                          مكتملة
                        </span>
                      )}
                      {isCurrent && (
                        <span className="px-2 py-0.5 text-[9px] font-bold bg-sky-100 text-sky-700 rounded-full">
                          الحالية
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] text-slate-500 mt-0.5">{purposeLabel}</div>

                    <div className="flex items-center gap-2 mt-2">
                      {!isCompleted && (
                        <a
                          href={`/rep/visits/${v.visit_id}`}
                          className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition ${
                            isCurrent
                              ? "bg-sky-500 text-white hover:bg-sky-600"
                              : "bg-white border border-slate-200 text-slate-700 hover:border-sky-300"
                          }`}
                        >
                          {isCurrent ? (
                            <>
                              <Icon d={icons.navigation} size={12} />
                              ابدأ الآن
                            </>
                          ) : (
                            "انتظار"
                          )}
                        </a>
                      )}
                      {isCompleted && (
                        <span className="inline-flex items-center gap-1 text-xs text-emerald-600 font-medium">
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                            <path d="M5 13l4 4L19 7" />
                          </svg>
                          تم الإكمال
                        </span>
                      )}
                      {v.latitude && v.longitude && (
                        <a
                          href={`https://www.google.com/maps/dir/?api=1&destination=${v.latitude},${v.longitude}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 text-[10px] font-medium bg-teal-50 text-teal-600 rounded-lg border border-teal-200 hover:bg-teal-100 transition"
                        >
                          <Icon d={icons.navigation} size={10} />
                          اتجاه
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Done Step */}
      {step === "done" && (
        <div className="space-y-4">
          <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-6 text-center">
            <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-3">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2.5">
                <path d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <p className="text-base font-bold text-emerald-800">أحسنت! خلصت كل الزيارات</p>
            <p className="text-xs text-emerald-600 mt-1">
              {activeVisits.length} زيارة مكتملة
            </p>
          </div>

          <div className="space-y-2">
            {activeVisits.map((v, idx) => (
              <div key={v.visit_id} className="bg-white border border-emerald-200 rounded-xl p-3 flex items-center gap-3">
                <div className="w-7 h-7 rounded-full bg-emerald-500 text-white flex items-center justify-center shrink-0">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3">
                    <path d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-bold text-slate-800">{v.doctor_name}</div>
                  <div className="text-[11px] text-slate-500">
                    {VISIT_PURPOSES.find((p) => p.value === v.visit_purpose)?.label || v.visit_purpose}
                  </div>
                </div>
                <span className="text-[10px] text-emerald-600 font-medium">تم</span>
              </div>
            ))}
          </div>

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
