"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Doctor,
  doctorDisplayName,
  getAllDoctors,
  getCurrentShift,
  getMyDoctors,
  getMyVisits,
  startShift,
  endShift,
  ShiftInfo,
  Visit,
  apiFetch,
} from "@/lib/api";
import { Icon, icons } from "@/components/ui/Icons";

function fmtTime(dt: string | null | undefined): string {
  if (!dt) return "—";
  try {
    return new Date(dt).toLocaleTimeString("ar-EG", { hour: "2-digit", minute: "2-digit" });
  } catch {
    return "—";
  }
}

function durationStr(from: string, to?: string | null) {
  const a = new Date(from).getTime();
  const b = to ? new Date(to).getTime() : Date.now();
  const diff = Math.floor((b - a) / 60000);
  const h = Math.floor(diff / 60);
  const m = diff % 60;
  if (h === 0) return `${m} دقيقة`;
  return `${h} س ${m} د`;
}

export default function RepHome() {
  const [user, setUser] = useState<any>(null);
  const [shift, setShift] = useState<ShiftInfo | null>(null);
  const [loadingShift, setLoadingShift] = useState(true);
  const [shiftActionLoading, setShiftActionLoading] = useState(false);
  const [myDoctors, setMyDoctors] = useState<Doctor[]>([]);
  const [visits, setVisits] = useState<Visit[]>([]);
  const [totalDoctors, setTotalDoctors] = useState(0);
  const [tick, setTick] = useState(0);

  async function loadAll() {
    try {
      const [me, s, docs, v] = await Promise.all([
        apiFetch<any>("/api/auth/me").catch(() => null),
        getCurrentShift().catch(() => ({ active: false, shift: null })),
        getMyDoctors().catch(() => []),
        getMyVisits().catch(() => []),
      ]);
      setUser(me);
      setShift(s.shift);
      setMyDoctors(docs);
      setVisits(v);
      const all = await getAllDoctors().catch(() => []);
      setTotalDoctors(all.length);
    } finally {
      setLoadingShift(false);
    }
  }

  useEffect(() => {
    loadAll();
  }, []);

  // Update duration every 30s while shift active
  useEffect(() => {
    if (!shift) return;
    const id = setInterval(() => setTick(t => t + 1), 30000);
    return () => clearInterval(id);
  }, [shift]);

  async function handleStart() {
    setShiftActionLoading(true);
    try {
      // Get location and send initial ping
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(async (pos) => {
          try {
            const r = await startShift("بداية اليوم");
            setShift(r);
          } catch (e: any) {
            alert("فشل بدء الشفت: " + (e.message || ""));
          } finally {
            setShiftActionLoading(false);
          }
        }, async () => {
          // No location — still allow shift start
          try {
            const r = await startShift("بداية اليوم (بدون GPS)");
            setShift(r);
          } catch (e: any) {
            alert("فشل بدء الشفت: " + (e.message || ""));
          } finally {
            setShiftActionLoading(false);
          }
        }, { enableHighAccuracy: true, timeout: 10000 });
      } else {
        const r = await startShift("بداية اليوم");
        setShift(r);
        setShiftActionLoading(false);
      }
    } catch (e) {
      setShiftActionLoading(false);
    }
  }

  async function handleEnd() {
    if (!confirm("هل أنت متأكد من إنهاء الشفت؟ سيتم إرسال تقرير يومي للإدارة.")) return;
    setShiftActionLoading(true);
    try {
      await endShift("نهاية اليوم");
      setShift(null);
    } catch (e: any) {
      alert("فشل إنهاء الشفت: " + (e.message || ""));
    } finally {
      setShiftActionLoading(false);
    }
  }

  const todayVisits = visits.filter(v => {
    const t = v.planned_at || v.check_in_at || v.created_at;
    if (!t) return false;
    const d = new Date(t);
    const now = new Date();
    return d.toDateString() === now.toDateString();
  });

  const completedToday = todayVisits.filter(v => v.status === "COMPLETED").length;
  const activeVisit = visits.find(v => v.status === "CHECKED_IN");

  return (
    <div className="space-y-5">
      {/* Greeting */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">
          أهلاً {user?.full_name?.split(" ")[0] ?? ""}
        </h1>
        <p className="text-sm text-slate-600 mt-0.5">
          {new Date().toLocaleDateString("ar-EG", { weekday: "long", day: "numeric", month: "long" })}
        </p>
      </div>

      {/* Shift card */}
      <div className={`rounded-2xl p-5 ${shift ? "bg-gradient-to-br from-teal-500 to-emerald-500" : "bg-gradient-to-br from-slate-800 to-slate-900"} text-white relative overflow-hidden`}>
        <div className="absolute -top-8 -end-8 w-32 h-32 bg-white/10 rounded-full blur-2xl" />
        <div className="relative">
          {loadingShift ? (
            <div className="text-sm opacity-70">جاري التحميل...</div>
          ) : shift ? (
            <>
              <div className="flex items-start justify-between mb-3">
                <div>
                  <div className="text-[11px] opacity-80 mb-0.5">الشفت الحالي</div>
                  <div className="text-lg font-bold flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
                    نشط
                  </div>
                </div>
                <div className="text-end">
                  <div className="text-[11px] opacity-80">بدأ</div>
                  <div className="text-sm font-semibold tabular-nums">{fmtTime(shift.started_at)}</div>
                </div>
              </div>
              <div className="flex items-baseline gap-2 mb-4">
                <span className="text-3xl font-bold tabular-nums">{durationStr(shift.started_at)}</span>
                <span className="text-xs opacity-80">منذ البداية</span>
              </div>
              <button
                onClick={handleEnd}
                disabled={shiftActionLoading}
                className="w-full py-2.5 rounded-xl bg-white/20 hover:bg-white/30 backdrop-blur text-white text-sm font-medium transition disabled:opacity-50"
              >
                {shiftActionLoading ? "..." : "إنهاء الشفت وإرسال التقرير"}
              </button>
            </>
          ) : (
            <>
              <div className="text-[11px] opacity-70 mb-1">بدء يوم العمل</div>
              <div className="text-lg font-bold mb-4">أنت خارج الشفت</div>
              <button
                onClick={handleStart}
                disabled={shiftActionLoading}
                className="w-full py-2.5 rounded-xl bg-white text-slate-900 text-sm font-semibold hover:bg-slate-100 transition disabled:opacity-50"
              >
                {shiftActionLoading ? "جاري البدء..." : "بدء الشفت"}
              </button>
            </>
          )}
        </div>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-3 gap-3">
        <Link href="/rep/visits" className="rounded-2xl bg-white border border-slate-200 p-4 hover:border-sky-300 transition">
          <div className="w-9 h-9 rounded-lg bg-sky-50 text-sky-600 flex items-center justify-center mb-2">
            <Icon d={icons.visits} size={18} />
          </div>
          <div className="text-2xl font-bold text-slate-900 tabular-nums">{completedToday}</div>
          <div className="text-[11px] text-slate-500">زيارات اليوم</div>
        </Link>
        <Link href="/rep/my-doctors" className="rounded-2xl bg-white border border-slate-200 p-4 hover:border-teal-300 transition">
          <div className="w-9 h-9 rounded-lg bg-teal-50 text-teal-600 flex items-center justify-center mb-2">
            <Icon d={icons.doctors} size={18} />
          </div>
          <div className="text-2xl font-bold text-slate-900 tabular-nums">{myDoctors.length}</div>
          <div className="text-[11px] text-slate-500">أطبائي</div>
        </Link>
        <Link href="/rep/nearby" className="rounded-2xl bg-white border border-slate-200 p-4 hover:border-indigo-300 transition">
          <div className="w-9 h-9 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center mb-2">
            <Icon d={icons.pin} size={18} />
          </div>
          <div className="text-2xl font-bold text-slate-900 tabular-nums">{totalDoctors}</div>
          <div className="text-[11px] text-slate-500">إجمالي الأطباء</div>
        </Link>
      </div>

      {/* Active visit alert */}
      {activeVisit && (
        <Link href="/rep/visits" className="block rounded-2xl bg-amber-50 border border-amber-200 p-4 hover:bg-amber-100/60 transition">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-amber-500 text-white flex items-center justify-center shrink-0">
              <Icon d={icons.visits} size={20} />
            </div>
            <div className="flex-1">
              <div className="text-sm font-semibold text-amber-900">لديك زيارة نشطة</div>
              <div className="text-xs text-amber-700 mt-0.5">
                بدأت {fmtTime(activeVisit.check_in_at)} — اضغط للإنهاء
              </div>
            </div>
            <span className="rtl:rotate-180 text-amber-500"><Icon d={icons.chevron} size={18} /></span>
          </div>
        </Link>
      )}

      {/* Quick actions */}
      <div>
        <h2 className="text-sm font-semibold text-slate-700 mb-3">إجراءات سريعة</h2>
        <div className="grid grid-cols-2 gap-3">
          <Link href="/rep/nearby" className="rounded-2xl bg-white border border-slate-200 p-4 flex items-center gap-3 hover:border-sky-300 transition">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-sky-500 to-cyan-500 text-white flex items-center justify-center shrink-0">
              <Icon d={icons.pin} size={18} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-semibold text-slate-900">الأطباء القريبون</div>
              <div className="text-[11px] text-slate-500">بحث بالـ GPS</div>
            </div>
          </Link>
          <Link href="/rep/my-doctors" className="rounded-2xl bg-white border border-slate-200 p-4 flex items-center gap-3 hover:border-teal-300 transition">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-teal-500 to-emerald-500 text-white flex items-center justify-center shrink-0">
              <Icon d={icons.doctors} size={18} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-semibold text-slate-900">أطبائي</div>
              <div className="text-[11px] text-slate-500">{myDoctors.length} طبيب</div>
            </div>
          </Link>
        </div>
      </div>

      {/* Today's visits */}
      {todayVisits.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-slate-700">زيارات اليوم</h2>
            <Link href="/rep/visits" className="text-xs text-sky-600 hover:text-sky-700 font-medium">
              عرض الكل
            </Link>
          </div>
          <div className="space-y-2">
            {todayVisits.slice(0, 3).map((v) => (
              <Link key={v.id} href="/rep/visits" className="block rounded-xl bg-white border border-slate-200 p-3 hover:border-sky-300 transition">
                <div className="flex items-center gap-3">
                  <div className={`w-2 h-2 rounded-full shrink-0 ${v.status === "COMPLETED" ? "bg-teal-500" : v.status === "CHECKED_IN" ? "bg-amber-500" : "bg-slate-300"}`} />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-slate-900 truncate">
                      زيارة
                    </div>
                    <div className="text-[11px] text-slate-500">
                      {v.check_in_at ? `بدأت ${fmtTime(v.check_in_at)}` : v.planned_at ? `مجدولة ${fmtTime(v.planned_at)}` : "—"}
                    </div>
                  </div>
                  <span className="text-[11px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 font-medium">
                    {v.status === "COMPLETED" ? "مكتملة" : v.status === "CHECKED_IN" ? "نشطة" : "مجدولة"}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}