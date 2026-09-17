"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";

type Badge = { key: string; name: string; description: string; icon: string; points: number; earned: boolean };
type Stats = { points: number; badges_count: number; total_badges: number; completed_visits: number; total_sales: number; total_revenue: number; badges: Array<{ key: string; name: string; icon: string }> };
type LeaderboardEntry = { user_id: string; full_name: string; total_points: number; badges_count: number; rank: number };

export default function GamificationPage() {
  const [badges, setBadges] = useState<Badge[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"badges" | "leaderboard">("badges");

  useEffect(() => {
    (async () => {
      try {
        const [b, s, lb] = await Promise.all([
          apiFetch<Badge[]>("/api/gamification/badges/me").catch(() => []),
          apiFetch<Stats>("/api/gamification/my-stats").catch(() => null),
          apiFetch<LeaderboardEntry[]>("/api/gamification/leaderboard").catch(() => []),
        ]);
        setBadges(b);
        setStats(s);
        setLeaderboard(lb);
      } catch {}
      setLoading(false);
    })();
  }, []);

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => <div key={i} className="h-24 bg-slate-100 dark:bg-slate-800 rounded-2xl animate-pulse" />)}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">الإنجازات</h1>
        <p className="text-sm text-slate-600 dark:text-slate-400 mt-0.5">نقاطك وشو الإنجازات اللي حققتها</p>
      </div>

      {/* Stats cards */}
      {stats && (
        <div className="grid grid-cols-3 gap-3">
          <div className="rounded-2xl bg-gradient-to-br from-amber-500 to-orange-500 text-white p-4 text-center">
            <div className="text-3xl font-black">{stats.points}</div>
            <div className="text-[10px] font-medium opacity-80 mt-0.5">نقطة</div>
          </div>
          <div className="rounded-2xl bg-gradient-to-br from-violet-500 to-purple-500 text-white p-4 text-center">
            <div className="text-3xl font-black">{stats.badges_count}<span className="text-lg opacity-60">/{stats.total_badges}</span></div>
            <div className="text-[10px] font-medium opacity-80 mt-0.5">شارة</div>
          </div>
          <div className="rounded-2xl bg-gradient-to-br from-sky-500 to-cyan-500 text-white p-4 text-center">
            <div className="text-3xl font-black">{stats.completed_visits}</div>
            <div className="text-[10px] font-medium opacity-80 mt-0.5">زيارة مكتملة</div>
          </div>
        </div>
      )}

      {/* Tab toggle */}
      <div className="flex gap-2">
        <button onClick={() => setActiveTab("badges")}
          className={`flex-1 py-2.5 rounded-xl text-xs font-semibold transition border ${activeTab === "badges" ? "bg-sky-500 text-white border-sky-500" : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700"}`}>
          الشارات
        </button>
        <button onClick={() => setActiveTab("leaderboard")}
          className={`flex-1 py-2.5 rounded-xl text-xs font-semibold transition border ${activeTab === "leaderboard" ? "bg-sky-500 text-white border-sky-500" : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700"}`}>
          لوحة المتصدرين
        </button>
      </div>

      {/* Badges */}
      {activeTab === "badges" && (
        <div className="grid grid-cols-2 gap-3">
          {badges.map((b) => (
            <div key={b.key} className={`rounded-2xl p-4 border transition ${
              b.earned
                ? "bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 border-amber-200 dark:border-amber-700"
                : "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 opacity-50"
            }`}>
              <div className="text-3xl mb-2">{b.icon}</div>
              <div className="text-sm font-bold text-slate-900 dark:text-white">{b.name}</div>
              <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">{b.description}</div>
              <div className="flex items-center justify-between mt-2">
                <span className="text-[10px] font-semibold text-amber-600">{b.points} نقطة</span>
                {b.earned ? (
                  <span className="text-[10px] font-bold text-green-600">تم الحصول ✓</span>
                ) : (
                  <span className="text-[10px] text-slate-400">لم يُحصل عليه</span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Leaderboard */}
      {activeTab === "leaderboard" && (
        <div className="space-y-2">
          {leaderboard.length === 0 && (
            <div className="text-center py-10 text-sm text-slate-400">مفيش بيانات بعد</div>
          )}
          {leaderboard.map((e) => (
            <div key={e.user_id} className={`flex items-center gap-3 p-3 rounded-2xl border ${
              e.rank <= 3
                ? "bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-900/10 dark:to-orange-900/10 border-amber-200 dark:border-amber-700"
                : "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700"
            }`}>
              <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-black shrink-0 ${
                e.rank === 1 ? "bg-amber-400 text-white" :
                e.rank === 2 ? "bg-slate-300 text-slate-700" :
                e.rank === 3 ? "bg-orange-300 text-orange-700" :
                "bg-slate-100 dark:bg-slate-700 text-slate-500"
              }`}>
                {e.rank}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold text-slate-900 dark:text-white truncate">{e.full_name}</div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400">{e.badges_count} شارة</div>
              </div>
              <div className="text-right">
                <div className="text-lg font-black text-slate-900 dark:text-white">{e.total_points}</div>
                <div className="text-[9px] text-slate-400">نقطة</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
