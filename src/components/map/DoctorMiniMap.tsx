"use client";

import { MapContainer, TileLayer, Marker, Circle, Popup } from "react-leaflet";
import L from "leaflet";

const doctorIcon = L.divIcon({
  className: "nemora-doctor-marker",
  html: `<div style="position:relative">
    <div style="position:absolute;inset:-8px;border-radius:9999px;background:#0ea5e9;opacity:0.2;animation:pulseDot 2s ease-in-out infinite;"></div>
    <div style="position:relative;width:32px;height:32px;border-radius:9999px;background:#0ea5e9;color:#fff;display:flex;align-items:center;justify-content:center;border:3px solid #fff;box-shadow:0 4px 12px rgba(0,0,0,0.2);">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
        <path d="M12 22s-8-7.58-8-13a8 8 0 1 1 16 0c0 5.42-8 13-8 13z M12 11a2 2 0 1 0 0-4 2 2 0 0 0 0 4z"/>
      </svg>
    </div>
  </div>`,
  iconSize: [32, 32],
  iconAnchor: [16, 16],
});

export function DoctorMiniMap({
  latitude,
  longitude,
  radiusMeters = 100,
  label,
}: {
  latitude: number;
  longitude: number;
  radiusMeters?: number;
  label?: string;
}) {
  return (
    <div className="relative w-full h-full rounded-2xl overflow-hidden">
      <MapContainer
        center={[latitude, longitude]}
        zoom={16}
        scrollWheelZoom={false}
        style={{ width: "100%", height: "100%" }}
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        />
        <Circle
          center={[latitude, longitude]}
          radius={radiusMeters}
          pathOptions={{ color: "#0ea5e9", fillColor: "#0ea5e9", fillOpacity: 0.1, weight: 2, dashArray: "5 5" }}
        />
        <Marker position={[latitude, longitude]} icon={doctorIcon}>
          {label && (
            <Popup>
              <div style={{ fontWeight: 600 }}>{label}</div>
            </Popup>
          )}
        </Marker>
      </MapContainer>
    </div>
  );
}