"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
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

export default function DoctorMapPage() {
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [visits, setVisits] = useState<Visit[]>([]);
  const [loading, setLoading] = useState(true);
  const [userPos, setUserPos] = useState<{ lat: number; lng: number } | null>(null);
  const [selectedDoctor, setSelectedDoctor] = useState<Doctor | null>(null);
  const [mapLoaded, setMapLoaded] = useState(false);

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

  const center = useMemo(() => {
    if (userPos) return [userPos.lat, userPos.lng] as [number, number];
    if (doctorsWithCoords.length > 0) {
      const avgLat = doctorsWithCoords.reduce((s, d) => s + (d.latitude || 0), 0) / doctorsWithCoords.length;
      const avgLng = doctorsWithCoords.reduce((s, d) => s + (d.longitude || 0), 0) / doctorsWithCoords.length;
      return [avgLat, avgLng] as [number, number];
    }
    return [30.0444, 31.2357] as [number, number];
  }, [userPos, doctorsWithCoords]);

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
          <div id="doctor-map" className="rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-700" style={{ height: "70vh", minHeight: 400 }}>
            <MapComponent
              center={center}
              doctors={doctorsWithCoords}
              visits={visits}
              userPos={userPos}
              onSelectDoctor={setSelectedDoctor}
              selectedDoctor={selectedDoctor}
              onMapReady={() => setMapLoaded(true)}
            />
          </div>

          {/* Legend */}
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

      {/* Doctor detail bottom sheet */}
      {selectedDoctor && (
        <DoctorSheet doctor={selectedDoctor} visits={visits} onClose={() => setSelectedDoctor(null)} />
      )}
    </div>
  );
}

function MapComponent({ center, doctors, visits, userPos, onSelectDoctor, selectedDoctor, onMapReady }: {
  center: [number, number];
  doctors: Doctor[];
  visits: Visit[];
  userPos: { lat: number; lng: number } | null;
  onSelectDoctor: (d: Doctor) => void;
  selectedDoctor: Doctor | null;
  onMapReady: () => void;
}) {
  const [MapContainer, setMapContainer] = useState<any>(null);
  const [TileLayer, setTileLayer] = useState<any>(null);
  const [Marker, setMarker] = useState<any>(null);
  const [Popup, setPopup] = useState<any>(null);
  const [useEffect, setUseEffect] = useState<any>(null);
  const [useRef, setUseRef] = useState<any>(null);

  useEffect(() => {
    Promise.all([
      import("react-leaflet"),
      import("leaflet"),
    ]).then(([rl, L]) => {
      setMapContainer(() => rl.MapContainer);
      setTileLayer(() => rl.TileLayer);
      setMarker(() => rl.Marker);
      setPopup(() => rl.Popup);
      setUseEffect(() => rl.useEffect);
      setUseRef(() => rl.useRef);

      // Fix default marker icon
      delete (L.Icon.Default.prototype as any)._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
        iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
        shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
      });
      onMapReady();
    });
  }, []);

  if (!MapContainer) {
    return <div className="w-full h-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center"><div className="w-5 h-5 border-2 border-slate-300 border-t-sky-500 rounded-full animate-spin" /></div>;
  }

  return (
    <MapContainer center={center} zoom={12} style={{ height: "100%", width: "100%" }} zoomControl={false}>
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {userPos && <UserMarker position={userPos} />}
      {doctors.map((d) => (
        <DoctorMarker
          key={d.id}
          doctor={d}
          visits={visits}
          isSelected={selectedDoctor?.id === d.id}
          onClick={() => onSelectDoctor(d)}
        />
      ))}
    </MapContainer>
  );
}

function UserMarker({ position }: { position: { lat: number; lng: number } }) {
  const [Marker, setMarker] = useState<any>(null);
  const [useEffect, setUseEffect] = useState<any>(null);

  useEffect(() => {
    import("react-leaflet").then((rl) => {
      setMarker(() => rl.Marker);
      setUseEffect(() => rl.useEffect);
    });
  }, []);

  if (!Marker) return null;

  const L = require("leaflet");
  const userIcon = new L.DivIcon({
    className: "",
    html: `<div style="width:20px;height:20px;background:#0ea5e9;border:3px solid white;border-radius:50%;box-shadow:0 0 10px rgba(14,165,233,0.5);"></div>`,
    iconSize: [20, 20],
    iconAnchor: [10, 10],
  });

  return <Marker position={[position.lat, position.lng]} icon={userIcon} />;
}

function DoctorMarker({ doctor, visits, isSelected, onClick }: {
  doctor: Doctor;
  visits: Visit[];
  isSelected: boolean;
  onClick: () => void;
}) {
  const [Marker, setMarker] = useState<any>(null);
  const [Popup, setPopup] = useState<any>(null);

  useEffect(() => {
    import("react-leaflet").then((rl) => {
      setMarker(() => rl.Marker);
      setPopup(() => rl.Popup);
    });
  }, []);

  if (!Marker) return null;

  const status = getVisitStatusForDoctor(doctor.id, visits);
  const color = STATUS_COLORS[status] || "#94a3b8";

  const L = require("leaflet");
  const doctorIcon = new L.DivIcon({
    className: "",
    html: `<div style="
      width:${isSelected ? 36 : 28}px;
      height:${isSelected ? 36 : 28}px;
      background:${color};
      border:3px solid white;
      border-radius:50%;
      box-shadow:0 2px 8px rgba(0,0,0,0.3);
      display:flex;
      align-items:center;
      justify-content:center;
      color:white;
      font-size:${isSelected ? 14 : 11}px;
      font-weight:bold;
      transition:all 0.2s;
    ">${doctor.full_name?.charAt(0) || "?"}</div>`,
    iconSize: [isSelected ? 36 : 28, isSelected ? 36 : 28],
    iconAnchor: [isSelected ? 18 : 14, isSelected ? 18 : 14],
  });

  return (
    <Marker
      position={[doctor.latitude!, doctor.longitude!]}
      icon={doctorIcon}
      eventHandlers={{ click: onClick }}
    >
      <Popup>
        <div style={{ direction: "rtl", textAlign: "right", minWidth: 150 }}>
          <div style={{ fontWeight: "bold", fontSize: 14 }}>{doctor.full_name}</div>
          {doctor.specialty && <div style={{ fontSize: 12, color: "#666" }}>{doctor.specialty}</div>}
          <div style={{ fontSize: 11, color: "#888", marginTop: 4 }}>{getStatusLabel(status)}</div>
        </div>
      </Popup>
    </Marker>
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
