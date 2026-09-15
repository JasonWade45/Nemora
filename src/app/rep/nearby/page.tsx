"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Doctor, buildMapsUrl, doctorDisplayName, getAllDoctors } from "@/lib/api";
import { Icon, icons } from "@/components/ui/Icons";

function distanceMeters(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000;
  const toRad = (x: number) => (x * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

function formatDistance(m: number): string {
  if (m < 1000) return `${Math.round(m)} م`;
  return `${(m / 1000).toFixed(2)} كم`;
}

export default function NearbyPage() {
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [gpsStatus, setGpsStatus] = useState<"loading" | "ok" | "denied" | "unsupported">("loading");
  const [loading, setLoading] = useState(true);
  const [radius, setRadius] = useState(2000);

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
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setGpsStatus("unsupported");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setGpsStatus("ok");
      },
      () => setGpsStatus("denied"),
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
    );
  }, []);

  const nearby = useMemo(() => {
    if (!coords) return [];
    return doctors
      .map((d) => {
        if (d.latitude == null || d.longitude == null) return null;
        const dist = distanceMeters(coords.lat, coords.lng, d.latitude, d.longitude);
        return { doctor: d, distance: dist };
      })
      .filter((x): x is { doctor: Doctor; distance: number } => x !== null && x.distance <= radius)
      .sort((a, b) => a.distance - b.distance);
  }, [doctors, coords, radius]);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">أطباء قريبون</h1>
        <p className="text-sm text-slate-600 mt-0.5">
          {gpsStatus === "loading" && "جاري تحديد موقعك..."}
          {gpsStatus === "ok" && coords && `موقعك: ${coords.lat.toFixed(4)}, ${coords.lng.toFixed(4)}`}
          {gpsStatus === "denied" && "الموقع غير مفعّل — فعّل GPS في المتصفح"}
          {gpsStatus === "unsupported" && "GPS غير مدعوم في المتصفح"}
        </p>
      </div>

      <div className="flex gap-2">
        {[500, 1000, 2000, 5000].map((r) => (
          <button
            key={r}
            onClick={() => setRadius(r)}
            className={
              "px-3 py-1.5 rounded-full text-xs font-medium border transition " +
              (radius === r
                ? "bg-sky-500 text-white border-sky-500"
                : "bg-white text-slate-600 border-slate-200")
            }
          >
            {r < 1000 ? `${r} م` : `${r / 1000} كم`}
          </button>
        ))}
      </div>

      {gpsStatus === "loading" ? (
        <div className="rounded-2xl bg-white border border-slate-200 p-10 text-center">
          <div className="w-6 h-6 border-2 border-slate-300 border-t-sky-500 rounded-full animate-spin mx-auto mb-3" />
          <div className="text-sm text-slate-600">جاري تحديد موقعك...</div>
        </div>
      ) : gpsStatus !== "ok" ? (
        <div className="rounded-2xl bg-amber-50 border border-amber-200 p-6 text-center">
          <div className="text-sm font-medium text-amber-900 mb-1">لازم تفعّل الموقع</div>
          <p className="text-xs text-amber-700">
            {gpsStatus === "denied"
              ? "اضغط على أيقونة القفل في شريط العنوان، وفعّل الموقع."
              : "المتصفح لا يدعم GPS."}
          </p>
        </div>
      ) : loading ? (
        <div className="rounded-2xl bg-white border border-slate-200 p-10 text-center text-sm text-slate-500">
          جاري التحميل...
        </div>
      ) : nearby.length === 0 ? (
        <div className="rounded-2xl bg-white border border-slate-200 p-10 text-center">
          <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 mx-auto mb-3">
            <Icon d={icons.pin} size={22} />
          </div>
          <div className="text-sm font-medium text-slate-900 mb-1">لا يوجد أطباء في النطاق</div>
          <p className="text-xs text-slate-500">جرّب توسيع النطاق</p>
        </div>
      ) : (
        <div className="space-y-2">
          {nearby.map(({ doctor, distance }) => {
            const name = doctorDisplayName(doctor);
            const mapsUrl = buildMapsUrl(doctor);
            return (
              <div key={doctor.id} className="rounded-2xl bg-white border border-slate-200 p-4">
                <div className="flex items-start gap-3">
                  <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-sky-500 to-teal-500 text-white flex items-center justify-center text-xs font-bold shrink-0">
                    {name.slice(0, 2)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <h3 className="text-sm font-bold text-slate-900 truncate">{name}</h3>
                        {doctor.specialty && (
                          <div className="text-[11px] text-slate-500 mt-0.5">{doctor.specialty}</div>
                        )}
                      </div>
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-teal-50 text-teal-700 border border-teal-100 shrink-0">
                        <Icon d={icons.pin} size={10} />
                        {formatDistance(distance)}
                      </span>
                    </div>
                    {doctor.address && (
                      <div className="text-[11px] text-slate-500 mt-1.5 truncate">{doctor.address}</div>
                    )}
                  </div>
                </div>
                <div className="flex gap-2 mt-3">
                  <a
                    href={mapsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg bg-gradient-to-r from-sky-500 to-teal-500 text-white text-xs font-medium"
                  >
                    <Icon d={icons.navigation} size={13} />
                    وصّلني
                  </a>
                  {doctor.phone && (
                    <a
                      href={`tel:${doctor.phone}`}
                      className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg bg-white border border-slate-200 text-slate-700 text-xs font-medium"
                    >
                      <Icon d={icons.phone} size={13} />
                      اتصال
                    </a>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}