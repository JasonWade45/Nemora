"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  Visit,
  Product,
  addProductToVisit,
  checkInVisit,
  checkOutVisit,
  getProducts,
  getVisit,
  removeProductFromVisit,
} from "@/lib/api";
import { Icon, icons } from "@/components/ui/Icons";
import { VoiceRecorder } from "@/components/ui/VoiceRecorder";

function fmtTime(dt: string | null | undefined): string {
  if (!dt) return "—";
  try {
    return new Date(dt).toLocaleTimeString("ar-EG", {
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "—";
  }
}

function fmtDistance(m: number | null | undefined): string | null {
  if (m == null) return null;
  if (m < 1000) return Math.round(m) + " م";
  return (m / 1000).toFixed(2) + " كم";
}

function durationFrom(start: string | null | undefined): string {
  if (!start) return "0:00";
  const diff = Math.floor(
    (Date.now() - new Date(start).getTime()) / 1000
  );
  const m = Math.floor(diff / 60);
  const s = diff % 60;
  return m + ":" + String(s).padStart(2, "0");
}

const RESPONSES = [
  { value: "VERY_INTERESTED", ar: "مهتم جداً" },
  { value: "INTERESTED", ar: "مهتم" },
  { value: "NEUTRAL", ar: "محايد" },
  { value: "NOT_INTERESTED", ar: "غير مهتم" },
];

const FEEDBACK_FIELDS = [
  {
    key: "feedback_positive" as const,
    label: "إيه اللي كان كويس؟",
    placeholder: "إيه اللي الدكتور رحّب بيه؟ إيه اللي أثّر فيه إيجاباً؟",
    icon: "✓",
    color: "teal",
    templates: [
      "الدكتور مهتم بـ",
      "حب فكرة",
      "وافق على تجربة",
      "أشاد بـ",
      "سأل عن",
    ],
  },
  {
    key: "feedback_objections" as const,
    label: "الاعتراضات",
    placeholder: "إيه الاعتراضات اللي طرحها؟ ليه مش مقتنع؟",
    icon: "!",
    color: "amber",
    templates: [
      "بيشتكي من السعر",
      "بيقول المنافس",
      "محتاج أدلة",
      "مش مقتنع بـ",
      "قلق من",
    ],
  },
  {
    key: "feedback_next_steps" as const,
    label: "الخطوات الجاية",
    placeholder: "إيه اللي هتعمله المرة الجاية؟",
    icon: "→",
    color: "sky",
    templates: [
      "هبعت عينات",
      "هبعت دراسات",
      "هزور تاني بعد",
      "هجيب",
      "هوفر",
    ],
  },
  {
    key: "feedback_overall" as const,
    label: "ملاحظات عامة",
    placeholder: "أي حاجة تانية عن الزيارة",
    icon: "★",
    color: "slate",
    templates: ["الزيارة كانت", "الدكتور", "الوقت المناسب"],
  },
];

type FeedbackKey =
  | "feedback_positive"
  | "feedback_objections"
  | "feedback_next_steps"
  | "feedback_overall";

const COLOR_MAP: Record<string, { bg: string; text: string; border: string; focus: string }> = {
  teal: {
    bg: "bg-teal-50",
    text: "text-teal-700",
    border: "border-teal-200",
    focus: "focus:ring-teal-500/20 focus:border-teal-400",
  },
  amber: {
    bg: "bg-amber-50",
    text: "text-amber-700",
    border: "border-amber-200",
    focus: "focus:ring-amber-500/20 focus:border-amber-400",
  },
  sky: {
    bg: "bg-sky-50",
    text: "text-sky-700",
    border: "border-sky-200",
    focus: "focus:ring-sky-500/20 focus:border-sky-400",
  },
  slate: {
    bg: "bg-slate-50",
    text: "text-slate-700",
    border: "border-slate-200",
    focus: "focus:ring-slate-500/20 focus:border-slate-400",
  },
};

export default function VisitDetailPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const id = params?.id;

  const [visit, setVisit] = useState<Visit | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [, setTick] = useState(0);

  // Check-out form
  const [notes, setNotes] = useState("");
  const [response, setResponse] = useState("");
  const [followUpDate, setFollowUpDate] = useState("");
  const [followUpNotes, setFollowUpNotes] = useState("");
  const [showCheckout, setShowCheckout] = useState(false);

  // Feedback state
  const [feedback, setFeedback] = useState<Record<FeedbackKey, string>>({
    feedback_positive: "",
    feedback_objections: "",
    feedback_next_steps: "",
    feedback_overall: "",
  });
  const [activeTemplateField, setActiveTemplateField] =
    useState<FeedbackKey | null>(null);

  // Product selection
  const [selectedProductIds, setSelectedProductIds] = useState<Set<string>>(
    new Set()
  );
  const [showProductsPanel, setShowProductsPanel] = useState(false);

  async function load() {
    if (!id) return;
    try {
      const v = await getVisit(id);
      setVisit(v);
      setFeedback({
        feedback_positive: v.feedback_positive || "",
        feedback_objections: v.feedback_objections || "",
        feedback_next_steps: v.feedback_next_steps || "",
        feedback_overall: v.feedback_overall || "",
      });
      if (v.products && v.products.length > 0) {
        setSelectedProductIds(new Set(v.products.map((p) => p.id)));
      }
    } catch (e: any) {
      setError(e.message || "Failed to load visit");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, [id]);

  useEffect(() => {
    (async () => {
      try {
        const res = await getProducts();
        setProducts(res.items || []);
      } catch {}
    })();
  }, []);

  useEffect(() => {
    if (!visit || visit.status !== "CHECKED_IN") return;
    const t = setInterval(() => setTick((x) => x + 1), 1000);
    return () => clearInterval(t);
  }, [visit]);

  function getPosition(): Promise<{
    lat: number;
    lng: number;
    acc: number;
  }> {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        return reject(new Error("GPS غير مدعوم"));
      }
      navigator.geolocation.getCurrentPosition(
        (pos) =>
          resolve({
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
            acc: pos.coords.accuracy,
          }),
        (err) =>
          reject(new Error(err.message || "فشل الوصول للموقع")),
        { enableHighAccuracy: true, timeout: 15000, maximumAge: 30000 }
      );
    });
  }

  async function handleCheckIn() {
    if (!id) return;
    setBusy(true);
    setError(null);
    try {
      const pos = await getPosition();
      const updated = await checkInVisit(id, pos.lat, pos.lng, pos.acc);
      setVisit(updated);
    } catch (e: any) {
      setError(e.message || "Failed");
    } finally {
      setBusy(false);
    }
  }

  async function toggleProduct(productId: string) {
    if (!id || !visit) return;
    const isSelected = selectedProductIds.has(productId);
    // Optimistic
    setSelectedProductIds((prev) => {
      const next = new Set(prev);
      if (isSelected) next.delete(productId);
      else next.add(productId);
      return next;
    });
    try {
      const updated = isSelected
        ? await removeProductFromVisit(id, productId)
        : await addProductToVisit(id, productId);
      setVisit(updated);
    } catch (e: any) {
      // Revert
      setSelectedProductIds((prev) => {
        const next = new Set(prev);
        if (isSelected) next.add(productId);
        else next.delete(productId);
        return next;
      });
      setError(e.message || "Failed to update product");
    }
  }

  function applyTemplate(field: FeedbackKey, template: string) {
    setFeedback((prev) => {
      const current = prev[field];
      const newVal = current ? current + "\n" + template : template;
      return { ...prev, [field]: newVal };
    });
    setActiveTemplateField(null);
  }

  function appendTemplate(field: FeedbackKey, template: string) {
    setFeedback((prev) => {
      const current = prev[field];
      const sep = current && !current.endsWith("\n") ? "\n" : "";
      return { ...prev, [field]: current + sep + template };
    });
  }

  async function handleCheckOut() {
    if (!id) return;
    setBusy(true);
    setError(null);
    try {
      const pos = await getPosition();
      const updated = await checkOutVisit(id, {
        latitude: pos.lat,
        longitude: pos.lng,
        accuracy: pos.acc,
        notes: notes || null,
        doctor_response: response || null,
        next_follow_up_date: followUpDate
          ? new Date(followUpDate).toISOString()
          : null,
        next_follow_up_notes: followUpNotes || null,
        feedback_positive: feedback.feedback_positive || null,
        feedback_objections: feedback.feedback_objections || null,
        feedback_next_steps: feedback.feedback_next_steps || null,
        feedback_overall: feedback.feedback_overall || null,
      });
      setVisit(updated);
      setShowCheckout(false);
    } catch (e: any) {
      let msg = e.message || "Failed";
      try {
        msg = JSON.parse(msg).detail || msg;
      } catch {}
      setError(msg);
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-24 bg-slate-100 rounded animate-pulse" />
        <div className="h-40 bg-slate-100 rounded-2xl animate-pulse" />
        <div className="h-64 bg-slate-100 rounded-2xl animate-pulse" />
      </div>
    );
  }

  if (error && !visit) {
    return (
      <div className="space-y-4">
        <Link
          href="/rep/visits"
          className="inline-flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900"
        >
          <span className="rtl:rotate-180">
            <Icon d={icons.arrow_left} size={16} />
          </span>
          رجوع
        </Link>
        <div className="rounded-2xl bg-red-50 border border-red-200 px-6 py-8 text-center">
          <div className="text-red-700 font-medium mb-1">
            تعذّر تحميل الزيارة
          </div>
          <p className="text-sm text-red-600">{error}</p>
        </div>
      </div>
    );
  }

  if (!visit) return null;

  const isActive = visit.status === "CHECKED_IN";
  const isPlanned = visit.status === "PLANNED";
  const isCompleted = visit.status === "COMPLETED";

  return (
    <div className="space-y-4 pb-4">
      <Link
        href="/rep/visits"
        className="inline-flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900"
      >
        <span className="rtl:rotate-180">
          <Icon d={icons.arrow_left} size={16} />
        </span>
        رجوع
      </Link>

      {/* Doctor card */}
      <div className="rounded-2xl bg-white border border-slate-200 p-4">
        <div className="flex items-start gap-3">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-sky-500 to-teal-500 text-white flex items-center justify-center font-bold shrink-0">
            {visit.doctor_name ? visit.doctor_name.slice(0, 1) : "?"}
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-base font-bold text-slate-900 truncate">
              {visit.doctor_name || "دكتور"}
            </h1>
            {visit.doctor_specialty && (
              <div className="text-xs text-slate-500 mt-0.5">
                {visit.doctor_specialty}
              </div>
            )}
            {visit.doctor_address && (
              <div className="text-[11px] text-slate-500 mt-1 line-clamp-2">
                {visit.doctor_address}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Timer / status */}
      {isActive && (
        <div className="rounded-2xl bg-gradient-to-br from-amber-500 to-orange-500 text-white p-5 shadow-lg shadow-amber-500/20">
          <div className="text-[11px] font-medium text-white/90 mb-1">
            الزيارة نشطة
          </div>
          <div className="text-4xl font-bold tabular-nums tracking-wider" dir="ltr">
            {durationFrom(visit.checked_in_at)}
          </div>
          <div className="mt-2 text-xs text-white/90">
            بدأت الساعة {fmtTime(visit.checked_in_at)}
          </div>
        </div>
      )}

      {isCompleted && (
        <div className="rounded-2xl bg-gradient-to-br from-teal-500 to-emerald-500 text-white p-5 shadow-lg shadow-teal-500/20">
          <div className="flex items-center gap-2 mb-2">
            <Icon d={icons.check} size={20} />
            <div className="text-sm font-semibold">زيارة مكتملة</div>
          </div>
          <div className="text-2xl font-bold tabular-nums">
            {visit.duration_minutes != null
              ? visit.duration_minutes + " دقيقة"
              : "—"}
          </div>
          <div className="mt-2 text-xs text-white/90">
            {fmtTime(visit.checked_in_at)} → {fmtTime(visit.checked_out_at)}
          </div>
        </div>
      )}

      {/* Verification badge */}
      {visit.distance_from_doctor != null && (
        <div
          className={
            "rounded-2xl border p-3 flex items-center gap-3 " +
            (visit.is_verified
              ? "bg-teal-50 border-teal-200"
              : "bg-amber-50 border-amber-200")
          }
        >
          <span
            className={
              "w-9 h-9 rounded-xl flex items-center justify-center shrink-0 " +
              (visit.is_verified
                ? "bg-teal-100 text-teal-600"
                : "bg-amber-100 text-amber-600")
            }
          >
            <Icon
              d={visit.is_verified ? icons.check : icons.pin}
              size={16}
            />
          </span>
          <div className="flex-1 min-w-0">
            <div
              className={
                "text-xs font-semibold " +
                (visit.is_verified ? "text-teal-900" : "text-amber-900")
              }
            >
              {visit.is_verified ? "موثقة GPS" : "خارج النطاق"}
            </div>
            <div
              className={
                "text-[11px] mt-0.5 " +
                (visit.is_verified ? "text-teal-700" : "text-amber-700")
              }
            >
              المسافة من العيادة: {fmtDistance(visit.distance_from_doctor)}
            </div>
          </div>
        </div>
      )}

      {error && (
        <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-xs text-red-700">
          {error}
        </div>
      )}

      {/* ===== Products section (active or completed) ===== */}
      {(isActive || isCompleted) && (
        <div className="rounded-2xl bg-white border border-slate-200 overflow-hidden">
          <button
            onClick={() => setShowProductsPanel((v) => !v)}
            className="w-full flex items-center justify-between gap-3 px-4 py-3 hover:bg-slate-50 transition"
          >
            <div className="flex items-center gap-2">
              <span className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
                  <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
                  <line x1="12" y1="22.08" x2="12" y2="12" />
                </svg>
              </span>
              <div className="text-start">
                <div className="text-sm font-semibold text-slate-900">
                  المنتجات اللي ناقشتها
                </div>
                <div className="text-[11px] text-slate-500 mt-0.5">
                  {selectedProductIds.size > 0
                    ? `${selectedProductIds.size} منتج مختار`
                    : "لم تختر منتجات بعد"}
                </div>
              </div>
            </div>
            <span
              className={`text-slate-400 transition-transform ${
                showProductsPanel ? "rotate-180" : ""
              }`}
            >
              <Icon d={icons.chevron} size={18} />
            </span>
          </button>

          {showProductsPanel && (
            <div className="px-4 pb-4 border-t border-slate-100 pt-3">
              {products.length === 0 ? (
                <div className="text-center py-6">
                  <div className="text-xs text-slate-500 mb-3">
                    لا توجد منتجات بعد
                  </div>
                  <Link
                    href="/rep/products"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 text-white text-[11px] font-medium"
                  >
                    <Icon d={icons.plus} size={12} />
                    إضافة منتج
                  </Link>
                </div>
              ) : (
                <div className="space-y-2">
                  {products.map((p) => {
                    const checked = selectedProductIds.has(p.id);
                    return (
                      <button
                        key={p.id}
                        onClick={() => toggleProduct(p.id)}
                        disabled={isCompleted}
                        className={`w-full flex items-center gap-3 p-2.5 rounded-xl border transition ${
                          checked
                            ? "bg-indigo-50 border-indigo-300"
                            : "bg-white border-slate-200 hover:border-indigo-200"
                        } ${isCompleted ? "opacity-60 cursor-not-allowed" : ""}`}
                      >
                        <span
                          className={`w-5 h-5 rounded-md flex items-center justify-center shrink-0 border-2 transition ${
                            checked
                              ? "bg-indigo-500 border-indigo-500 text-white"
                              : "border-slate-300"
                          }`}
                        >
                          {checked && <Icon d={icons.check} size={12} />}
                        </span>
                        <div className="flex-1 min-w-0 text-start">
                          <div className="text-sm font-medium text-slate-900 truncate">
                            {p.name}
                          </div>
                          {p.category && (
                            <div className="text-[10px] text-slate-500 mt-0.5">
                              {p.category}
                            </div>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Action buttons */}
      {isPlanned && (
        <button
          onClick={handleCheckIn}
          disabled={busy}
          className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-sky-500 to-teal-500 text-white text-sm font-bold shadow-lg shadow-sky-500/20 hover:from-sky-600 hover:to-teal-600 transition disabled:opacity-60"
        >
          {busy ? "جاري التحقق من الموقع..." : "تسجيل الوصول (Check-In)"}
        </button>
      )}

      {isActive && !showCheckout && (
        <button
          onClick={() => setShowCheckout(true)}
          className="w-full py-3.5 rounded-2xl bg-slate-900 text-white text-sm font-bold shadow-lg hover:bg-slate-800 transition"
        >
          إنهاء الزيارة (Check-Out)
        </button>
      )}

      {/* Check-out form */}
      {isActive && showCheckout && (
        <div className="space-y-4">
          {/* Doctor response */}
          <div className="rounded-2xl bg-white border border-slate-200 p-4">
            <label className="block text-xs font-semibold text-slate-700 mb-2">
              رد الدكتور
            </label>
            <div className="grid grid-cols-2 gap-2">
              {RESPONSES.map((r) => {
                const on = response === r.value;
                return (
                  <button
                    key={r.value}
                    type="button"
                    onClick={() => setResponse(on ? "" : r.value)}
                    className={`py-2 rounded-lg text-xs font-medium transition border ${
                      on
                        ? "bg-sky-500 text-white border-sky-500"
                        : "bg-white text-slate-600 border-slate-200 hover:border-sky-300"
                    }`}
                  >
                    {r.ar}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Feedback fields */}
          <div className="rounded-2xl bg-white border border-slate-200 overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-100 bg-gradient-to-r from-sky-50/50 to-teal-50/50">
              <div className="text-sm font-semibold text-slate-900">
                Feedback كامل
              </div>
              <div className="text-[11px] text-slate-500 mt-0.5">
                استخدم القوالب أو اكتب بنفسك
              </div>
            </div>

            <div className="p-4 space-y-4">
              {FEEDBACK_FIELDS.map((field) => {
                const colors = COLOR_MAP[field.color];
                return (
                  <div key={field.key}>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span
                          className={`w-6 h-6 rounded-md ${colors.bg} ${colors.text} flex items-center justify-center text-[11px] font-bold`}
                        >
                          {field.icon}
                        </span>
                        <label className="text-xs font-semibold text-slate-700">
                          {field.label}
                        </label>
                      </div>
                      <button
                        type="button"
                        onClick={() =>
                          setActiveTemplateField(
                            activeTemplateField === field.key ? null : field.key
                          )
                        }
                        className="text-[10px] font-medium text-sky-600 hover:text-sky-800 px-2 py-1 rounded-md hover:bg-sky-50"
                      >
                        {activeTemplateField === field.key ? "إغلاق" : "+ قوالب"}
                      </button>
                    </div>

                    {/* Templates row */}
                    {activeTemplateField === field.key && (
                      <div className="mb-2 flex flex-wrap gap-1.5 p-2 rounded-lg bg-slate-50 border border-slate-100">
                        {field.templates.map((t) => (
                          <button
                            key={t}
                            type="button"
                            onClick={() => appendTemplate(field.key, t + " ")}
                            className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-medium bg-white text-slate-700 border border-slate-200 hover:border-sky-300 hover:text-sky-700 transition"
                          >
                            + {t}
                          </button>
                        ))}
                      </div>
                    )}

                    <textarea
                      value={feedback[field.key]}
                      onChange={(e) =>
                        setFeedback((prev) => ({
                          ...prev,
                          [field.key]: e.target.value,
                        }))
                      }
                      rows={3}
                      placeholder={field.placeholder}
                      className={`w-full px-3 py-2 rounded-lg border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 ${colors.focus} transition resize-none`}
                    />
                  </div>
                );
              })}
            </div>
          </div>

          {/* Notes */}
          <div className="rounded-2xl bg-white border border-slate-200 p-4">
            <label className="block text-xs font-semibold text-slate-700 mb-2">
              ملاحظات إضافية (اختياري)
            </label>
            <VoiceRecorder
              onTranscript={(text) => setNotes((prev) => prev ? prev + " " + text : text)}
              placeholder="أو اضغط للتسجيل الصوتي..."
              className="mb-2"
            />
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              placeholder="أي حاجة تانية..."
              className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-400 transition resize-none"
            />
          </div>

          {/* Follow-up */}
          <div className="rounded-2xl bg-white border border-slate-200 p-4">
            <div className="text-xs font-semibold text-slate-700 mb-3">
              متابعة قادمة (اختياري)
            </div>
            <div className="space-y-2">
              <input
                type="datetime-local"
                value={followUpDate}
                onChange={(e) => setFollowUpDate(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-400"
              />
              <input
                type="text"
                value={followUpNotes}
                onChange={(e) => setFollowUpNotes(e.target.value)}
                placeholder="مثال: إرسال عينات"
                className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-400"
              />
            </div>
          </div>

          {/* Buttons */}
          <div className="flex gap-2">
            <button
              onClick={handleCheckOut}
              disabled={busy}
              className="flex-1 py-3 rounded-xl bg-gradient-to-r from-teal-500 to-emerald-500 text-white text-sm font-bold shadow-lg shadow-teal-500/20 hover:from-teal-600 hover:to-emerald-600 transition disabled:opacity-60"
            >
              {busy ? "جاري الحفظ..." : "إنهاء وحفظ"}
            </button>
            <button
              onClick={() => setShowCheckout(false)}
              disabled={busy}
              className="px-4 py-3 rounded-xl bg-white border border-slate-200 text-slate-700 text-xs font-medium hover:bg-slate-50"
            >
              إلغاء
            </button>
          </div>
        </div>
      )}

      {/* Display feedback (after completion) */}
      {isCompleted && (
        <div className="rounded-2xl bg-white border border-slate-200 overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-100 bg-gradient-to-r from-teal-50/50 to-emerald-50/50">
            <div className="flex items-center gap-2">
              <span className="w-7 h-7 rounded-lg bg-teal-100 text-teal-700 flex items-center justify-center">
                <Icon d={icons.check} size={14} />
              </span>
              <h2 className="text-sm font-semibold text-slate-900">
                Feedback الزيارة
              </h2>
            </div>
          </div>
          <div className="p-4 space-y-3">
            {visit.products && visit.products.length > 0 && (
              <div>
                <div className="text-[10px] font-semibold text-slate-500 mb-1.5">
                  المنتجات المناقشة
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {visit.products.map((p) => (
                    <span
                      key={p.id}
                      className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-medium bg-indigo-50 text-indigo-700 border border-indigo-100"
                    >
                      {p.name}
                    </span>
                  ))}
                </div>
              </div>
            )}
            {FEEDBACK_FIELDS.map((field) => {
              const val = visit[field.key];
              if (!val) return null;
              const colors = COLOR_MAP[field.color];
              return (
                <div key={field.key}>
                  <div className="flex items-center gap-2 mb-1">
                    <span
                      className={`w-5 h-5 rounded-md ${colors.bg} ${colors.text} flex items-center justify-center text-[10px] font-bold`}
                    >
                      {field.icon}
                    </span>
                    <div className="text-[10px] font-semibold text-slate-500">
                      {field.label}
                    </div>
                  </div>
                  <p className="text-sm text-slate-700 whitespace-pre-wrap leading-relaxed break-words">
                    {val}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {visit.next_follow_up_date && (
        <div className="rounded-2xl bg-amber-50 border border-amber-200 p-4">
          <div className="text-[11px] font-semibold text-amber-900 mb-1">
            متابعة قادمة
          </div>
          <div className="text-sm font-medium text-amber-900">
            {new Date(visit.next_follow_up_date).toLocaleString("ar-EG", {
              dateStyle: "medium",
              timeStyle: "short",
            })}
          </div>
          {visit.next_follow_up_notes && (
            <div className="text-xs text-amber-700 mt-1">
              {visit.next_follow_up_notes}
            </div>
          )}
        </div>
      )}
    </div>
  );
}