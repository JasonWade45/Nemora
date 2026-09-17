"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Doctor,
  Product,
  Sale,
  createSale,
  deleteSale,
  getAllDoctors,
  getProducts,
  getSales,
} from "@/lib/api";
import { Icon, icons } from "@/components/ui/Icons";

function fmtDate(dt: string | null | undefined) {
  if (!dt) return "—";
  try {
    return new Date(dt).toLocaleDateString("ar-EG", { day: "numeric", month: "short" });
  } catch {
    return "—";
  }
}

function fmtMoney(v: number) {
  return v.toLocaleString("ar-EG", { maximumFractionDigits: 0 }) + " ج";
}

const STATUS_META: Record<string, { ar: string; color: string }> = {
  PENDING: { ar: "معلقة", color: "bg-amber-100 text-amber-700 border-amber-200" },
  CONFIRMED: { ar: "مؤكدة", color: "bg-sky-100 text-sky-700 border-sky-200" },
  DELIVERED: { ar: "تم التسليم", color: "bg-teal-100 text-teal-700 border-teal-200" },
  CANCELLED: { ar: "ملغاة", color: "bg-slate-100 text-slate-600 border-slate-200" },
};

export default function RepSalesPage() {
  const [sales, setSales] = useState<Sale[]>([]);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [doctorId, setDoctorId] = useState("");
  const [productId, setProductId] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [unitPrice, setUnitPrice] = useState<string>("");
  const [unitCost, setUnitCost] = useState<string>("");
  const [notes, setNotes] = useState("");

  async function load() {
    try {
      const [s, d, p] = await Promise.all([
        getSales({ days: 30 }).catch(() => ({ items: [], total: 0, total_revenue: 0, total_cost: 0, total_profit: 0 })),
        getAllDoctors().catch(() => []),
        getProducts().then((r) => r.items).catch(() => []),
      ]);
      setSales(s.items || []);
      setDoctors(d || []);
      setProducts(p || []);
    } catch {}
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  const totalRevenue = useMemo(() => sales.reduce((sum, s) => sum + s.total_price, 0), [sales]);
  const totalProfit = useMemo(() => sales.reduce((sum, s) => sum + s.profit, 0), [sales]);

  const selectedProduct = useMemo(
    () => products.find((p) => p.id === productId),
    [products, productId]
  );

  useEffect(() => {
    if (selectedProduct) {
      if (!unitPrice && selectedProduct.unit_price != null) setUnitPrice(String(selectedProduct.unit_price));
      if (!unitCost && selectedProduct.unit_cost != null) setUnitCost(String(selectedProduct.unit_cost));
    }
  }, [selectedProduct, unitPrice, unitCost]);

  function resetForm() {
    setDoctorId("");
    setProductId("");
    setQuantity(1);
    setUnitPrice("");
    setUnitCost("");
    setNotes("");
    setError(null);
  }

  async function handleCreate() {
    if (!doctorId || !productId) {
      setError("لازم تختار الدكتور والمنتج");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await createSale({
        doctor_id: doctorId,
        product_id: productId,
        quantity,
        unit_price: unitPrice ? parseFloat(unitPrice) : null,
        unit_cost: unitCost ? parseFloat(unitCost) : null,
        notes: notes || null,
      });
      resetForm();
      setShowForm(false);
      await load();
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

  async function handleDelete(id: string) {
    if (!confirm("متأكد من الحذف؟")) return;
    try {
      await deleteSale(id);
      await load();
    } catch (e: any) {
      alert(e.message);
    }
  }

  return (
    <div className="space-y-4 pb-4">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">مبيعاتي</h1>
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-0.5">
            {loading ? "..." : `${sales.length} عملية بيع في آخر 30 يوم`}
          </p>
        </div>
        <button
          onClick={() => setShowForm((v) => !v)}
          className={`inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-semibold transition shadow-sm shrink-0 ${
            showForm
              ? "bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300"
              : "bg-gradient-to-r from-teal-500 to-emerald-500 text-white shadow-teal-500/20"
          }`}
        >
          <Icon d={showForm ? icons.close : icons.plus} size={14} />
          {showForm ? "إلغاء" : "بيع جديد"}
        </button>
      </div>

      {/* Stats */}
      {!loading && sales.length > 0 && (
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-2xl bg-gradient-to-br from-teal-500 to-emerald-500 text-white p-4 shadow-lg shadow-teal-500/20">
            <div className="text-[11px] text-white/90 mb-1">إجمالي الإيرادات (30 يوم)</div>
            <div className="text-2xl font-bold tabular-nums">{fmtMoney(totalRevenue)}</div>
          </div>
          <div className="rounded-2xl bg-gradient-to-br from-sky-500 to-cyan-500 text-white p-4 shadow-lg shadow-sky-500/20">
            <div className="text-[11px] text-white/90 mb-1">الأرباح (30 يوم)</div>
            <div className="text-2xl font-bold tabular-nums">{fmtMoney(totalProfit)}</div>
          </div>
        </div>
      )}

      {/* Form */}
      {showForm && (
        <div className="rounded-2xl bg-white dark:bg-slate-900 border-2 border-teal-100 dark:border-teal-500/20 p-4 space-y-3">
          <div className="flex items-center gap-2 pb-2 border-b border-slate-100 dark:border-slate-800">
            <span className="w-8 h-8 rounded-lg bg-gradient-to-br from-teal-500 to-emerald-500 text-white flex items-center justify-center">
              <Icon d={icons.plus} size={16} />
            </span>
            <div className="text-sm font-bold text-slate-900 dark:text-white">تسجيل بيع جديد</div>
          </div>

          {error && (
            <div className="rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-xs text-red-700">
              {error}
            </div>
          )}

          <div>
            <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-400 mb-1.5">
              الدكتور *
            </label>
            <select
              value={doctorId}
              onChange={(e) => setDoctorId(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-sm"
            >
              <option value="">— اختر الدكتور —</option>
              {doctors.slice(0, 300).map((d) => (
                <option key={d.id} value={d.id}>
                  {d.full_name || "دكتور"} {d.specialty ? `— ${d.specialty}` : ""}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-400 mb-1.5">
              المنتج *
            </label>
            <select
              value={productId}
              onChange={(e) => setProductId(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-sm"
            >
              <option value="">— اختر المنتج —</option>
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} {p.category ? `— ${p.category}` : ""}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-400 mb-1.5">
                الكمية *
              </label>
              <input
                type="number"
                min={1}
                value={quantity}
                onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-sm tabular-nums"
              />
            </div>
            <div>
              <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-400 mb-1.5">
                سعر الوحدة (اختياري)
              </label>
              <input
                type="number"
                step="0.01"
                value={unitPrice}
                onChange={(e) => setUnitPrice(e.target.value)}
                placeholder="من إعدادات المنتج"
                className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-sm tabular-nums"
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-400 mb-1.5">
              تكلفة الوحدة (اختياري)
            </label>
            <input
              type="number"
              step="0.01"
              value={unitCost}
              onChange={(e) => setUnitCost(e.target.value)}
              placeholder="من إعدادات المنتج"
              className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-sm tabular-nums"
            />
          </div>

          <div>
            <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-400 mb-1.5">
              ملاحظات
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="أي ملاحظات إضافية..."
              className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-sm"
            />
          </div>

          {quantity > 0 && unitPrice && (
            <div className="rounded-xl bg-teal-50 dark:bg-teal-500/10 border border-teal-100 dark:border-teal-500/20 p-3">
              <div className="flex justify-between text-xs">
                <span className="text-teal-900 dark:text-teal-300">الإجمالي المتوقع:</span>
                <span className="font-bold tabular-nums text-teal-700">
                  {fmtMoney((parseFloat(unitPrice) || 0) * quantity)}
                </span>
              </div>
            </div>
          )}

          <button
            onClick={handleCreate}
            disabled={busy || !doctorId || !productId}
            className="w-full py-3 rounded-xl bg-gradient-to-r from-teal-500 to-emerald-500 text-white text-sm font-bold shadow-md shadow-teal-500/20 disabled:opacity-60"
          >
            {busy ? "جاري الحفظ..." : "حفظ البيع"}
          </button>
        </div>
      )}

      {/* Sales List */}
      {loading ? (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-20 rounded-2xl bg-slate-100 dark:bg-slate-800 animate-pulse" />
          ))}
        </div>
      ) : sales.length === 0 ? (
        <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-10 text-center">
          <div className="w-14 h-14 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400 mx-auto mb-3">
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2 8m0 0h14M7 21h10" />
            </svg>
          </div>
          <div className="text-sm font-medium text-slate-900 dark:text-white mb-1">لا توجد مبيعات بعد</div>
          <p className="text-xs text-slate-500 mb-4">ابدأ بتسجيل أول عملية بيع</p>
          <button
            onClick={() => setShowForm(true)}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-teal-500 text-white text-xs font-medium"
          >
            <Icon d={icons.plus} size={14} />
            بيع جديد
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          {sales.map((s) => {
            const meta = STATUS_META[s.status] || STATUS_META.CONFIRMED;
            return (
              <div
                key={s.id}
                className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4"
              >
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-teal-500 to-emerald-500 text-white flex items-center justify-center font-bold text-xs shrink-0">
                      {s.doctor_name?.slice(0, 1) || "?"}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-bold text-slate-900 dark:text-white truncate">
                        {s.doctor_name}
                      </div>
                      <div className="text-[11px] text-slate-500 truncate">
                        {s.product_name} × {s.quantity}
                      </div>
                    </div>
                  </div>
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold border shrink-0 ${meta.color}`}>
                    {meta.ar}
                  </span>
                </div>
                <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-800">
                  <div className="flex items-center gap-3 text-xs">
                    <span className="text-slate-500">{fmtDate(s.sold_at)}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-end">
                      <div className="text-sm font-bold text-teal-600 tabular-nums">
                        {fmtMoney(s.total_price)}
                      </div>
                      {s.profit > 0 && (
                        <div className="text-[10px] text-slate-500">
                          ربح: {fmtMoney(s.profit)}
                        </div>
                      )}
                    </div>
                    <button
                      onClick={() => handleDelete(s.id)}
                      className="w-8 h-8 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 flex items-center justify-center transition"
                      title="حذف"
                    >
                      <Icon d={icons.close} size={14} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}