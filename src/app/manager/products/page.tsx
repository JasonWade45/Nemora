"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  PRODUCT_CATEGORIES,
  Product,
  User,
  createProduct,
  getAllUsers,
  getProducts,
  uploadImage,
} from "@/lib/api";
import { Icon, icons } from "@/components/ui/Icons";

function productInitial(name: string): string {
  const n = name.trim();
  if (!n) return "?";
  return n.slice(0, 2).toUpperCase();
}

function ProductCard({ p }: { p: Product }) {
  const [imgError, setImgError] = useState(false);
  const hasImage = !!p.image_url && !imgError;

  return (
    <div className="group rounded-2xl bg-white border border-slate-200 overflow-hidden hover:border-indigo-300 hover:shadow-lg hover:shadow-indigo-500/5 transition-all">
      <div className="relative aspect-square bg-gradient-to-br from-indigo-50 to-purple-50 overflow-hidden">
        {hasImage ? (
          <img
            src={p.image_url!}
            alt={p.name}
            onError={() => setImgError(true)}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-500 text-white flex items-center justify-center text-2xl font-bold shadow-lg shadow-indigo-500/20">
              {productInitial(p.name)}
            </div>
          </div>
        )}
        {p.category && (
          <span className="absolute top-2 end-2 inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-white/90 backdrop-blur text-indigo-700 border border-indigo-100 shadow-sm">
            {p.category}
          </span>
        )}
        {p.visible_to_all && (
          <span className="absolute top-2 start-2 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-teal-500/90 backdrop-blur text-white shadow-sm">
            <span className="w-1.5 h-1.5 rounded-full bg-white" />
            مشترك
          </span>
        )}
      </div>
      <div className="p-3">
        <h3 className="text-sm font-bold text-slate-900 leading-tight line-clamp-2 min-h-[2.5rem]">
          {p.name}
        </h3>
        {p.generic_name && (
          <div className="text-[11px] text-slate-500 mt-1 line-clamp-1">
            {p.generic_name}
          </div>
        )}
        {p.owner_name && (
          <div className="text-[10px] text-slate-400 mt-1.5 truncate">
            بواسطة: {p.owner_name}
          </div>
        )}
      </div>
    </div>
  );
}

export default function AdminProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Form
  const [name, setName] = useState("");
  const [genericName, setGenericName] = useState("");
  const [category, setCategory] = useState("");
  const [description, setDescription] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [visibleToAll, setVisibleToAll] = useState(false);
  const [assignedTo, setAssignedTo] = useState("");

  async function load() {
    try {
      const [res, allUsers] = await Promise.all([
        getProducts(),
        getAllUsers().catch(() => []),
      ]);
      setProducts(res.items || []);
      setUsers(allUsers);
    } catch {}
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  const reps = useMemo(
    () => users.filter((u) => u.role === "MEDICAL_REP" && u.is_active),
    [users]
  );

  const filtered = useMemo(() => {
    let list = products;
    if (activeCategory) {
      list = list.filter((p) => p.category === activeCategory);
    }
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          (p.generic_name ?? "").toLowerCase().includes(q) ||
          (p.category ?? "").toLowerCase().includes(q) ||
          (p.owner_name ?? "").toLowerCase().includes(q)
      );
    }
    return list;
  }, [products, activeCategory, search]);

  const availableCategories = useMemo(() => {
    const set = new Set<string>(PRODUCT_CATEGORIES);
    for (const p of products) {
      if (p.category && p.category.trim()) set.add(p.category.trim());
    }
    return Array.from(set);
  }, [products]);

  async function handleImagePick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);

    if (!file.type.startsWith("image/")) {
      setError("الملف لازم يكون صورة");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError("حجم الصورة لازم أقل من 5 ميجا");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => setImagePreview(reader.result as string);
    reader.readAsDataURL(file);

    setUploading(true);
    try {
      const { url } = await uploadImage(file);
      setImageUrl(url);
    } catch (err: any) {
      setError(err.message || "فشل رفع الصورة");
      setImagePreview(null);
      setImageUrl("");
    } finally {
      setUploading(false);
    }
  }

  function clearImage() {
    setImageUrl("");
    setImagePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  async function handleCreate() {
    if (!name.trim()) return;
    setBusy(true);
    setError(null);
    try {
      await createProduct({
        name: name.trim(),
        generic_name: genericName.trim() || null,
        category: category.trim() || null,
        description: description.trim() || null,
        image_url: imageUrl.trim() || null,
        visible_to_all: visibleToAll,
        assigned_to_user_id: assignedTo || null,
      });
      setName("");
      setGenericName("");
      setCategory("");
      setDescription("");
      clearImage();
      setVisibleToAll(false);
      setAssignedTo("");
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

  return (
    <div className="space-y-4 pb-4">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">المنتجات</h1>
          <p className="text-sm text-slate-600 mt-0.5">
            {loading
              ? "جاري التحميل..."
              : activeCategory
              ? `${activeCategory} · ${filtered.length} منتج`
              : `${filtered.length} منتج`}
          </p>
        </div>
        <button
          onClick={() => setShowForm((v) => !v)}
          className={`inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-semibold transition shadow-sm shrink-0 ${
            showForm
              ? "bg-slate-200 text-slate-700 hover:bg-slate-300"
              : "bg-gradient-to-r from-indigo-500 to-purple-500 text-white hover:from-indigo-600 hover:to-purple-600 shadow-indigo-500/20"
          }`}
        >
          <Icon d={showForm ? icons.close : icons.plus} size={14} />
          {showForm ? "إلغاء" : "منتج جديد"}
        </button>
      </div>

      {/* Form */}
      {showForm && (
        <div className="rounded-2xl bg-white border-2 border-indigo-100 p-4 space-y-3">
          <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
            <span className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-500 text-white flex items-center justify-center">
              <Icon d={icons.plus} size={16} />
            </span>
            <div className="text-sm font-bold text-slate-900">إضافة منتج جديد</div>
          </div>

          {error && (
            <div className="rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-xs text-red-700">
              {error}
            </div>
          )}

          {/* Image upload */}
          <div>
            <label className="block text-[11px] font-medium text-slate-600 mb-1.5">
              صورة المنتج
            </label>
            {imagePreview ? (
              <div className="relative rounded-xl overflow-hidden border border-slate-200 bg-slate-50">
                <img
                  src={imagePreview}
                  alt="preview"
                  className="w-full aspect-square object-cover"
                />
                {uploading && (
                  <div className="absolute inset-0 bg-black/50 flex items-center justify-center text-white text-xs font-medium">
                    جاري الرفع...
                  </div>
                )}
                {!uploading && imageUrl && (
                  <div className="absolute top-2 start-2 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-teal-500 text-white shadow-sm">
                    <Icon d={icons.check} size={10} />
                    تم الرفع
                  </div>
                )}
                <button
                  onClick={clearImage}
                  type="button"
                  className="absolute top-2 end-2 w-7 h-7 rounded-full bg-white/90 backdrop-blur text-red-600 flex items-center justify-center shadow-sm hover:bg-white"
                >
                  <Icon d={icons.close} size={13} />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="w-full aspect-square rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 hover:border-indigo-400 hover:bg-indigo-50/30 transition flex flex-col items-center justify-center gap-2 text-slate-500 hover:text-indigo-600"
              >
                <svg
                  width="32"
                  height="32"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4 M17 8l-5-5-5 5 M12 3v12" />
                </svg>
                <span className="text-xs font-medium">اضغط لرفع صورة</span>
                <span className="text-[10px]">JPG, PNG, WEBP — حتى 5 ميجا</span>
              </button>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleImagePick}
              className="hidden"
            />
          </div>

          <div>
            <label className="block text-[11px] font-medium text-slate-600 mb-1.5">
              اسم المنتج *
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="مثال: Cardivex"
              className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition"
            />
          </div>

          <div>
            <label className="block text-[11px] font-medium text-slate-600 mb-1.5">
              الاسم العلمي
            </label>
            <input
              type="text"
              value={genericName}
              onChange={(e) => setGenericName(e.target.value)}
              placeholder="مثال: Aspirin"
              className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition"
            />
          </div>

          <div>
            <label className="block text-[11px] font-medium text-slate-600 mb-1.5">
              التخصص / الفئة
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition"
            >
              <option value="">— اختر التخصص —</option>
              {PRODUCT_CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          {/* Visibility options */}
          <div className="rounded-xl bg-indigo-50/50 border border-indigo-100 p-3 space-y-3">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={visibleToAll}
                onChange={(e) => {
                  setVisibleToAll(e.target.checked);
                  if (e.target.checked) setAssignedTo("");
                }}
                className="w-4 h-4 rounded accent-indigo-500"
              />
              <div className="flex-1">
                <div className="text-xs font-semibold text-slate-800">
                  مشترك للجميع
                </div>
                <div className="text-[10px] text-slate-500 mt-0.5">
                  كل المندوبين في الشركة هيشوفوا المنتج
                </div>
              </div>
            </label>

            {!visibleToAll && (
              <div>
                <label className="block text-[11px] font-medium text-slate-600 mb-1.5">
                  أو خصص لمندوب
                </label>
                <select
                  value={assignedTo}
                  onChange={(e) => setAssignedTo(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition"
                >
                  <option value="">— لنفسي فقط —</option>
                  {reps.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.full_name}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          <div>
            <label className="block text-[11px] font-medium text-slate-600 mb-1.5">
              الوصف
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              placeholder="وصف مختصر للمنتج..."
              className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition resize-none"
            />
          </div>

          <button
            onClick={handleCreate}
            disabled={busy || !name.trim() || uploading}
            className="w-full py-2.5 rounded-lg bg-gradient-to-r from-indigo-500 to-purple-500 text-white text-sm font-bold shadow-md shadow-indigo-500/20 hover:from-indigo-600 hover:to-purple-600 transition disabled:opacity-60"
          >
            {busy ? "جاري الحفظ..." : "حفظ المنتج"}
          </button>
        </div>
      )}

      {/* Category dropdown */}
      {!loading && products.length > 0 && (
        <div className="relative z-30">
          <button
            onClick={() => setDropdownOpen((v) => !v)}
            className={`w-full flex items-center justify-between gap-3 px-4 py-3 rounded-2xl border bg-white transition-all duration-200 ${
              dropdownOpen
                ? "border-indigo-400 ring-4 ring-indigo-500/10 shadow-sm"
                : "border-slate-200 hover:border-slate-300"
            }`}
          >
            <div className="flex items-center gap-3 min-w-0">
              <span
                className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 transition-colors ${
                  activeCategory
                    ? "bg-indigo-500 text-white shadow-sm shadow-indigo-500/20"
                    : "bg-slate-100 text-slate-500"
                }`}
              >
                <Icon d={icons.doctors} size={16} />
              </span>
              <div className="flex flex-col items-start min-w-0">
                <span className="text-[10px] font-medium text-slate-500 leading-none mb-1">
                  التخصص
                </span>
                <span className="text-sm font-bold text-slate-900 truncate leading-none">
                  {activeCategory || "كل التخصصات"}
                </span>
              </div>
            </div>
            <span
              className={`text-slate-400 transition-transform duration-300 ${
                dropdownOpen ? "rotate-180" : "rotate-0"
              }`}
            >
              <Icon d={icons.chevron} size={20} />
            </span>
          </button>

          {dropdownOpen && (
            <>
              <div
                className="fixed inset-0 z-20"
                onClick={() => setDropdownOpen(false)}
              />
              <div className="absolute top-full start-0 end-0 mt-2 z-30">
                <div className="rounded-2xl border border-slate-200 bg-white shadow-xl shadow-slate-900/5 overflow-hidden">
                  <div className="max-h-72 overflow-y-auto py-1">
                    <button
                      onClick={() => {
                        setActiveCategory(null);
                        setDropdownOpen(false);
                      }}
                      className={`w-full flex items-center justify-between gap-3 px-4 py-2.5 text-start ${
                        !activeCategory
                          ? "bg-indigo-50 text-indigo-700"
                          : "text-slate-700 hover:bg-slate-50"
                      }`}
                    >
                      <span className="text-sm font-medium">كل التخصصات</span>
                      <span className="text-[10px] tabular-nums text-slate-400">
                        {products.length}
                      </span>
                    </button>
                    <div className="h-px bg-slate-100 mx-4 my-1" />
                    {availableCategories.map((c) => {
                      const active = activeCategory === c;
                      const cnt = products.filter((p) => p.category === c).length;
                      if (cnt === 0 && !active) return null;
                      return (
                        <button
                          key={c}
                          onClick={() => {
                            setActiveCategory(c);
                            setDropdownOpen(false);
                          }}
                          className={`w-full flex items-center justify-between gap-3 px-4 py-2.5 text-start ${
                            active
                              ? "bg-indigo-50 text-indigo-700"
                              : "text-slate-700 hover:bg-slate-50"
                          }`}
                        >
                          <span className="text-sm font-medium">{c}</span>
                          <span
                            className={`text-[10px] tabular-nums ${
                              active ? "text-indigo-600 font-semibold" : "text-slate-400"
                            }`}
                          >
                            {cnt}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* Search */}
      <div className="relative">
        <span className="absolute start-3 top-1/2 -translate-y-1/2 text-slate-400">
          <Icon d={icons.search} size={16} />
        </span>
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="ابحث بالاسم أو الاسم العلمي..."
          className="w-full ps-9 pe-3 py-2.5 rounded-xl border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition"
        />
      </div>

      {/* Grid */}
      {loading ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="rounded-2xl bg-white border border-slate-200 overflow-hidden">
              <div className="aspect-square bg-slate-100 animate-pulse" />
              <div className="p-3 space-y-2">
                <div className="h-4 bg-slate-100 rounded animate-pulse" />
                <div className="h-3 w-2/3 bg-slate-100 rounded animate-pulse" />
              </div>
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl bg-white border border-slate-200 p-12 text-center">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-100 to-purple-100 flex items-center justify-center text-indigo-500 mx-auto mb-4">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
            </svg>
          </div>
          <div className="text-base font-semibold text-slate-900 mb-1">
            {search || activeCategory ? "لا توجد نتائج" : "لا توجد منتجات بعد"}
          </div>
          <p className="text-xs text-slate-500 mb-5">
            {search || activeCategory
              ? "جرّب تعديل الفلتر أو البحث"
              : "ابدأ بإضافة أول منتج"}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {filtered.map((p) => (
            <ProductCard key={p.id} p={p} />
          ))}
        </div>
      )}
    </div>
  );
}