"use client";

import { useEffect, useMemo } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import { Doctor, Visit } from "@/lib/api";

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

// Fix default marker icon
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
});

function FlyToUser({ position }: { position: { lat: number; lng: number } }) {
  const map = useMap();
  useEffect(() => {
    map.flyTo([position.lat, position.lng], 13, { duration: 1 });
  }, [position, map]);
  return null;
}

type Props = {
  center: [number, number];
  doctors: Doctor[];
  visits: Visit[];
  userPos: { lat: number; lng: number } | null;
  onSelectDoctor: (d: Doctor) => void;
  selectedDoctor: Doctor | null;
};

export default function MapInner({ center, doctors, visits, userPos, onSelectDoctor, selectedDoctor }: Props) {
  const userIcon = useMemo(() => new L.DivIcon({
    className: "",
    html: `<div style="width:20px;height:20px;background:#0ea5e9;border:3px solid white;border-radius:50%;box-shadow:0 0 10px rgba(14,165,233,0.5);"></div>`,
    iconSize: [20, 20],
    iconAnchor: [10, 10],
  }), []);

  return (
    <MapContainer center={center} zoom={12} style={{ height: "100%", width: "100%" }} zoomControl={false}>
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {userPos && <FlyToUser position={userPos} />}
      {userPos && (
        <Marker position={[userPos.lat, userPos.lng]} icon={userIcon}>
          <Popup><div style={{ direction: "rtl", textAlign: "right" }}>موقعك الحالي</div></Popup>
        </Marker>
      )}
      {doctors.map((d) => {
        const status = getVisitStatusForDoctor(d.id, visits);
        const color = STATUS_COLORS[status] || "#94a3b8";
        const isSelected = selectedDoctor?.id === d.id;
        const icon = new L.DivIcon({
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
          ">${d.full_name?.charAt(0) || "?"}</div>`,
          iconSize: [isSelected ? 36 : 28, isSelected ? 36 : 28],
          iconAnchor: [isSelected ? 18 : 14, isSelected ? 18 : 14],
        });

        return (
          <Marker
            key={d.id}
            position={[d.latitude!, d.longitude!]}
            icon={icon}
            eventHandlers={{ click: () => onSelectDoctor(d) }}
          >
            <Popup>
              <div style={{ direction: "rtl", textAlign: "right", minWidth: 150 }}>
                <div style={{ fontWeight: "bold", fontSize: 14 }}>{d.full_name}</div>
                {d.specialty && <div style={{ fontSize: 12, color: "#666" }}>{d.specialty}</div>}
                <div style={{ fontSize: 11, color: "#888", marginTop: 4 }}>{getStatusLabel(status)}</div>
              </div>
            </Popup>
          </Marker>
        );
      })}
    </MapContainer>
  );
}
