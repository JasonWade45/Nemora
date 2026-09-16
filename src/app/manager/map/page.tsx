"use client";

import dynamic from "next/dynamic";
import { useEffect, useMemo, useState } from "react";
import {
  HeatmapPoint,
  TeamLocation,
  TrackPoint,
  getHeatmap,
  getTeamLocations,
  getUserTrack,
} from "@/lib/api";
import { Icon, icons } from "@/components/ui/Icons";

const LiveMap = dynamic(
  () => import("@/components/map/LiveMap").then((m) => m.LiveMap),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-full flex items-center justify-center bg-slate-100 dark:bg-slate-800">
        <div className="text-xs text-slate-500">جاري تحميل الخريطة...</div>
      </div>
    ),
  }
);

function initials(name: string) {
  const parts = (name || "?").split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

function timeAgo(dt: string | null | undefined) {
  if (!dt) return "—";
  try {
    const diff = Math.floor((Date.now() - new Date(dt).getTime()) / 1000);
    if (diff < 60) return "الآن";
    if (diff < 3600) return `${Math.floor(diff / 60)} دقيقة`;
    if (diff < 86400) return `${Math.floor(diff / 3600)} ساعة`;
    return `${Math.floor(diff / 86400)} يوم`;
  } catch {
    return "—";
  }
}

export default function ManagerLiveMapPage() {
  const [team, setTeam] = useState<TeamLocation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [track, setTrack] = useState<TrackPoint[] | null>(null);
  const [heatmap, setHeatmap] = useState<HeatmapPoint[]>([]);
  const [showHeatmap, setShowHeatmap] = useState(false);

  async function load() {
    try {
      const res = await getTeamLocations();
      setTeam(res.items || []);
    } catch (e: any) {
      setError(e.message || "Failed to load team locations");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    const interval = setInterval(load, 30000);
    return () => clearInterval(interval);
  }, []);

  async function toggleHeatmap() {
    if (!showHeatmap && heatmap.length === 0) {
      try {
        const res = await getHeatmap(7);
        setHeatmap(res.points || []);
      } catch {}
    }
    setShowHeatmap((v) => !v);
  }

  async function selectRep(userId: string) {
    setSelectedUserId(userId);
    setTrack(null);
    try {
      const today = new Date().toISOString().slice(0, 10);
      const res = await getUserTrack(userId, today);
      setTrack(res.points || []);
    } catch {}
  }

  const onlineCount = useMemo(
    () => team.filter((l) => l.is_online).length,
    [team]
  );

  const activeCount = useMemo(
    () => team.filter((l) => l.shift_status === "ACTIVE").length,
    [team]
  );

  const selectedRep = useMemo(
    () => team.find((l) => l.user_id === selectedUserId) || null,
    [team, selectedUserId]
  );

  return (
    <div className="max-w-7xl mx-auto pb-10 space-y-4">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight">
            الخريطة المباشرة
          </h1>
          <p className="mt-1 text-slate-600 dark:text-slate-400 text-sm">
            {loading
              ? "..."
              : `${onlineCount} متصل · ${activeCount} في شفت نشط · من ${team.length}`}
          </p>
        </div>

        <div className="flex gap-2 shrink-0">
          <button
            onClick={toggleHeatmap}
            className={`px-4 py-2.5 rounded-xl text-xs font-semibold transition border ${
              showHeatmap
                ? "bg-amber-500 text-white border-amber-500"
                : "bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:border-amber-300"
            }`}
          >
            {showHeatmap ? "إخفاء الحرارة" : "عرض الحرارة"}
          </button>
          <button
            onClick={load}
            className="px-4 py-2.5 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-xs font-semibold hover:bg-slate-800 transition"
          >
            ⟳ تحديث
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="grid lg:grid-cols-3 gap-4">
        {/* Map */}
        <div className="lg:col-span-2 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 overflow-hidden">
          <div className="h-[600px]">
            {loading ? (
              <div className="w-full h-full flex items-center justify-center bg-slate-50 dark:bg-slate-800">
                <div className="w-6 h-6 border-2 border-slate-300 border-t-sky-500 rounded-full animate-spin" />
              </div>
            ) : (
              <LiveMap
                team={team}
                selectedUserId={selectedUserId}
                track={track}
                heatmap={heatmap}
                showHeatmap={showHeatmap}
              />
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-3">
          <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4">
            <h2 className="text-xs font-bold text-slate-900 dark:text-white mb-3 uppercase tracking-wide">
              الفريق ({team.length})
            </h2>

            {loading ? (
              <div className="space-y-2">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-16 rounded-xl bg-slate-100 dark:bg-slate-800 animate-pulse" />
                ))}
              </div>
            ) : team.length === 0 ? (
              <div className="text-center py-8 text-xs text-slate-500">
                <Icon d={icons.users} size={24} className="mx-auto mb-2 opacity-50" />
                <div>لا يوجد مندوبين نشطين</div>
              </div>
            ) : (
              <div className="space-y-2 max-h-[500px] overflow-y-auto">
                {team.map((loc) => (
                  <button
                    key={loc.user_id}
                    onClick={() => selectRep(loc.user_id)}
                    className={`w-full text-start rounded-xl border p-3 transition ${
                      selectedUserId === loc.user_id
                        ? "border-sky-500 bg-sky-50 dark:bg-sky-500/10"
                        : "border-slate-200 dark:border-slate-800 hover:border-sky-300"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="relative shrink-0">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-sky-500 to-teal-500 text-white flex items-center justify-center text-xs font-bold">
                          {initials(loc.full_name)}
                        </div>
                        <span
                          className={`absolute -bottom-0.5 -end-0.5 w-3 h-3 rounded-full border-2 border-white dark:border-slate-900 ${
                            loc.is_online ? "bg-teal-500 animate-pulse" : "bg-slate-400"
                          }`}
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-bold text-slate-900 dark:text-white truncate">
                          {loc.full_name}
                        </div>
                        <div className="text-[10px] text-slate-500 flex items-center gap-2 mt-0.5">
                          <span>{loc.is_online ? "متصل" : "غير متصل"}</span>
                          {loc.shift_status === "ACTIVE" && (
                            <span className="inline-flex items-center px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700 text-[9px] font-semibold">
                              شفت نشط
                            </span>
                          )}
                        </div>
                        <div className="text-[10px] text-slate-400 mt-0.5">
                          آخر تحديث: {timeAgo(loc.last_seen)}
                        </div>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {selectedRep && (
            <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4">
              <h3 className="text-xs font-bold text-slate-900 dark:text-white mb-3 uppercase tracking-wide">
                تفاصيل المندوب
              </h3>
              <div className="space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-500">الاسم</span>
                  <span className="font-semibold text-slate-900 dark:text-white">{selectedRep.full_name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">البريد</span>
                  <span className="font-medium text-slate-700 dark:text-slate-300 text-[11px]" dir="ltr">
                    {selectedRep.email}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">الإحداثيات</span>
                  <span className="font-mono text-[10px] text-slate-700 dark:text-slate-300" dir="ltr">
                    {selectedRep.latitude?.toFixed(4)}, {selectedRep.longitude?.toFixed(4)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">آخر تحديث</span>
                  <span className="font-medium text-slate-700 dark:text-slate-300">
                    {timeAgo(selectedRep.last_seen)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">الشفت</span>
                  <span className={`font-semibold ${selectedRep.shift_status === "ACTIVE" ? "text-teal-600" : "text-slate-500"}`}>
                    {selectedRep.shift_status === "ACTIVE" ? "نشط" : "متوقف"}
                  </span>
                </div>
                {track && track.length > 0 && (
                  <div className="flex justify-between">
                    <span className="text-slate-500">نقاط المسار</span>
                    <span className="font-semibold text-teal-600">{track.length}</span>
                  </div>
                )}
                <button
                  onClick={() => {
                    setSelectedUserId(null);
                    setTrack(null);
                  }}
                  className="w-full mt-3 py-2 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-medium hover:bg-slate-200 transition"
                >
                  إغلاق
                </button>
              </div>
            </div>
          )}

          {showHeatmap && (
            <div className="rounded-2xl bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 p-4">
              <div className="text-xs font-bold text-amber-900 dark:text-amber-300 mb-2">
                🔥 خريطة الحرارة
              </div>
              <p className="text-[11px] text-amber-800 dark:text-amber-400 leading-relaxed">
                تعرض كثافة الزيارات في آخر 7 أيام. المناطق الأكثر حرارة = نشاط أعلى.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}