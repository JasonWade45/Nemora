"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { getHeatmap, getTeamLocations, getUserTrack, TeamLocation, TrackPoint, HeatmapPoint } from "@/lib/api";
import { useLanguage } from "@/lib/language-context";
import { Icon, icons } from "@/components/ui/Icons";

const LiveMap = dynamic(() => import("@/components/map/LiveMap").then(m => m.LiveMap), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex items-center justify-center bg-slate-100 rounded-2xl">
      <div className="flex items-center gap-3 text-slate-500">
        <div className="w-5 h-5 border-2 border-slate-300 border-t-sky-500 rounded-full animate-spin" />
        <span className="text-sm">Loading map...</span>
      </div>
    </div>
  ),
});

export default function MapPage() {
  const { t, lang } = useLanguage();
  const [team, setTeam] = useState<TeamLocation[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [track, setTrack] = useState<TrackPoint[] | null>(null);
  const [heatmap, setHeatmap] = useState<HeatmapPoint[]>([]);
  const [showHeatmap, setShowHeatmap] = useState(false);
  const [loading, setLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);

  const today = new Date().toISOString().slice(0, 10);

  async function load() {
    try {
      const res = await getTeamLocations();
      setTeam(res.items);
      setLastRefresh(new Date());
    } catch {}
    setLoading(false);
  }

  useEffect(() => {
    load();
    const id = setInterval(load, 30000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (!selected) { setTrack(null); return; }
    (async () => {
      try {
        const res = await getUserTrack(selected, today);
        setTrack(res.points);
      } catch { setTrack([]); }
    })();
  }, [selected, today]);

  useEffect(() => {
    if (!showHeatmap) { setHeatmap([]); return; }
    (async () => {
      try {
        const res = await getHeatmap(7);
        setHeatmap(res.points);
      } catch {}
    })();
  }, [showHeatmap]);

  const selectedUser = team.find(t => t.user_id === selected);

  return (
    <div className="max-w-[1600px] h-[calc(100vh-8rem)] flex flex-col">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">
            {lang === "ar" ? "الخريطة الحية" : "Live Map"}
          </h1>
          <p className="mt-2 text-slate-600">
            {lang === "ar" ? "مواقع الفريق الميداني والمناطق الحرارية." : "Team field locations and activity heatmap."}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowHeatmap(v => !v)}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition border ${
              showHeatmap ? "bg-orange-500 text-white border-orange-500" : "bg-white text-slate-700 border-slate-200 hover:border-slate-300"
            }`}
          >
            {lang === "ar" ? "المنطقة الحرارية" : "Heatmap"}
          </button>
          <button
            onClick={load}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-slate-900 hover:bg-slate-800 text-white text-sm font-medium transition"
          >
            <Icon d={icons.search} size={16} />
            {lang === "ar" ? "تحديث" : "Refresh"}
          </button>
        </div>
      </div>

      {lastRefresh && (
        <div className="mb-3 text-xs text-slate-500">
          {lang === "ar" ? "آخر تحديث" : "Last refresh"}: {lastRefresh.toLocaleTimeString()} · {lang === "ar" ? "تحديث تلقائي كل 30 ثانية" : "Auto refresh every 30s"}
        </div>
      )}

      <div className="flex-1 grid lg:grid-cols-[320px_1fr] gap-5 min-h-0">
        {/* Sidebar list */}
        <div className="rounded-2xl bg-white border border-slate-200 overflow-hidden flex flex-col">
          <div className="px-4 py-3 border-b border-slate-200 bg-slate-50">
            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
              {lang === "ar" ? "الفريق" : "Team"} ({team.length})
            </div>
          </div>
          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <div className="p-6 text-center text-slate-500 text-sm">{lang === "ar" ? "جاري التحميل..." : "Loading..."}</div>
            ) : team.length === 0 ? (
              <div className="p-6 text-center text-slate-500 text-sm">{lang === "ar" ? "لا يوجد أعضاء بعد." : "No team members yet."}</div>
            ) : (
              team.map(member => {
                const active = selected === member.user_id;
                const dotColor = member.is_online ? "bg-teal-500" : member.shift_status === "ACTIVE" ? "bg-amber-500" : "bg-slate-300";
                return (
                  <button
                    key={member.user_id}
                    onClick={() => setSelected(active ? null : member.user_id)}
                    className={`w-full flex items-center gap-3 px-4 py-3 border-b border-slate-100 last:border-0 text-start transition ${
                      active ? "bg-sky-50" : "hover:bg-slate-50"
                    }`}
                  >
                    <span className={`w-2.5 h-2.5 rounded-full ${dotColor} shrink-0`} />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-slate-900 truncate">{member.full_name}</div>
                      <div className="text-[11px] text-slate-500 truncate">
                        {member.last_seen ? new Date(member.last_seen).toLocaleTimeString() : (lang === "ar" ? "لا يوجد موقع" : "No location")}
                      </div>
                    </div>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 font-medium">
                      {member.role.replace("_", " ")}
                    </span>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Map */}
        <div className="relative min-h-[500px]">
          <LiveMap
            team={team}
            selectedUserId={selected}
            track={track}
            heatmap={heatmap}
            showHeatmap={showHeatmap}
          />
          {selectedUser && (
            <div className="absolute top-3 end-3 z-[400] bg-white/95 backdrop-blur rounded-xl border border-slate-200 shadow-lg p-4 max-w-xs">
              <div className="text-sm font-semibold text-slate-900 mb-1">{selectedUser.full_name}</div>
              <div className="text-xs text-slate-500 mb-3">{selectedUser.email}</div>
              {track && track.length > 0 ? (
                <div className="text-xs text-slate-600">
                  {lang === "ar" ? "عدد النقاط" : "Points"}: {track.length}
                </div>
              ) : (
                <div className="text-xs text-slate-400">
                  {lang === "ar" ? "لا يوجد مسار لهذا اليوم" : "No track recorded today"}
                </div>
              )}
              <button
                onClick={() => setSelected(null)}
                className="mt-3 text-xs text-sky-600 hover:text-sky-700 font-medium"
              >
                {lang === "ar" ? "إلغاء التحديد" : "Clear selection"}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}