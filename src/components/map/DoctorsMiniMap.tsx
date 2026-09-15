"use client";

import { useEffect, useMemo, useRef } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import type { Doctor } from "@/lib/api";
import { doctorDisplayName, buildMapsUrl } from "@/lib/api";

// Fix Leaflet default icon issue with Next.js
const markerIcon = L.icon({
  iconUrl:
    "data:image/svg+xml;base64," +
    btoa(`
      <svg xmlns="http://www.w3.org/2000/svg" width="25" height="41" viewBox="0 0 25 41">
        <path fill="#0284c7" stroke="#ffffff" stroke-width="1.5" d="M12.5 0C5.6 0 0 5.6 0 12.5c0 8.4 12.5 28.5 12.5 28.5S25 20.9 25 12.5C25 5.6 19.4 0 12.5 0z"/>
        <circle cx="12.5" cy="12.5" r="4.5" fill="#ffffff"/>
      </svg>
    `),
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [0, -36],
});

const activeIcon = L.icon({
  iconUrl:
    "data:image/svg+xml;base64," +
    btoa(`
      <svg xmlns="http://www.w3.org/2000/svg" width="30" height="48" viewBox="0 0 25 41">
        <path fill="#059669" stroke="#ffffff" stroke-width="1.5" d="M12.5 0C5.6 0 0 5.6 0 12.5c0 8.4 12.5 28.5 12.5 28.5S25 20.9 25 12.5C25 5.6 19.4 0 12.5 0z"/>
        <circle cx="12.5" cy="12.5" r="4.5" fill="#ffffff"/>
      </svg>
    `),
  iconSize: [30, 48],
  iconAnchor: [15, 48],
  popupAnchor: [0, -42],
});

function FitBounds({ doctors }: { doctors: Doctor[] }) {
  const map = useMap();
  const didFit = useRef(false);

  useEffect(() => {
    if (didFit.current) return;
    if (doctors.length === 0) return;
    const coords: [number, number][] = doctors
      .filter((d) => d.latitude != null && d.longitude != null)
      .map((d) => [d.latitude!, d.longitude!]);
    if (coords.length === 0) return;
    const bounds = L.latLngBounds(coords);
    map.fitBounds(bounds, { padding: [40, 40], maxZoom: 14 });
    didFit.current = true;
  }, [doctors, map]);

  return null;
}

type Props = {
  doctors: Doctor[];
  activeArea?: string | null | undefined;
};

export function DoctorsMiniMap({ doctors, activeArea }: Props) {
  const center: [number, number] = useMemo(() => {
    const valid = doctors.filter((d) => d.latitude != null && d.longitude != null);
    if (valid.length === 0) return [31.2001, 29.9187]; // Alexandria fallback
    const avgLat = valid.reduce((s, d) => s + d.latitude!, 0) / valid.length;
    const avgLng = valid.reduce((s, d) => s + d.longitude!, 0) / valid.length;
    return [avgLat, avgLng];
  }, [doctors]);

  return (
    <MapContainer
      center={center}
      zoom={12}
      style={{ width: "100%", height: "100%" }}
      scrollWheelZoom={true}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <FitBounds doctors={doctors} />
      {doctors.map((d) => {
        if (d.latitude == null || d.longitude == null) return null;
        const name = doctorDisplayName(d);
        const mapsUrl = buildMapsUrl(d);
        return (
          <Marker
            key={d.id}
            position={[d.latitude, d.longitude]}
            icon={markerIcon}
          >
            <Popup>
              <div dir="rtl" style={{ minWidth: 180 }}>
                <div
                  style={{
                    fontWeight: 700,
                    fontSize: 13,
                    marginBottom: 4,
                    color: "#0f172a",
                  }}
                >
                  {name}
                </div>
                {d.specialty && (
                  <div style={{ fontSize: 11, color: "#64748b", marginBottom: 4 }}>
                    {d.specialty}
                  </div>
                )}
                {d.phone && (
                  <div
                    style={{
                      fontSize: 11,
                      color: "#334155",
                      direction: "ltr",
                      textAlign: "right",
                      marginBottom: 4,
                    }}
                  >
                    📞 {d.phone}
                  </div>
                )}
                {d.address && (
                  <div style={{ fontSize: 10, color: "#64748b", marginBottom: 6 }}>
                    {d.address}
                  </div>
                )}
                <a
                  href={mapsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: "block",
                    textAlign: "center",
                    background: "#0284c7",
                    color: "#fff",
                    padding: "4px 8px",
                    borderRadius: 6,
                    fontSize: 11,
                    fontWeight: 600,
                    textDecoration: "none",
                  }}
                >
                  وصّلني
                </a>
              </div>
            </Popup>
          </Marker>
        );
      })}
    </MapContainer>
  );
}