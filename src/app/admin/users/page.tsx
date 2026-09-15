"use client";

import { useEffect, useMemo, useState } from "react";
import {
  User,
  getAllUsers,
  createUser,
  updateUser,
  getToken,
  getAllDoctors,
} from "@/lib/api";
import { useLanguage } from "@/lib/language-context";
import { Icon, icons } from "@/components/ui/Icons";

const ROLE_META = {
  ADMIN: { ar: "أدمن", en: "Admin", color: "text-violet-700", bg: "bg-violet-50 border-violet-200" },
  MANAGER: { ar: "مدير", en: "Manager", color: "text-sky-700", bg: "bg-sky-50 border-sky-200" },
  MEDICAL_REP: { ar: "مندوب", en: "Medical Rep", color: "text-teal-700", bg: "bg-teal-50 border-teal-200" },
};

function roleMeta(role) {
  return ROLE_META[role] || { ar: role, en: role, color: "text-slate-700", bg: "bg-slate-100 border-slate-200" };
}

function initials(name) {
  const parts = (name || "?").trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

function MemberModal({ isOpen, onClose, onSaved, editing, allSpecialties }) {
  const { lang } = useLanguage();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("MEDICAL_REP");
  const [phone, setPhone] = useState("");
  const [specialties, setSpecialties] = useState([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [showPw, setShowPw] = useState(false);

  useEffect(() => {
    if (isOpen) {
      if (editing) {
        setFullName(editing.full_name || "");
        setEmail(editing.email || "");
        setRole(editing.role || "MEDICAL_REP");
        setPhone(editing.phone || "");
        setSpecialties(editing.specialties || []);
        setPassword("");
      } else {
        setFullName(""); setEmail(""); setPassword("");
        setRole("MEDICAL_REP"); setPhone(""); setSpecialties([]);
      }
      setError(null); setShowPw(false);
    }
  }, [isOpen, editing]);

  if (!isOpen) return null;

  function toggleSpecialty(s) {
    setSpecialties((prev) => prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null); setSaving(true);
    try {
      if (editing) {
        await updateUser(editing.id, { full_name: fullName, role, phone: phone || null, specialties });
      } else {
        await createUser({ full_name: fullName, email, password, role, phone: phone || null, specialties });
      }
      onSaved(); onClose();
    } catch (err) {
      let msg = (err && err.message) || "Failed to save";
      try { const parsed = JSON.parse(msg); msg = parsed.detail || msg; } catch {}
      setError(msg);
    } finally { setSaving(false); }
  }

  const isRep = role === "MEDICAL_REP";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden max-h-[90vh] flex flex-col">
        <div className="px-6 py-5 border-b border-slate-200 flex items-center justify-between shrink-0">
          <h3 className="text-lg font-semibold text-slate-900">
            {editing ? (lang === "ar" ? "تعديل بيانات العضو" : "Edit member") : (lang === "ar" ? "إضافة عضو جديد" : "Add new member")}
          </h3>
          <button onClick={onClose} className="w-8 h-8 rounded-lg hover:bg-slate-100 flex items-center justify-center text-slate-500">
            <Icon d={icons.close} size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto">
          {error && <div className="rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-xs text-red-700">{error}</div>}

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1.5">{lang === "ar" ? "الاسم الكامل" : "Full name"}</label>
            <input type="text" required value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Ahmed Hassan"
              className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-400 transition" />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1.5">{lang === "ar" ? "البريد الإلكتروني" : "Email"}</label>
            <input type="email" required disabled={!!editing} value={email} onChange={(e) => setEmail(e.target.value)} placeholder="user@company.com"
              className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-400 transition disabled:bg-slate-50 disabled:text-slate-500" />
          </div>

          {!editing && (
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1.5">{lang === "ar" ? "كلمة المرور" : "Password"}</label>
              <div className="relative">
                <input type={showPw ? "text" : "password"} required minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••"
                  className="w-full px-3 py-2 pe-12 rounded-lg border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-400 transition" />
                <button type="button" onClick={() => setShowPw(!showPw)} className="absolute end-2 top-1/2 -translate-y-1/2 text-[11px] font-medium text-slate-500 hover:text-slate-800 px-2">
                  {showPw ? (lang === "ar" ? "إخفاء" : "Hide") : (lang === "ar" ? "إظهار" : "Show")}
                </button>
              </div>
              <p className="mt-1 text-[11px] text-slate-500">{lang === "ar" ? "8 أحرف على الأقل" : "At least 8 characters"}</p>
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1.5">{lang === "ar" ? "الدور" : "Role"}</label>
            <select value={role} onChange={(e) => setRole(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-400 transition">
              <option value="MEDICAL_REP">{lang === "ar" ? "مندوب طبي" : "Medical Rep"}</option>
              <option value="MANAGER">{lang === "ar" ? "مدير" : "Manager"}</option>
              <option value="ADMIN">{lang === "ar" ? "أدمن" : "Admin"}</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1.5">{lang === "ar" ? "الهاتف (اختياري)" : "Phone (optional)"}</label>
            <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="01xxxxxxxxx"
              className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-400 transition" />
          </div>

          {isRep && (
            <div className="rounded-xl bg-teal-50/60 border border-teal-100 p-4">
              <label className="block text-xs font-medium text-teal-900 mb-2">
                {lang === "ar" ? "التخصصات المسؤول عنها" : "Assigned specialties"}
              </label>
              <p className="text-[11px] text-teal-700 mb-3">
                {lang === "ar" ? "المندوب سيرى دكاترة هذه التخصصات فقط" : "The rep will only see doctors from these specialties"}
              </p>
              {allSpecialties.length === 0 ? (
                <div className="text-[11px] text-slate-500">{lang === "ar" ? "لا توجد تخصصات بعد" : "No specialties yet"}</div>
              ) : (
                <div className="flex flex-wrap gap-1.5 max-h-40 overflow-y-auto">
                  {allSpecialties.map((s) => {
                    const active = specialties.includes(s);
                    return (
                      <button key={s} type="button" onClick={() => toggleSpecialty(s)}
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium transition border ${
                          active ? "bg-teal-500 text-white border-teal-500" : "bg-white text-slate-600 border-slate-200 hover:border-teal-300"
                        }`}>
                        {active && <Icon d={icons.check} size={11} />}
                        {s}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          <div className="flex items-center gap-2 pt-2">
            <button type="submit" disabled={saving}
              className="flex-1 px-4 py-2.5 rounded-lg bg-slate-900 hover:bg-slate-800 disabled:bg-slate-400 text-white text-sm font-medium transition">
              {saving ? (lang === "ar" ? "جاري الحفظ..." : "Saving...") : (lang === "ar" ? "حفظ" : "Save")}
            </button>
            <button type="button" onClick={onClose} disabled={saving}
              className="px-4 py-2.5 rounded-lg bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-sm font-medium transition">
              {lang === "ar" ? "إلغاء" : "Cancel"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function UsersPage() {
  const { lang } = useLanguage();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [currentUserId, setCurrentUserId] = useState(null);
  const [allSpecialties, setAllSpecialties] = useState([]);

  async function load() {
    try {
      const list = await getAllUsers();
      setUsers(list);
    } catch (e) {
      setError((e && e.message) || "Failed to load users");
    } finally { setLoading(false); }
  }

  useEffect(() => {
    load();
    const token = getToken();
    if (token) {
      try { const payload = JSON.parse(atob(token.split(".")[1])); setCurrentUserId(payload.sub); } catch {}
    }
    (async () => {
      try {
        const doctors = await getAllDoctors();
        const set = new Set();
        for (const d of doctors) {
          if (d.specialty && d.specialty.trim()) set.add(d.specialty.trim());
        }
        setAllSpecialties(Array.from(set).sort());
      } catch {}
    })();
  }, []);

  const filtered = useMemo(() => {
    let list = users;
    if (roleFilter) list = list.filter((u) => u.role === roleFilter);
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter((u) => (u.full_name || "").toLowerCase().includes(q) || (u.email || "").toLowerCase().includes(q));
    }
    return list;
  }, [users, roleFilter, search]);

  const counts = useMemo(() => ({
    all: users.length,
    ADMIN: users.filter((u) => u.role === "ADMIN").length,
    MANAGER: users.filter((u) => u.role === "MANAGER").length,
    MEDICAL_REP: users.filter((u) => u.role === "MEDICAL_REP").length,
  }), [users]);

  async function toggleActive(user) {
    try { await updateUser(user.id, { is_active: !user.is_active }); await load(); }
    catch (e) { alert((e && e.message) || "Failed"); }
  }

  return (
    <div className="max-w-7xl mx-auto">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">
            {lang === "ar" ? "فريق العمل" : "Team"}
          </h1>
          <p className="mt-1 text-slate-600 text-sm">
            {counts.all} {lang === "ar" ? "عضو" : "members"} · {filtered.length} {lang === "ar" ? "ظاهر" : "shown"}
          </p>
        </div>
        <button onClick={() => { setEditing(null); setModalOpen(true); }}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-slate-900 hover:bg-slate-800 text-white text-sm font-medium transition shadow-sm">
          <Icon d={icons.plus} size={16} />
          {lang === "ar" ? "إضافة عضو" : "Add Member"}
        </button>
      </div>

      <div className="mb-4">
        <div className="relative max-w-md">
          <span className="absolute start-3 top-1/2 -translate-y-1/2 text-slate-400"><Icon d={icons.search} size={18} /></span>
          <input type="text" value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder={lang === "ar" ? "ابحث بالاسم أو البريد..." : "Search by name or email..."}
            className="w-full ps-10 pe-4 py-2.5 rounded-xl border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-400 transition" />
        </div>
      </div>

      <div className="mb-6 flex flex-wrap gap-2">
        <button onClick={() => setRoleFilter(null)}
          className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold transition border ${
            roleFilter === null ? "bg-slate-900 text-white border-slate-900" : "bg-white text-slate-600 border-slate-200 hover:border-slate-300"
          }`}>
          {lang === "ar" ? "الكل" : "All"}
          <span className={`text-[10px] tabular-nums ${roleFilter === null ? "text-white/70" : "text-slate-400"}`}>{counts.all}</span>
        </button>
        {["ADMIN", "MANAGER", "MEDICAL_REP"].map((r) => {
          const meta = roleMeta(r);
          const active = roleFilter === r;
          return (
            <button key={r} onClick={() => setRoleFilter(active ? null : r)}
              className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold transition border ${
                active ? "bg-sky-500 text-white border-sky-500" : "bg-white text-slate-600 border-slate-200 hover:border-sky-300"
              }`}>
              {lang === "ar" ? meta.ar : meta.en}
              <span className={`text-[10px] tabular-nums ${active ? "text-white/80" : "text-slate-400"}`}>{counts[r]}</span>
            </button>
          );
        })}
      </div>

      {error && <div className="mb-6 rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">{error}</div>}

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="rounded-2xl bg-white border border-slate-200 p-5">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-full bg-slate-100 animate-pulse" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-32 bg-slate-100 rounded animate-pulse" />
                  <div className="h-3 w-40 bg-slate-100 rounded animate-pulse" />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl bg-white border border-slate-200 p-12 text-center">
          <div className="text-slate-900 font-medium mb-1">
            {users.length === 0 ? (lang === "ar" ? "لا يوجد أعضاء بعد" : "No team members yet.") : (lang === "ar" ? "لا توجد نتائج" : "No results.")}
          </div>
          <p className="text-sm text-slate-500">
            {users.length === 0 ? (lang === "ar" ? "ابدأ بإضافة أعضاء فريقك." : "Start by adding team members.") : (lang === "ar" ? "جرّب تعديل البحث." : "Try adjusting your search.")}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map((u) => {
            const meta = roleMeta(u.role);
            const isSelf = currentUserId === u.id;
            const specs = u.specialties || [];
            return (
              <div key={u.id} className="rounded-2xl bg-white border border-slate-200 p-5 hover:border-slate-300 transition">
                <div className="flex items-start gap-4 mb-4">
                  <div className="relative">
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center font-semibold text-sm shrink-0 ${
                      u.is_active ? "bg-gradient-to-br from-sky-500 to-teal-500 text-white" : "bg-slate-200 text-slate-500"
                    }`}>{initials(u.full_name)}</div>
                    <span className={`absolute -bottom-0.5 -end-0.5 w-3 h-3 rounded-full border-2 border-white ${u.is_active ? "bg-teal-500" : "bg-slate-400"}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-slate-900 truncate leading-tight">{u.full_name}</div>
                    <div className="text-xs text-slate-500 truncate mt-0.5">{u.email}</div>
                  </div>
                </div>

                <div className="flex items-center gap-2 mb-3 flex-wrap">
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold border ${meta.bg} ${meta.color}`}>
                    {lang === "ar" ? meta.ar : meta.en}
                  </span>
                  {!u.is_active && (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-600 border border-slate-200">
                      {lang === "ar" ? "موقوف" : "Inactive"}
                    </span>
                  )}
                  {isSelf && (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-amber-50 text-amber-700 border border-amber-200">
                      {lang === "ar" ? "أنت" : "You"}
                    </span>
                  )}
                </div>

                {u.role === "MEDICAL_REP" && specs.length > 0 && (
                  <div className="mb-3 pt-3 border-t border-slate-100">
                    <div className="text-[10px] text-slate-500 mb-1.5">{lang === "ar" ? "التخصصات" : "Specialties"}</div>
                    <div className="flex flex-wrap gap-1">
                      {specs.slice(0, 4).map((s) => (
                        <span key={s} className="inline-flex px-2 py-0.5 rounded-full text-[10px] font-medium bg-teal-50 text-teal-700 border border-teal-100">{s}</span>
                      ))}
                      {specs.length > 4 && (
                        <span className="inline-flex px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-100 text-slate-600">+{specs.length - 4}</span>
                      )}
                    </div>
                  </div>
                )}

                <div className="flex gap-2">
                  <button onClick={() => { setEditing(u); setModalOpen(true); }}
                    className="flex-1 px-3 py-1.5 rounded-lg bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-medium transition">
                    {lang === "ar" ? "تعديل" : "Edit"}
                  </button>
                  <button onClick={() => toggleActive(u)} disabled={isSelf}
                    className={`flex-1 px-3 py-1.5 rounded-lg text-xs font-medium transition border ${
                      isSelf ? "bg-slate-50 border-slate-100 text-slate-400 cursor-not-allowed"
                      : u.is_active ? "bg-red-50 border-red-200 text-red-700 hover:bg-red-100"
                      : "bg-teal-50 border-teal-200 text-teal-700 hover:bg-teal-100"
                    }`}>
                    {u.is_active ? (lang === "ar" ? "إيقاف" : "Deactivate") : (lang === "ar" ? "تنشيط" : "Activate")}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <MemberModal isOpen={modalOpen} onClose={() => { setModalOpen(false); setEditing(null); }} onSaved={load} editing={editing} allSpecialties={allSpecialties} />
    </div>
  );
}
