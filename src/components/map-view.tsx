'use client';

import React, { useState, useEffect, useMemo } from 'react';
import dynamic from 'next/dynamic';
import { Navigation, UserPlus } from 'lucide-react';
import { formatDistance } from '@/lib/geo';
import { useTranslations } from '@/lib/use-translations';

const MapContainer = dynamic(
  () => import('react-leaflet').then(mod => mod.MapContainer),
  { ssr: false }
);
const TileLayer = dynamic(
  () => import('react-leaflet').then(mod => mod.TileLayer),
  { ssr: false }
);
const Marker = dynamic(
  () => import('react-leaflet').then(mod => mod.Marker),
  { ssr: false }
);
const Popup = dynamic(
  () => import('react-leaflet').then(mod => mod.Popup),
  { ssr: false }
);

interface MapDoctor {
  id: string;
  name: string;
  specialty?: string;
  latitude: number;
  longitude: number;
  distance: number;
  address?: string;
}

interface MapViewProps {
  doctors: MapDoctor[];
  userLocation: { latitude: number; longitude: number };
  onDoctorClick?: (doctorId: string) => void;
  onAddToList?: (doctorId: string) => void;
  onNavigate?: (doctorId: string) => void;
  selectedDoctorId?: string;
  height?: string;
}

export function MapView({
  doctors,
  userLocation,
  onDoctorClick,
  onAddToList,
  onNavigate,
  selectedDoctorId,
  height = '100%',
}: MapViewProps) {
  const t = useTranslations();
  const [mounted, setMounted] = useState(false);
  const [L, setLeaflet] = useState<typeof import('leaflet') | null>(null);

  useEffect(() => {
    setMounted(true);
    import('leaflet').then(mod => setLeaflet(mod));
  }, []);

  const userPosition: [number, number] = [userLocation.latitude, userLocation.longitude];

  const doctorIcon = useMemo(() => {
    if (!L) return undefined;
    return L.icon({
      iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-teal.png',
      shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
      iconSize: [25, 41],
      iconAnchor: [12, 41],
      popupAnchor: [1, -34],
      shadowSize: [41, 41],
    });
  }, [L]);

  const userIcon = useMemo(() => {
    if (!L) return undefined;
    return L.icon({
      iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png',
      shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
      iconSize: [25, 41],
      iconAnchor: [12, 41],
      popupAnchor: [1, -34],
      shadowSize: [41, 41],
    });
  }, [L]);

  const defaultCenter: [number, number] = doctors.length > 0
    ? [doctors[0].latitude, doctors[0].longitude]
    : userPosition;

  if (!mounted) {
    return (
      <div style={{ height }} className="w-full bg-slate-200 dark:bg-slate-700 animate-pulse flex items-center justify-center rounded-lg">
        <p className="text-slate-500 dark:text-slate-400">{t.loading}</p>
      </div>
    );
  }

  return (
    <div style={{ height }} className="w-full relative rounded-lg overflow-hidden">
      <MapContainer
        center={defaultCenter}
        zoom={12}
        style={{ height: '100%', width: '100%' }}
        zoomControl={false}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap contributors</a>'
          url={process.env.NEXT_PUBLIC_MAP_TILE_URL || 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'}
        />
        
        {userIcon && (
          <Marker position={userPosition} icon={userIcon}>
            <Popup>
              <div className="text-center p-1">
                <p className="font-medium">{t.home}</p>
              </div>
            </Popup>
          </Marker>
        )}

        {doctorIcon && doctors.map((doctor) => (
          <Marker
            key={doctor.id}
            position={[doctor.latitude, doctor.longitude]}
            icon={doctorIcon}
            eventHandlers={{
              click: () => onDoctorClick?.(doctor.id),
            }}
          >
            <Popup>
              <div className="p-1 min-w-[180px]">
                <p className="font-semibold text-slate-900">{doctor.name}</p>
                <p className="text-sm text-slate-600">{doctor.specialty}</p>
                <p className="text-sm text-slate-500 mt-1">{formatDistance(doctor.distance)}</p>
                {doctor.address && (
                  <p className="text-xs text-slate-400 mt-1">{doctor.address}</p>
                )}
                <div className="flex gap-2 mt-3">
                  {onDoctorClick && (
                    <button
                      onClick={() => onDoctorClick(doctor.id)}
                      className="flex-1 px-3 py-1.5 bg-teal-600 text-white text-sm rounded-lg hover:bg-teal-700 transition-colors"
                    >
                      {t.viewProfile}
                    </button>
                  )}
                  {onNavigate && (
                    <button
                      onClick={() => onNavigate(doctor.id)}
                      className="px-3 py-1.5 border border-slate-300 text-slate-600 text-sm rounded-lg hover:bg-slate-50 transition-colors"
                    >
                      {t.navigate}
                    </button>
                  )}
                  {onAddToList && (
                    <button
                      onClick={() => onAddToList(doctor.id)}
                      className="px-3 py-1.5 border border-slate-300 text-slate-600 text-sm rounded-lg hover:bg-slate-50 transition-colors"
                    >
                      <UserPlus className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}

export default MapView;
