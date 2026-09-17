"use client";

import { useEffect, useMemo, useState, useRef } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { Doctor, getMyDoctors, Visit, getVisits } from "@/lib/api";
import { Icon, icons } from "@/components/ui/Icons";

const STATUS_COLORS: Record<string, string> = {
  PLANNED: "#3b82f6",
  CHECKED_IN: "#f59e0b",
  COMPLETED: "#10b981",
  MISSED: "#ef4444",
};

function getVisitStatusForDoctor(doctorId: string, visits: Visit[]): string {
  const doctorVisits = visits.filter((v) => v.doctor_id === doctorId);
  if (doctorVisits.some((v) => v.status === "CHECKED_IN")) return "CHECKED_IN";
  if (doctorVisits.some((v) => v.status === "COMPLETED")) return "COMPLETED";
  if (doctorVisits.some((v) => v.status === "MISSED")) return "MISSED";
  if (doctorVisits.some((v) => v.status === "PLANNED")) return "PLANNED";
  return "NONE";
}

function getStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    PLANNED: "مخطط",
    CHECKED_IN: "نشطة",
    COMPLETED: "مكتملة",
    MISSED: "فائتة",
    NONE: "لم تُ plan",
  };
  return labels[status] || status;
}

function getStatusColor(status: string): string {
  const colors: Record<string, string> = {
    PLANNED: "bg-blue-100 text-blue-700 border-blue-200",
    CHECKED_IN: "bg-amber-100 text-amber-700 border-amber-200",
    COMPLETED: "bg-emerald-100 text-emerald-700 border-emerald-200",
    MISSED: "bg-red-100 text-red-700 border-red-200",
    NONE: "bg-slate-100 text-slate-600 border-slate-200",
  };
  return colors[status] || colors.NONE;
}

const DoctorMapInner = dynamic(() => import("./MapInner"), { ssr: false, loading: () => (
  <div className="w-full h-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center rounded-2xl" style={{ height: 400 }}>
    <div className="w-5 h-5 border-2 border-slate-300 border-t-sky-500 rounded-full animate-spin" />
  </div>
)});

export default function DoctorMapPage() {
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [visits, setVisits] = useState<Visit[]>([]);
  const [loading, setLoading] = useState(true);
  const [userPos, setUserPos] = useState<{ lat: number; lng: number } | null>(null);
  const [selectedDoctor, setSelectedDoctor] = useState<Doctor | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const [docs, vis] = await Promise.all([
          getMyDoctors().catch(() => []),
          getVisits({ limit: 100 }).catch(() => ({ items: [], total: 0 })),
        ]);
        setDoctors(docs);
        setVisits(vis.items || []);
      } catch {}
      setLoading(false);
    })();
  }, []);

  useEffect(() => {
    if (!navigator.geolocation) return;
    const id = navigator.geolocation.watchPosition(
      (pos) => setUserPos({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => {},
      { enableHighAccuracy: true, timeout: 10000 }
    );
    return () => navigator.geolocation.clearWatch(id);
  }, []);

  const doctorsWithCoords = useMemo(
    () => doctors.filter((d) => d.latitude != null && d.longitude != null),
    [doctors]
  );

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">خريطة الأطباء</h1>
        <p className="text-sm text-slate-600 dark:text-slate-400 mt-0.5">
          {loading ? "جاري التحميل..." : `${doctorsWithCoords.length} طبيب على الخريطة`}
        </p>
      </div>

      {loading ? (
        <div className="rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 h-96 animate-pulse" />
      ) : doctorsWithCoords.length === 0 ? (
        <div className="rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-12 text-center">
          <div className="w-14 h-14 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center text-slate-400 mx-auto mb-4">
            <Icon d={icons.doctors} size={26} />
          </div>
          <div className="text-base font-semibold text-slate-900 dark:text-white mb-1">مفيش أطباء بال GPS</div>
          <p className="text-xs text-slate-500 dark:text-slate-400">مفيش أطباء معيّنين عندك عليهم إحداثيات GPS</p>
        </div>
      ) : (
        <div className="relative">
          <div className="rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-700" style={{ height: "70vh", minHeight: 400 }}>
            <DoctorMapInner
              center={userPos ? [userPos.lat, userPos.lng] : doctorsWithCoords.length > 0 ? [doctorsWithCoords.reduce((s, d) => s + (d.latitude || 0), 0) / doctorsWithCoords.length, doctorsWithCoords.reduce((s, d) => s + (d.longitude || 0), 0) / doctorsWithCoords.length] : [30.0444, 31.2357]}
              doctors={doctorsWithCoords}
              visits={visits}
              userPos={userPos}
              onSelectDoctor={setSelectedDoctor}
              selectedDoctor={selectedDoctor}
            />
          </div>

          <div className="absolute top-3 right-3 z-[1000] bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700 p-2 space-y-1">
            {Object.entries(STATUS_COLORS).map(([status, color]) => (
              <div key={status} className="flex items-center gap-1.5 text-[10px] text-slate-600 dark:text-slate-400">
                <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: color }} />
                {getStatusLabel(status)}
              </div>
            ))}
            <div className="flex items-center gap-1.5 text-[10px] text-slate-600 dark:text-slate-400">
              <span className="w-3 h-3 rounded-full shrink-0 bg-sky-500 border-2 border-white shadow" />
              موقعك
            </div>
          </div>
        </div>
      )}

      {selectedDoctor && (
        <DoctorSheet doctor={selectedDoctor} visits={visits} onClose={() => setSelectedDoctor(null)} />
      )}
    </div>
  );
}

function DoctorSheet({ doctor, visits, onClose }: { doctor: Doctor; visits: Visit[]; onClose: () => void }) {
  const status = getVisitStatusForDoctor(doctor.id, visits);
  const doctorVisits = visits.filter((v) => v.doctor_id === doctor.id);
  const lastVisit = doctorVisits.filter((v) => v.status === "COMPLETED").sort((a, b) => new Date(b.checked_out_at || b.created_at).getTime() - new Date(a.checked_out_at || a.created_at).getTime())[0];

  return (
    <div className="fixed bottom-0 inset-x-0 z-50 bg-white dark:bg-slate-800 rounded-t-2xl shadow-2xl border-t border-slate-200 dark:border-slate-700 p-5 max-h-[60vh] overflow-y-auto">
      <div className="flex items-start justify-between gap-3 mb-4">
        <div className="flex items-start gap-3 min-w-0">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-sky-500 to-teal-500 text-white flex items-center justify-center font-bold text-lg shrink-0">
            {doctor.full_name?.charAt(0) || "?"}
          </div>
          <div className="min-w-0">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white truncate">{doctor.full_name}</h3>
            {doctor.specialty && <div className="text-[11px] text-slate-500 dark:text-slate-400">{doctor.specialty}</div>}
            {doctor.area && <div className="text-[11px] text-slate-400">{doctor.area}</div>}
          </div>
        </div>
        <button onClick={onClose} className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400">
          <Icon d={icons.close} size={18} />
        </button>
      </div>

      <div className="flex items-center gap-2 mb-3">
        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border ${getStatusColor(status)}`}>
          {getStatusLabel(status)}
        </span>
        {doctor.priority && (
          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
            doctor.priority === "HIGH" ? "bg-red-100 text-red-700 border-red-200" :
            doctor.priority === "MEDIUM" ? "bg-amber-100 text-amber-700 border-amber-200" :
            "bg-slate-100 text-slate-600 border-slate-200"
          }`}>
            {doctor.priority === "HIGH" ? "أولوية عالية" : doctor.priority === "MEDIUM" ? "أولوية متوسطة" : "أولوية منخفضة"}
          </span>
        )}
      </div>

      <div className="grid grid-cols-3 gap-2 mb-4">
        <div className="rounded-xl bg-slate-50 dark:bg-slate-700 p-2.5 text-center">
          <div className="text-lg font-bold text-slate-900 dark:text-white">{doctorVisits.length}</div>
          <div className="text-[10px] text-slate-500 dark:text-slate-400">زيارة</div>
        </div>
        <div className="rounded-xl bg-slate-50 dark:bg-slate-700 p-2.5 text-center">
          <div className="text-lg font-bold text-slate-900 dark:text-white">{doctorVisits.filter((v) => v.status === "COMPLETED").length}</div>
          <div className="text-[10px] text-slate-500 dark:text-slate-400">مكتملة</div>
        </div>
        <div className="rounded-xl bg-slate-50 dark:bg-slate-700 p-2.5 text-center">
          <div className="text-lg font-bold text-slate-900 dark:text-white">{doctorVisits.filter((v) => v.status === "MISSED").length}</div>
          <div className="text-[10px] text-slate-500 dark:text-slate-400">فائتة</div>
        </div>
      </div>

      {lastVisit && (
        <div className="rounded-xl bg-slate-50 dark:bg-slate-700 p-3 mb-3">
          <div className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 mb-1">آخر زيارة مكتملة</div>
          <div className="text-xs text-slate-700 dark:text-slate-200">
            {new Date(lastVisit.checked_out_at || lastVisit.created_at).toLocaleDateString("ar-EG")} — {lastVisit.duration_minutes ? `${lastVisit.duration_minutes} دقيقة` : "—"}
          </div>
          {lastVisit.feedback_overall && (
            <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">{lastVisit.feedback_overall}</div>
          )}
        </div>
      )}

      <div className="flex gap-2">
        {doctor.phone && (
          <a href={`tel:${doctor.phone}`} className="flex-1 py-2.5 rounded-xl bg-slate-900 dark:bg-white dark:text-slate-900 text-white text-xs font-semibold text-center">
            اتصال
          </a>
        )}
        <Link href={`/rep/visits/new?doctor_id=${doctor.id}`} className="flex-1 py-2.5 rounded-xl bg-sky-500 text-white text-xs font-semibold text-center">
          زيارة جديدة
        </Link>
        <Link href={`/rep/my-doctors`} className="py-2.5 px-4 rounded-xl bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-200 text-xs font-semibold">
          التفاصيل
        </Link>
      </div>
    </div>
  );
}
