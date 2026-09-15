"use client";

import { useEffect, useMemo, useState } from "react";
import { MapContainer, TileLayer, Marker, Popup, Circle, Polyline, useMap } from "react-leaflet";
import L from "leaflet";
import type { TeamLocation, TrackPoint, HeatmapPoint } from "@/lib/api";

function makeIcon(color: string, initials: string) {
  return L.divIcon({
    className: "nemora-marker",
    html: `<div style="position:relative">
      <div style="position:absolute;inset:-6px;border-radius:9999px;background:${color};opacity:0.18;"></div>
      <div style="position:relative;width:34px;height:34px;border-radius:9999px;background:${color};color:#fff;display:flex;align-items:center;justify-content:center;font-weight:600;font-size:11px;border:2px solid #fff;box-shadow:0 4px 12px rgba(0,0,0,0.18);">
        ${initials}
      </div>
    </div>`,
    iconSize: [34, 34],
    iconAnchor: [17, 17],
  });
}

function makeMeIcon() {
  return L.divIcon({
    className: "nemora-me-marker",
    html: `<div style="position:relative">
      <div style="position:absolute;inset:-10px;border-radius:9999px;background:#0ea5e9;opacity:0.2;animation:pulseDot 2s ease-in-out infinite;"></div>
      <div style="position:relative;width:18px;height:18px;border-radius:9999px;background:#0ea5e9;border:3px solid #fff;box-shadow:0 4px 12px rgba(14,165,233,0.5);"></div>
    </div>`,
    iconSize: [18, 18],
    iconAnchor: [9, 9],
  });
}

function FitBounds({ points }: { points: { lat: number; lng: number }[] }) {
  const map = useMap();
  useEffect(() => {
    if (points.length === 0) return;
    if (points.length === 1) {
      map.setView([points[0].lat, points[0].lng], 13);
      return;
    }
    const bounds = L.latLngBounds(points.map(p => [p.lat, p.lng]));
    map.fitBounds(bounds, { padding: [60, 60] });
  }, [points, map]);
  return null;
}

function heatColor(w: number) {
  if (w >= 0.75) return "#dc2626";
  if (w >= 0.5) return "#f97316";
  if (w >= 0.25) return "#facc15";
  return "#22c55e";
}

export function LiveMap({
  team,
  selectedUserId,
  track,
  heatmap,
  showHeatmap,
}: {
  team: TeamLocation[];
  selectedUserId: string | null;
  track: TrackPoint[] | null;
  heatmap: HeatmapPoint[];
  showHeatmap: boolean;
}) {
  const [myPos, setMyPos] = useState<[number, number] | null>(null);
  const [locError, setLocError] = useState<string | null>(null);

  useEffect(() => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setLocError("Geolocation is not supported by this browser.");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setMyPos([pos.coords.latitude, pos.coords.longitude]);
      },
      (err) => {
        setLocError(err.message || "Location access was denied.");
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 30000 }
    );
  }, []);

  const withLocation = useMemo(
    () => team.filter(t => t.latitude != null && t.longitude != null),
    [team]
  );

  const center = useMemo<[number, number]>(() => {
    if (myPos) return myPos;
    if (withLocation.length > 0) return [withLocation[0].latitude!, withLocation[0].longitude!];
    return [31.2001, 29.9187]; // Alexandria fallback
  }, [myPos, withLocation]);

  const trackPoints: [number, number][] = useMemo(
    () => (track ?? []).map(p => [p.latitude, p.longitude]),
    [track]
  );

  const fitPoints = useMemo(() => {
    const arr: { lat: number; lng: number }[] = withLocation.map(t => ({ lat: t.latitude!, lng: t.longitude! }));
    if (myPos) arr.push({ lat: myPos[0], lng: myPos[1] });
    return arr;
  }, [withLocation, myPos]);

  return (
    <div className="relative w-full h-full rounded-2xl overflow-hidden border border-slate-200">
      <MapContainer center={center} zoom={13} style={{ width: "100%", height: "100%" }} scrollWheelZoom>
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        />

        {showHeatmap && heatmap.map((p, i) => (
          <Circle
            key={`h-${i}`}
            center={[p.latitude, p.longitude]}
            radius={180}
            pathOptions={{ color: heatColor(p.weight), fillColor: heatColor(p.weight), fillOpacity: 0.35, stroke: false }}
          />
        ))}

        {trackPoints.length >= 2 && (
          <Polyline positions={trackPoints} pathOptions={{ color: "#0ea5e9", weight: 4, opacity: 0.85 }} />
        )}

        {myPos && (
          <Marker position={myPos} icon={makeMeIcon()}>
            <Popup>
              <div style={{ fontWeight: 600, fontSize: 13 }}>My Location</div>
              <div style={{ fontSize: 11, color: "#64748b", marginTop: 4 }}>
                {myPos[0].toFixed(5)}, {myPos[1].toFixed(5)}
              </div>
            </Popup>
          </Marker>
        )}

        {withLocation.map(t => {
          const color = t.is_online ? "#14b8a6" : t.shift_status === "ACTIVE" ? "#f59e0b" : "#94a3b8";
          const initials = t.full_name.split(" ").map(n => n[0]).slice(0, 2).join("").toUpperCase();
          return (
            <Marker
              key={t.user_id}
              position={[t.latitude!, t.longitude!]}
              icon={makeIcon(color, initials)}
            >
              <Popup>
                <div style={{ minWidth: 200 }}>
                  <div style={{ fontWeight: 600, marginBottom: 4 }}>{t.full_name}</div>
                  <div style={{ fontSize: 12, color: "#64748b", marginBottom: 6 }}>{t.email}</div>
                  <div style={{ fontSize: 12 }}>
                    <span style={{
                      display: "inline-block", padding: "2px 8px", borderRadius: 9999,
                      background: t.is_online ? "#ccfbf1" : "#f1f5f9",
                      color: t.is_online ? "#0f766e" : "#475569",
                      fontWeight: 500,
                    }}>
                      {t.is_online ? "Online" : t.shift_status === "ACTIVE" ? "On shift" : "Offline"}
                    </span>
                  </div>
                  {t.last_seen && (
                    <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 6 }}>
                      Last seen: {new Date(t.last_seen).toLocaleString()}
                    </div>
                  )}
                </div>
              </Popup>
            </Marker>
          );
        })}

        <FitBounds points={fitPoints} />
      </MapContainer>

      <div className="absolute bottom-3 start-3 z-[400] bg-white/95 backdrop-blur rounded-xl border border-slate-200 shadow-lg px-3 py-2 text-xs">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-sky-500" /> Me</span>
          <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-teal-500" /> Online</span>
          <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-amber-500" /> On shift</span>
          <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-slate-400" /> Offline</span>
        </div>
      </div>

      {locError && (
        <div className="absolute top-3 start-3 z-[400] bg-white/95 backdrop-blur rounded-xl border border-amber-200 shadow-lg px-4 py-3 max-w-xs">
          <div className="text-xs font-semibold text-amber-800 mb-1">Location unavailable</div>
          <div className="text-[11px] text-amber-700">{locError}</div>
        </div>
      )}
    </div>
  );
}