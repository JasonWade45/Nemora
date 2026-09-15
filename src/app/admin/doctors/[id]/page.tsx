"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { Doctor, doctorDisplayName, getDoctor, buildMapsUrl } from "@/lib/api";
import { useLanguage } from "@/lib/language-context";
import { Icon, icons } from "@/components/ui/Icons";
import { WorkingHoursSection } from "@/components/doctors/WorkingHoursSection";

const DoctorMiniMap = dynamic(
  () => import("@/components/map/DoctorMiniMap").then(m => m.DoctorMiniMap),
  { ssr: false, loading: () => (
    <div className="w-full h-full flex items-center justify-center bg-slate-100 rounded-2xl">
      <div className="text-xs text-slate-500">Loading map...</div>
    </div>
  )}
);

function initials(name: string) {
  const parts = name.replace(/^(د\.?|د\/|دكتور|دكتورة|Dr\.?|Doctor)\s*/i, "").split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2);
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

export default function DoctorProfilePage() {
  const params = useParams<{ id: string }>();
  const id = params?.id;
  const { lang } = useLanguage();
  const [doctor, setDoctor] = useState<Doctor | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    (async () => {
      try {
        const d = await getDoctor(id);
        setDoctor(d);
      } catch (e: any) {
        setError(e.message || "Failed to load doctor");
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto">
        <div className="animate-pulse space-y-4">
          <div className="h-8 w-32 bg-slate-100 rounded" />
          <div className="h-32 bg-slate-100 rounded-2xl" />
          <div className="h-64 bg-slate-100 rounded-2xl" />
        </div>
      </div>
    );
  }

  if (error || !doctor) {
    return (
      <div className="max-w-6xl mx-auto">
        <Link href="/admin/doctors" className="inline-flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900 mb-4">
          <span className="rtl:rotate-180"><Icon d={icons.arrow_left} size={16} /></span>
          {lang === "ar" ? "رجوع للأطباء" : "Back to doctors"}
        </Link>
        <div className="rounded-2xl bg-red-50 border border-red-200 px-6 py-8 text-center">
          <div className="text-red-700 font-medium mb-1">
            {lang === "ar" ? "تعذّر تحميل بيانات الطبيب" : "Failed to load doctor"}
          </div>
          <p className="text-sm text-red-600">{error}</p>
        </div>
      </div>
    );
  }

  const name = doctorDisplayName(doctor);
  const hasLocation = doctor.latitude != null && doctor.longitude != null;
  const mapsUrl = buildMapsUrl(doctor);

  return (
    <div className="max-w-6xl mx-auto pb-10">
      <Link href="/admin/doctors" className="inline-flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900 mb-4">
        <span className="rtl:rotate-180"><Icon d={icons.arrow_left} size={16} /></span>
        {lang === "ar" ? "رجوع للأطباء" : "Back to doctors"}
      </Link>

      <div className="rounded-2xl bg-gradient-to-br from-slate-900 to-slate-800 text-white p-6 lg:p-8 mb-6 relative overflow-hidden">
        <div className="absolute -top-16 -end-16 w-64 h-64 bg-sky-500/20 rounded-full blur-3xl" />
        <div className="relative flex items-start gap-5">
          <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-sky-500 to-teal-500 flex items-center justify-center text-white font-bold text-2xl shrink-0 shadow-lg">
            {initials(name)}
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl lg:text-3xl font-bold leading-tight">{name}</h1>
            <div className="mt-2 flex flex-wrap items-center gap-2 text-sm">
              {doctor.specialty && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 backdrop-blur border border-white/20">
                  <Icon d={icons.doctors} size={13} />
                  {doctor.specialty}
                </span>
              )}
              {doctor.priority && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/20 border border-amber-400/30 text-amber-200">
                  {doctor.priority}
                </span>
              )}
              {doctor.status && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-teal-500/20 border border-teal-400/30 text-teal-200">
                  {doctor.status}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-5 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <div className="rounded-2xl bg-white border border-slate-200 p-6">
            <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-4">
              {lang === "ar" ? "معلومات التواصل" : "Contact"}
            </h2>
            <div className="space-y-3">
              {doctor.phone && (
                <a href={`tel:${doctor.phone}`} className="flex items-center gap-3 p-3 rounded-xl hover:bg-slate-50 transition group">
                  <span className="w-9 h-9 rounded-lg bg-teal-50 text-teal-600 flex items-center justify-center shrink-0 group-hover:bg-teal-500 group-hover:text-white transition">
                    <Icon d={icons.phone} size={16} />
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="text-[11px] text-slate-500">{lang === "ar" ? "الهاتف" : "Phone"}</div>
                    <div dir="ltr" className="text-sm font-medium text-slate-900 tabular-nums text-start">{doctor.phone}</div>
                  </div>
                </a>
              )}
              {doctor.email && (
                <a href={`mailto:${doctor.email}`} className="flex items-center gap-3 p-3 rounded-xl hover:bg-slate-50 transition group">
                  <span className="w-9 h-9 rounded-lg bg-sky-50 text-sky-600 flex items-center justify-center shrink-0 group-hover:bg-sky-500 group-hover:text-white transition">
                    <Icon d={icons.mail} size={16} />
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="text-[11px] text-slate-500">{lang === "ar" ? "البريد" : "Email"}</div>
                    <div className="text-sm font-medium text-slate-900 truncate text-start">{doctor.email}</div>
                  </div>
                </a>
              )}
              {(doctor.address || doctor.city) && (
                <div className="flex items-start gap-3 p-3 rounded-xl">
                  <span className="w-9 h-9 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
                    <Icon d={icons.pin} size={16} />
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="text-[11px] text-slate-500">{lang === "ar" ? "العنوان" : "Address"}</div>
                    <div className="text-sm font-medium text-slate-900 leading-snug">
                      {[doctor.address, doctor.city, doctor.state].filter(Boolean).join("، ")}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          <a
            href={mapsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="block rounded-2xl bg-gradient-to-r from-sky-500 to-teal-500 hover:from-sky-600 hover:to-teal-600 text-white p-5 transition shadow-lg shadow-sky-500/20"
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-white/20 backdrop-blur flex items-center justify-center shrink-0">
                <Icon d={icons.navigation} size={22} />
              </div>
              <div className="flex-1">
                <div className="font-semibold">{lang === "ar" ? "وصّلني بالدكتور" : "Take me there"}</div>
                <div className="text-xs text-white/80 mt-0.5">
                  {lang === "ar" ? "افتح في خرائط Google" : "Open in Google Maps"}
                </div>
              </div>
              <span className="rtl:rotate-180"><Icon d={icons.chevron} size={18} /></span>
            </div>
          </a>
        </div>

        <div className="lg:col-span-3 space-y-4">
          <div className="rounded-2xl bg-white border border-slate-200 overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-slate-700">
                {lang === "ar" ? "الموقع على الخريطة" : "Location on map"}
              </h2>
              {hasLocation && (
                <span dir="ltr" className="text-[10px] text-slate-400 tabular-nums">
                  {doctor.latitude!.toFixed(4)}, {doctor.longitude!.toFixed(4)}
                </span>
              )}
            </div>
            <div className="h-72">
              {hasLocation ? (
                <DoctorMiniMap latitude={doctor.latitude!} longitude={doctor.longitude!} label={name} />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center bg-slate-50 text-center px-6">
                  <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 mb-3">
                    <Icon d={icons.pin} size={22} />
                  </div>
                  <div className="text-sm font-medium text-slate-700 mb-1">
                    {lang === "ar" ? "لا يوجد إحداثيات محفوظة" : "No coordinates saved"}
                  </div>
                  <p className="text-xs text-slate-500 max-w-xs">
                    {lang === "ar" ? "زر (وصّلني بالدكتور) هيفتح خرائط جوجل على العنوان المكتوب." : "The 'Take me there' button will use the saved address."}
                  </p>
                </div>
              )}
            </div>
          </div>

          <WorkingHoursSection doctor={doctor} />

          <div className="rounded-2xl bg-white border border-slate-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-slate-700">
                {lang === "ar" ? "سجل الزيارات" : "Visit history"}
              </h2>
              <span className="text-xs text-slate-400">0</span>
            </div>
            <div className="py-8 text-center">
              <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 mx-auto mb-3">
                <Icon d={icons.visits} size={22} />
              </div>
              <div className="text-sm font-medium text-slate-700 mb-1">
                {lang === "ar" ? "لا توجد زيارات بعد" : "No visits yet"}
              </div>
              <p className="text-xs text-slate-500">
                {lang === "ar" ? "الزيارات المسجّلة ستظهر هنا." : "Recorded visits will appear here."}
              </p>
            </div>
          </div>

          {doctor.notes && (
            <div className="rounded-2xl bg-white border border-slate-200 p-6">
              <h2 className="text-sm font-semibold text-slate-700 mb-3">
                {lang === "ar" ? "ملاحظات" : "Notes"}
              </h2>
              <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-wrap">{doctor.notes}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}