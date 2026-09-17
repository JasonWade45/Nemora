"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  Visit,
  apiFetch,
  forwardVisitToManager,
  getVisits,
  updateAdminNotes,
  User,
} from "@/lib/api";
import { Icon, icons } from "@/components/ui/Icons";

function fmtTime(dt: string | null | undefined) {
  if (!dt) return "—";
  try { return new Date(dt).toLocaleTimeString("ar-EG", { hour: "2-digit", minute: "2-digit" }); } catch { return "—"; }
}

function fmtDate(dt: string | null | undefined) {
  if (!dt) return "—";
  try { return new Date(dt).toLocaleDateString("ar-EG", { day: "numeric", month: "short" }); } catch { return "—"; }
}

const STATUS_META: Record<string, { ar: string; color: string }> = {
  PLANNED: { ar: "مخططة", color: "bg-slate-100 text-slate-700 border-slate-200" },
  CHECKED_IN: { ar: "نشطة", color: "bg-amber-100 text-amber-700 border-amber-200" },
  COMPLETED: { ar: "مكتملة", color: "bg-teal-100 text-teal-700 border-teal-200" },
  MISSED: { ar: "فائتة", color: "bg-red-100 text-red-700 border-red-200" },
  CANCELLED: { ar: "ملغاة", color: "bg-slate-100 text-slate-500 border-slate-200" },
};

export default function AdminVisitsPage() {
  const search = useSearchParams();
  const repId = search?.get("rep_id") || null;

  const [visits, setVisits] = useState<Visit[]>([]);
  const [reps, setReps] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | "pending" | "completed">("all");
  const [selectedRep, setSelectedRep] = useState(repId || "");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [notesOpen, setNotesOpen] = useState<string | null>(null);
  const [notesDraft, setNotesDraft] = useState("");

  async function load() {
    try {
      const params: any = { limit: 500 };
      if (selectedRep) params.rep_id = selectedRep;
      if (dateFrom) params.date_from = dateFrom;
      if (dateTo) params.date_to = dateTo;
      const [res, repsRes] = await Promise.all([
        getVisits(params).catch(() => ({ items: [], total: 0 })),
        apiFetch<User[]>("/api/users").catch(() => []),
      ]);
      setVisits(res.items || []);
      setReps(Array.isArray(repsRes) ? repsRes : (repsRes as any).items || []);
    } catch {}
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  useEffect(() => { load(); }, [selectedRep, dateFrom, dateTo]);

  const filtered = useMemo(() => {
    let list = visits;
    if (filter === "pending") list = list.filter((v) => v.status !== "COMPLETED");
    if (filter === "completed") list = list.filter((v) => v.status === "COMPLETED");
    return list;
  }, [visits, filter]);

  async function handleForward(visitId: string) {
    setBusyId(visitId);
    try { await forwardVisitToManager(visitId); await load(); } catch (e: any) { alert(e.message || "Failed"); } finally { setBusyId(null); }
  }

  async function saveNotes(visitId: string) {
    try { await updateAdminNotes(visitId, notesDraft); await load(); setNotesOpen(null); setNotesDraft(""); } catch (e: any) { alert(e.message || "Failed"); }
  }

  return (
    <div className="max-w-7xl mx-auto pb-10">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-slate-900 tracking-tight">زيارات الفريق</h1>
        <p className="mt-1 text-slate-600 text-sm">{loading ? "..." : `${filtered.length} زيارة`}</p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <div className="flex gap-2">
          {(["all", "pending", "completed"] as const).map((f) => (
            <button key={f} onClick={() => setFilter(f)}
              className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition border ${filter === f ? "bg-slate-900 text-white border-slate-900" : "bg-white text-slate-600 border-slate-200 hover:border-slate-300"}`}>
              {f === "all" ? "الكل" : f === "pending" ? "قيد التنفيذ" : "مكتملة"}
            </button>
          ))}
        </div>

        {reps.length > 0 && (
          <select value={selectedRep} onChange={(e) => setSelectedRep(e.target.value)}
            className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs bg-white text-slate-700">
            <option value="">كل المناديب</option>
            {reps.filter((r) => r.role === "MEDICAL_REP").map((r) => (
              <option key={r.id} value={r.id}>{r.full_name}</option>
            ))}
          </select>
        )}

        <div className="flex items-center gap-2">
          <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)}
            className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs bg-white text-slate-700" />
          <span className="text-xs text-slate-400">←→</span>
          <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)}
            className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs bg-white text-slate-700" />
          {(dateFrom || dateTo || selectedRep) && (
            <button onClick={() => { setDateFrom(""); setDateTo(""); setSelectedRep(""); }}
              className="text-xs text-sky-600 font-medium hover:underline">مسح</button>
          )}
        </div>
      </div>

      {loading ? (
        <div className="space-y-3">{[1, 2, 3].map((i) => <div key={i} className="h-32 bg-slate-100 rounded-2xl animate-pulse" />)}</div>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl bg-white border border-slate-200 p-12 text-center">
          <div className="w-14 h-14 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 mx-auto mb-4"><Icon d={icons.visits} size={26} /></div>
          <div className="text-base font-semibold text-slate-900 mb-1">لا توجد زيارات</div>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((v) => {
            const meta = STATUS_META[v.status] || STATUS_META.PLANNED;
            const sentToAdmin = !!v.report_sent_to_admin_at;
            const forwarded = !!v.report_forwarded_to_manager_at;
            return (
              <div key={v.id} className="rounded-2xl bg-white border border-slate-200 p-5 hover:border-slate-300 transition">
                <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
                  <div className="flex items-start gap-4 min-w-0 flex-1">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-sky-500 to-teal-500 text-white flex items-center justify-center font-bold shrink-0">{v.doctor_name?.slice(0, 1) || "?"}</div>
                    <div className="min-w-0 flex-1">
                      <h3 className="text-sm font-bold text-slate-900 truncate">{v.doctor_name || "دكتور"}</h3>
                      {v.rep_name && <div className="text-[11px] text-slate-500 mt-0.5">بواسطة: {v.rep_name}</div>}
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-2 text-[11px] text-slate-500">
                        <span>{fmtDate(v.checked_in_at || v.created_at)}</span>
                        <span>·</span>
                        <span>{fmtTime(v.checked_in_at)}</span>
                        {v.duration_minutes != null && <><span>·</span><span>{v.duration_minutes} دقيقة</span></>}
                      </div>
                    </div>
                  </div>
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-semibold border shrink-0 ${meta.color}`}>{meta.ar}</span>
                </div>
                {v.status === "COMPLETED" && (
                  <div className="flex flex-wrap items-center gap-2 mb-3">
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-semibold border ${sentToAdmin ? "bg-teal-50 text-teal-700 border-teal-100" : "bg-slate-50 text-slate-500 border-slate-200"}`}>
                      <Icon d={sentToAdmin ? icons.check : icons.visits} size={10} />{sentToAdmin ? "تقرير مستلم" : "بانتظار التقرير"}
                    </span>
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-semibold border ${forwarded ? "bg-indigo-50 text-indigo-700 border-indigo-100" : "bg-slate-50 text-slate-500 border-slate-200"}`}>
                      <Icon d={forwarded ? icons.check : icons.visits} size={10} />{forwarded ? "مُحوَّل للمدير" : "لم يُحوَّل"}
                    </span>
                  </div>
                )}
                {v.feedback_positive && <div className="rounded-xl bg-teal-50/50 border border-teal-100 p-3 mb-3"><div className="text-[10px] font-semibold text-teal-900 mb-1">إيجابيات</div><p className="text-xs text-teal-800 line-clamp-2">{v.feedback_positive}</p></div>}
                {v.feedback_objections && <div className="rounded-xl bg-amber-50/50 border border-amber-100 p-3 mb-3"><div className="text-[10px] font-semibold text-amber-900 mb-1">اعتراضات</div><p className="text-xs text-amber-800 line-clamp-2">{v.feedback_objections}</p></div>}
                {v.admin_notes && notesOpen !== v.id && <div className="rounded-xl bg-sky-50 border border-sky-100 p-3 mb-3"><div className="text-[10px] font-semibold text-sky-900 mb-1">ملاحظاتي</div><p className="text-xs text-sky-800">{v.admin_notes}</p></div>}
                {notesOpen === v.id ? (
                  <div className="space-y-2 mb-3">
                    <textarea value={notesDraft} onChange={(e) => setNotesDraft(e.target.value)} rows={3} placeholder="اكتب ملاحظاتك..." className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-400" />
                    <div className="flex gap-2">
                      <button onClick={() => saveNotes(v.id)} className="flex-1 py-2 rounded-lg bg-slate-900 text-white text-xs font-medium hover:bg-slate-800">حفظ</button>
                      <button onClick={() => { setNotesOpen(null); setNotesDraft(""); }} className="px-4 py-2 rounded-lg bg-white border border-slate-200 text-slate-700 text-xs font-medium">إلغاء</button>
                    </div>
                  </div>
                ) : <button onClick={() => { setNotesOpen(v.id); setNotesDraft(v.admin_notes || ""); }} className="text-[11px] font-medium text-sky-600 hover:text-sky-800 mb-3">{v.admin_notes ? "تعديل الملاحظات" : "+ إضافة ملاحظات"}</button>}
                {v.status === "COMPLETED" && sentToAdmin && !forwarded && (
                  <button onClick={() => handleForward(v.id)} disabled={busyId === v.id} className="w-full py-2.5 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-500 text-white text-xs font-bold shadow-md shadow-indigo-500/20 hover:from-indigo-600 hover:to-purple-600 transition disabled:opacity-60">
                    {busyId === v.id ? "جاري التحويل..." : "→ حوّل للمدير"}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}