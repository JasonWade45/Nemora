"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Visit, getActiveVisit, getVisits, checkInVisit, getCurrentShift } from "@/lib/api";
import { Icon, icons } from "@/components/ui/Icons";
import {
  getOfflineQueue,
  addToOfflineQueue,
  haversineDistance,
  estimateTimeKm,
  formatDistance,
  formatEta,
  OfflineAction,
} from "@/lib/offline";

function fmtTime(dt: string | null | undefined) {
  if (!dt) return "—";
  try { return new Date(dt).toLocaleTimeString("ar-EG", { hour: "2-digit", minute: "2-digit" }); } catch { return "—"; }
}

function fmtDate(dt: string | null | undefined) {
  if (!dt) return "—";
  try { return new Date(dt).toLocaleDateString("ar-EG", { day: "numeric", month: "short", year: "numeric" }); } catch { return "—"; }
}

function toDateStr(dt: string | null | undefined): string | null {
  if (!dt) return null;
  try { return new Date(dt).toISOString().split("T")[0]; } catch { return null; }
}

function isToday(dt: string | null | undefined) {
  if (!dt) return false;
  try { return new Date(dt).toDateString() === new Date().toDateString(); } catch { return false; }
}

function isTomorrow(dt: string | null | undefined) {
  if (!dt) return false;
  try {
    const d = new Date(dt);
    const t = new Date();
    t.setDate(t.getDate() + 1);
    return d.toDateString() === t.toDateString();
  } catch { return false; }
}

function isThisWeek(dt: string | null | undefined) {
  if (!dt) return false;
  try {
    const d = new Date(dt);
    const now = new Date();
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay());
    startOfWeek.setHours(0, 0, 0, 0);
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6);
    endOfWeek.setHours(23, 59, 59, 999);
    return d >= startOfWeek && d <= endOfWeek;
  } catch { return false; }
}

function isYesterday(dt: string | null | undefined) {
  if (!dt) return false;
  try {
    const d = new Date(dt);
    const y = new Date();
    y.setDate(y.getDate() - 1);
    return d.toDateString() === y.toDateString();
  } catch { return false; }
}

function getPlannedTime(v: Visit): number {
  if (v.planned_at) return new Date(v.planned_at).getTime();
  if (v.checked_in_at) return new Date(v.checked_in_at).getTime();
  if (v.created_at) return new Date(v.created_at).getTime();
  return Infinity;
}

const STATUS_META: Record<string, { ar: string; color: string; dot: string; accent: string }> = {
  PLANNED: { ar: "مخططة", color: "bg-slate-100 text-slate-700 border-slate-200", dot: "bg-slate-400", accent: "border-sky-400 bg-sky-50/50" },
  CHECKED_IN: { ar: "نشطة", color: "bg-amber-100 text-amber-700 border-amber-200", dot: "bg-amber-500", accent: "border-amber-400 bg-amber-50/50" },
  COMPLETED: { ar: "مكتملة", color: "bg-teal-100 text-teal-700 border-teal-200", dot: "bg-teal-500", accent: "border-teal-300 bg-teal-50/30" },
  MISSED: { ar: "فائتة", color: "bg-red-100 text-red-700 border-red-200", dot: "bg-red-500", accent: "border-red-300 bg-red-50/30" },
  CANCELLED: { ar: "ملغاة", color: "bg-slate-100 text-slate-500 border-slate-200", dot: "bg-slate-300", accent: "border-slate-200" },
};

function statusMeta(s: string) { return STATUS_META[s] || STATUS_META.PLANNED; }

function getVisitDate(v: Visit): string | null {
  return toDateStr(v.checked_in_at) || toDateStr(v.planned_at) || toDateStr(v.created_at);
}

type FilterMode = "today" | "tomorrow" | "week" | "yesterday" | "planned" | "completed" | "all";

export default function VisitsListPage() {
  const [visits, setVisits] = useState<Visit[]>([]);
  const [active, setActive] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterMode>("today");
  const [showMoreFilters, setShowMoreFilters] = useState(false);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [sortByDistance, setSortByDistance] = useState(false);
  const [userPos, setUserPos] = useState<{ lat: number; lng: number } | null>(null);
  const [offlineQueue, setOfflineQueue] = useState<OfflineAction[]>([]);
  const [syncing, setSyncing] = useState(false);
  const [checkedInIds, setCheckedInIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    (async () => {
      try {
        const [res, act] = await Promise.all([
          getVisits({ limit: 500 }).catch(() => ({ items: [], total: 0 })),
          getActiveVisit().catch(() => null),
        ]);
        setVisits(res.items || []);
        setActive(act);
      } catch {}
      setLoading(false);
    })();
  }, []);

  useEffect(() => {
    const q = getOfflineQueue();
    setOfflineQueue(q);
    const handler = () => setOfflineQueue(getOfflineQueue());
    window.addEventListener("offline-queue-updated", handler);
    return () => window.removeEventListener("offline-queue-updated", handler);
  }, []);

  useEffect(() => {
    if (!navigator.geolocation) return;
    const id = navigator.geolocation.watchPosition(
      (pos) => {
        console.log("[GPS] Position:", pos.coords.latitude, pos.coords.longitude, "accuracy:", pos.coords.accuracy);
        setUserPos({ lat: pos.coords.latitude, lng: pos.coords.longitude });
      },
      (err) => console.error("[GPS] Error:", err),
      { enableHighAccuracy: true, timeout: 10000 }
    );
    return () => navigator.geolocation.clearWatch(id);
  }, []);

  const trySyncQueue = useCallback(async () => {
    if (!navigator.onLine || syncing) return;
    const queue = getOfflineQueue();
    if (queue.length === 0) return;
    setSyncing(true);
    for (const action of [...queue]) {
      try {
        if (action.type === "check_in") {
          await checkInVisit(action.visitId, action.payload.latitude, action.payload.longitude, action.payload.accuracy);
        }
        const { removeFromOfflineQueue } = await import("@/lib/offline");
        removeFromOfflineQueue(action.id);
      } catch {}
    }
    setOfflineQueue(getOfflineQueue());
    setSyncing(false);
    const res = await getVisits({ limit: 500 }).catch(() => ({ items: [], total: 0 }));
    setVisits(res.items || []);
  }, [syncing]);

  useEffect(() => {
    window.addEventListener("online", trySyncQueue);
    return () => window.removeEventListener("online", trySyncQueue);
  }, [trySyncQueue]);

  useEffect(() => {
    if (offlineQueue.length > 0 && navigator.onLine) trySyncQueue();
  }, [offlineQueue.length, trySyncQueue]);

  const handleStartVisit = useCallback(async (visit: Visit) => {
    // Check for active shift first
    try {
      const shiftRes = await getCurrentShift();
      if (!shiftRes.active) {
        alert("لازم تبدأ شيفت الأول قبل ما تبدأ أي زيارة. روح للوصة واضغط \"بدء الشفت\"");
        return;
      }
    } catch {
      alert("مش قادر أتحقق من حالة الشفت. تأكد من النت وحاول تاني.");
      return;
    }

    if (!navigator.geolocation) {
      alert("الجهاز لا يدعم تحديد الموقع");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude, accuracy } = pos.coords;
        if (navigator.onLine) {
          try {
            const updated = await checkInVisit(visit.id, latitude, longitude, accuracy);
            setCheckedInIds((prev) => new Set(prev).add(visit.id));
            setVisits((prev) => prev.map((v) => v.id === visit.id ? { ...v, ...updated } : v));
            if (active?.id === visit.id) setActive(updated);
            try { await navigator.vibrate?.(100); } catch {}
            setTimeout(() => setCheckedInIds((prev) => { const n = new Set(prev); n.delete(visit.id); return n; }), 2000);
          } catch (e: any) {
            alert(e?.message || "فشل بدء الزيارة");
          }
        } else {
          addToOfflineQueue({ type: "check_in", visitId: visit.id, payload: { latitude, longitude, accuracy } });
          setVisits((prev) => prev.map((v) => v.id === visit.id ? { ...v, status: "CHECKED_IN", checked_in_at: new Date().toISOString(), checkin_latitude: latitude, checkin_longitude: longitude } : v));
          try { await navigator.vibrate?.(100); } catch {}
          setCheckedInIds((prev) => new Set(prev).add(visit.id));
          setTimeout(() => setCheckedInIds((prev) => { const n = new Set(prev); n.delete(visit.id); return n; }), 2000);
        }
      },
      () => { alert("مفيش صلاحية الوصول للموقع. فعّل GPS وحاول تاني."); },
      { enableHighAccuracy: true, timeout: 15000 }
    );
  }, [active]);

  // Filter
  const filtered = useMemo(() => {
    let list = visits;
    if (filter === "today") list = visits.filter((v) => isToday(v.checked_in_at) || isToday(v.planned_at) || isToday(v.created_at));
    else if (filter === "tomorrow") list = visits.filter((v) => isTomorrow(v.planned_at));
    else if (filter === "week") list = visits.filter((v) => isThisWeek(v.planned_at) || isThisWeek(v.checked_in_at));
    else if (filter === "yesterday") list = visits.filter((v) => isYesterday(v.checked_in_at) || isYesterday(v.planned_at) || isYesterday(v.created_at));
    else if (filter === "completed") list = visits.filter((v) => v.status === "COMPLETED");
    else if (filter === "planned") list = visits.filter((v) => v.status === "PLANNED");
    else if (filter === "all" && (dateFrom || dateTo)) {
      list = visits.filter((v) => {
        const t = v.planned_at || v.checked_in_at || v.created_at;
        if (!t) return false;
        const d = new Date(t);
        if (dateFrom && d < new Date(dateFrom)) return false;
        if (dateTo) {
          const to = new Date(dateTo);
          to.setHours(23, 59, 59, 999);
          if (d > to) return false;
        }
        return true;
      });
    }

    // BUG FIX: Always find the next upcoming PLANNED visit first
    const now = Date.now();
    const nextVisit = list.find((v) => v.status === "PLANNED" && getPlannedTime(v) >= now);
    const nextId = nextVisit?.id || null;

    // Sort remaining visits by planned time ascending (BUG FIX #2: compare timestamps, not display strings)
    const sorted = [...list].sort((a, b) => {
      // Next visit always first
      if (a.id === nextId) return -1;
      if (b.id === nextId) return 1;
      return getPlannedTime(a) - getPlannedTime(b);
    });

    return { items: sorted, nextId };
  }, [visits, filter, dateFrom, dateTo]);

  // Distance-based sort override
  const sortedList = useMemo(() => {
    if (!sortByDistance || !userPos) return filtered.items;
    const withDist = filtered.items.map((v) => {
      const hasCoords = v.doctor_latitude != null && v.doctor_longitude != null;
      const dist = hasCoords ? haversineDistance(userPos.lat, userPos.lng, v.doctor_latitude!, v.doctor_longitude!) : Infinity;
      return { visit: v, dist, hasCoords };
    });
    withDist.sort((a, b) => {
      if (a.visit.id === filtered.nextId) return -1;
      if (b.visit.id === filtered.nextId) return 1;
      return a.dist - b.dist;
    });
    return withDist.map((x) => x.visit);
  }, [filtered, sortByDistance, userPos]);

  const todayCount = visits.filter((v) => isToday(v.checked_in_at) || isToday(v.planned_at)).length;
  const tomorrowCount = visits.filter((v) => isTomorrow(v.planned_at)).length;
  const weekCount = visits.filter((v) => isThisWeek(v.planned_at) || isThisWeek(v.checked_in_at)).length;
  const yesterdayCount = visits.filter((v) => isYesterday(v.checked_in_at) || isYesterday(v.planned_at)).length;
  const completedCount = visits.filter((v) => v.status === "COMPLETED").length;
  const plannedCount = visits.filter((v) => v.status === "PLANNED").length;

  const historyByDate = useMemo(() => {
    if (filter !== "all") return {};
    const grouped: Record<string, Visit[]> = {};
    sortedList.forEach((v) => {
      const d = getVisitDate(v);
      if (d) { if (!grouped[d]) grouped[d] = []; grouped[d].push(v); }
    });
    return grouped;
  }, [sortedList, filter]);

  const quickFilters: { key: FilterMode; label: string; count: number }[] = [
    { key: "today", label: "اليوم", count: todayCount },
    { key: "tomorrow", label: "غدًا", count: tomorrowCount },
    { key: "week", label: "الأسبوع ده", count: weekCount },
  ];

  const moreFilters: { key: FilterMode; label: string; count: number }[] = [
    { key: "yesterday", label: "أمس", count: yesterdayCount },
    { key: "planned", label: "مخططة", count: plannedCount },
    { key: "completed", label: "مكتملة", count: completedCount },
    { key: "all", label: "الكل", count: visits.length },
  ].filter((f) => f.count > 0);

  return (
    <div className="space-y-4 pb-24">
      {offlineQueue.length > 0 && (
        <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-amber-50 border border-amber-200 text-amber-700 text-[11px] font-medium">
          <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse shrink-0" />
          {syncing ? "جاري المزامنة..." : `${offlineQueue.length} عملية في انتظار المزامنة`}
        </div>
      )}

      <div>
        <h1 className="text-2xl font-bold text-slate-900">زياراتي</h1>
        <p className="text-sm text-slate-600 mt-0.5">
          {loading ? "جاري التحميل..." : `${sortedList.length} / ${visits.length} زيارة`}
        </p>
      </div>

      {active && (
        <Link href={"/rep/visits/" + active.id} className="block rounded-2xl bg-gradient-to-br from-amber-500 to-orange-500 text-white p-4 shadow-lg shadow-amber-500/20 hover:shadow-amber-500/40 transition">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-full bg-white/20 flex items-center justify-center shrink-0">
              <span className="w-3 h-3 rounded-full bg-white animate-pulse" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[11px] font-medium text-white/90">زيارة نشطة الآن</div>
              <div className="text-sm font-bold truncate mt-0.5">{active.doctor_name || "زيارة"}</div>
              <div className="text-[11px] text-white/80 mt-0.5"> بدأت {fmtTime(active.checked_in_at)}</div>
            </div>
            <span className="rtl:rotate-180 shrink-0 text-white/80"><Icon d={icons.chevron} size={20} /></span>
          </div>
        </Link>
      )}

      {/* Quick filter chips + date picker toggle */}
      <div className="flex items-center gap-2">
        <div className="flex gap-1.5 flex-1 overflow-x-auto pb-1">
          {quickFilters.map((t) => {
            const on = filter === t.key;
            return (
              <button key={t.key} onClick={() => { setFilter(t.key); setShowDatePicker(false); setDateFrom(""); setDateTo(""); }}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition border whitespace-nowrap ${on ? "bg-sky-500 text-white border-sky-500 shadow-sm" : "bg-white text-slate-600 border-slate-200 hover:border-sky-300"}`}>
                {t.label}
                <span className={`text-[10px] tabular-nums ${on ? "text-white/80" : "text-slate-400"}`}>{t.count}</span>
              </button>
            );
          })}
        </div>
        <button onClick={() => { setShowDatePicker(!showDatePicker); if (!showDatePicker) setFilter("all"); }}
          className={`p-2 rounded-xl border transition ${showDatePicker ? "bg-sky-500 text-white border-sky-500" : "bg-white text-slate-500 border-slate-200 hover:border-sky-300"}`}>
          <Icon d={icons.calendar} size={16} />
        </button>
        {moreFilters.length > 0 && (
          <button onClick={() => setShowMoreFilters(!showMoreFilters)}
            className="px-3 py-1.5 rounded-full text-xs font-semibold border bg-white text-slate-500 border-slate-200 hover:border-sky-300 transition whitespace-nowrap">
            {showMoreFilters ? "إخفاء" : "المزيد"}
          </button>
        )}
      </div>

      {/* Sort toggle */}
      {userPos && (
        <div className="flex items-center gap-2">
          <button onClick={() => setSortByDistance(false)}
            className={`flex-1 py-2 rounded-xl text-xs font-semibold transition border ${!sortByDistance ? "bg-sky-500 text-white border-sky-500" : "bg-white text-slate-600 border-slate-200 hover:border-sky-300"}`}>
            <span className="inline-flex items-center gap-1.5 justify-center">
              <Icon d={icons.calendar} size={13} /> حسب الموعد
            </span>
          </button>
          <button onClick={() => setSortByDistance(true)}
            className={`flex-1 py-2 rounded-xl text-xs font-semibold transition border ${sortByDistance ? "bg-sky-500 text-white border-sky-500" : "bg-white text-slate-600 border-slate-200 hover:border-sky-300"}`}>
            <span className="inline-flex items-center gap-1.5 justify-center">
              <Icon d={icons.navigation} size={13} /> رتّب حسب الأقرب
            </span>
          </button>
        </div>
      )}

      {/* More filters panel */}
      {showMoreFilters && moreFilters.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {moreFilters.map((f) => (
            <button key={f.key} onClick={() => { setFilter(f.key); setShowDatePicker(false); }}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition ${filter === f.key ? "bg-sky-500 text-white border-sky-500" : "bg-white text-slate-600 border-slate-200"}`}>
              {f.label} ({f.count})
            </button>
          ))}
        </div>
      )}

      {/* Custom date range picker */}
      {showDatePicker && (
        <div className="rounded-xl bg-white border border-slate-200 p-3 space-y-2">
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500 w-8">من:</span>
            <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)}
              className="flex-1 px-3 py-1.5 rounded-lg border border-slate-200 text-xs bg-white text-slate-700" />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500 w-8">إلى:</span>
            <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)}
              className="flex-1 px-3 py-1.5 rounded-lg border border-slate-200 text-xs bg-white text-slate-700" />
          </div>
          <div className="flex items-center gap-2 pt-1">
            {(dateFrom || dateTo) && (
              <button onClick={() => { setDateFrom(""); setDateTo(""); }}
                className="text-xs text-sky-600 font-medium hover:underline">مسح</button>
            )}
            <div className="flex-1" />
            <button onClick={() => setShowDatePicker(false)}
              className="px-3 py-1.5 rounded-lg bg-slate-900 text-white text-xs font-medium hover:bg-slate-800">
              تطبيق
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="space-y-2.5">
          {[1, 2, 3].map((i) => (
            <div key={i} className="rounded-2xl bg-white border border-slate-200 p-4">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-xl bg-slate-100 animate-pulse" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-40 bg-slate-100 rounded animate-pulse" />
                  <div className="h-3 w-24 bg-slate-100 rounded animate-pulse" />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : sortedList.length === 0 ? (
        <div className="rounded-2xl bg-white border border-slate-200 p-12 text-center">
          <div className="w-14 h-14 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 mx-auto mb-4">
            <Icon d={icons.visits} size={26} />
          </div>
          <div className="text-base font-semibold text-slate-900 mb-1">لا توجد زيارات</div>
          <p className="text-xs text-slate-500 mb-4">
            {filter === "today" && "مفيش زيارات النهاردة"}
            {filter === "tomorrow" && "مفيش زيارات بكرة"}
            {filter === "week" && "مفيش زيارات الأسبوع ده"}
            {filter === "yesterday" && "مفيش زيارات أمس"}
            {filter === "planned" && "مفيش زيارات مخططة"}
            {filter === "completed" && "مفيش زيارات مكتملة"}
            {filter === "all" && (dateFrom || dateTo) ? "مفيش زيارات في الفترة دي" : "ابدأ زيارتك الأولى من هنا"}
          </p>
        </div>
      ) : filter === "all" && !dateFrom && !dateTo ? (
        <div className="space-y-4">
          {Object.entries(historyByDate).map(([date, dayVisits]) => (
            <div key={date}>
              <div className="flex items-center gap-2 mb-2">
                <div className="w-2 h-2 rounded-full bg-sky-500" />
                <span className="text-xs font-bold text-slate-700">{fmtDate(date)}</span>
                <span className="text-[10px] text-slate-400">({dayVisits.length} زيارة)</span>
              </div>
              <div className="space-y-2">{dayVisits.map((v) => (
                <VisitCard key={v.id} visit={v} userPos={userPos} isNext={v.id === filtered.nextId}
                  justCheckedIn={checkedInIds.has(v.id)} onStartVisit={handleStartVisit} />
              ))}</div>
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-2.5">{sortedList.map((v) => (
          <VisitCard key={v.id} visit={v} userPos={userPos} isNext={v.id === filtered.nextId}
            justCheckedIn={checkedInIds.has(v.id)} onStartVisit={handleStartVisit} />
        ))}</div>
      )}

      <Link href="/rep/visits/new"
        className="fixed bottom-24 left-1/2 -translate-x-1/2 z-40 w-14 h-14 rounded-full bg-sky-500 hover:bg-sky-600 text-white shadow-xl shadow-sky-500/30 flex items-center justify-center transition active:scale-95">
        <Icon d={icons.plus} size={24} stroke={2.5} />
      </Link>
    </div>
  );
}

function VisitCard({ visit: v, userPos, isNext, justCheckedIn, onStartVisit }: {
  visit: Visit;
  userPos: { lat: number; lng: number } | null;
  isNext: boolean;
  justCheckedIn: boolean;
  onStartVisit: (v: Visit) => void;
}) {
  const meta = statusMeta(v.status);
  const isPlanned = v.status === "PLANNED";
  const isTodayVisit = isToday(v.checked_in_at) || isToday(v.planned_at);
  const canStart = isPlanned && isTodayVisit && !justCheckedIn;

  const distInfo = useMemo(() => {
    if (!userPos || !v.doctor_latitude || !v.doctor_longitude) return null;
    const km = haversineDistance(userPos.lat, userPos.lng, v.doctor_latitude, v.doctor_longitude);
    const eta = estimateTimeKm(km);
    console.log(`[DIST] ${v.doctor_name}: user(${userPos.lat},${userPos.lng}) → doctor(${v.doctor_latitude},${v.doctor_longitude}) = ${km.toFixed(1)}km`);
    return { km, eta };
  }, [userPos, v.doctor_latitude, v.doctor_longitude]);

  return (
    <div className={`group block rounded-2xl bg-white border-2 p-4 transition-all ${
      justCheckedIn ? "border-teal-400 bg-teal-50/60 shadow-md shadow-teal-500/10" :
      isNext ? "border-sky-400 bg-sky-50/40 shadow-md shadow-sky-500/10" :
      "border-slate-200 hover:border-sky-300 hover:shadow-lg hover:shadow-sky-500/5"
    }`}>
      <div className="flex items-start gap-3.5">
        <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${
          justCheckedIn ? "bg-teal-100 text-teal-600" : meta.color
        }`}>
          {justCheckedIn ? <Icon d={icons.check} size={18} /> : <Icon d={icons.visits} size={18} />}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-slate-900 truncate">{v.doctor_name || "زيارة"}</h3>
                {isNext && isPlanned && (
                  <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-sky-500 text-white shrink-0">التالية</span>
                )}
              </div>
              {v.doctor_specialty && <div className="text-[11px] text-slate-500 mt-0.5">{v.doctor_specialty}</div>}
            </div>
            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border shrink-0 ${meta.color}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${meta.dot}`} />{meta.ar}
            </span>
          </div>

          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-slate-500">
            {v.status === "COMPLETED" && v.duration_minutes != null && (
              <span className="inline-flex items-center gap-1"><Icon d={icons.dashboard} size={11} />{v.duration_minutes} دقيقة</span>
            )}
            {v.checked_in_at && (
              <span className="inline-flex items-center gap-1"><Icon d={icons.visits} size={11} /> بدأت {fmtTime(v.checked_in_at)}</span>
            )}
            {!v.checked_in_at && v.planned_at && (
              <span className="inline-flex items-center gap-1"><Icon d={icons.calendar} size={11} /> {fmtTime(v.planned_at)}</span>
            )}
            {distInfo && (
              <span className="inline-flex items-center gap-1 text-sky-600 font-medium">
                <Icon d={icons.navigation} size={11} />
                {formatDistance(distInfo.km)} · {formatEta(distInfo.eta)}
              </span>
            )}
          </div>

          {canStart && (
            <div className="mt-3 flex items-center gap-2">
              <button onClick={(e) => { e.preventDefault(); e.stopPropagation(); onStartVisit(v); }}
                className="flex-1 py-2.5 rounded-xl bg-sky-500 hover:bg-sky-600 text-white text-xs font-bold shadow-md shadow-sky-500/20 transition active:scale-[0.98] flex items-center justify-center gap-1.5">
                <Icon d={icons.navigation} size={14} />
                بدء الزيارة
              </button>
              {v.doctor_phone && (
                <a href={`tel:${v.doctor_phone}`} onClick={(e) => e.stopPropagation()}
                  className="w-10 h-10 rounded-xl bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-600 transition shrink-0">
                  <Icon d={icons.phone} size={16} />
                </a>
              )}
              {v.doctor_phone && (
                <a href={`https://wa.me/${v.doctor_phone.replace(/[^0-9]/g, "")}`} onClick={(e) => e.stopPropagation()}
                  target="_blank" rel="noopener noreferrer"
                  className="w-10 h-10 rounded-xl bg-emerald-50 hover:bg-emerald-100 flex items-center justify-center text-emerald-600 transition shrink-0">
                  <Icon d={icons.whatsapp} size={16} />
                </a>
              )}
            </div>
          )}

          {!canStart && !isPlanned && v.doctor_phone && (
            <div className="mt-2 flex items-center gap-1.5">
              <a href={`tel:${v.doctor_phone}`} onClick={(e) => e.stopPropagation()}
                className="w-8 h-8 rounded-lg bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 transition">
                <Icon d={icons.phone} size={14} />
              </a>
              <a href={`https://wa.me/${v.doctor_phone.replace(/[^0-9]/g, "")}`} onClick={(e) => e.stopPropagation()}
                target="_blank" rel="noopener noreferrer"
                className="w-8 h-8 rounded-lg bg-emerald-50 hover:bg-emerald-100 flex items-center justify-center text-emerald-600 transition">
                <Icon d={icons.whatsapp} size={14} />
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
