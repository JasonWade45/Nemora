import pathlib

frontend = pathlib.Path(r"C:\Users\ATG\Documents\Default Project\pharma-crm\src")
app = frontend / "app"

# ============ 1) Add new animations to globals.css ============
globals_file = app / "globals.css"
globals_content = globals_file.read_text(encoding="utf-8")

if "shimmer" not in globals_content:
    globals_content += """

@keyframes shimmer {
  0% { background-position: -200% 0; }
  100% { background-position: 200% 0; }
}

@keyframes glowPulse {
  0%, 100% { box-shadow: 0 0 0 0 rgba(14, 165, 233, 0.4); }
  50% { box-shadow: 0 0 0 6px rgba(14, 165, 233, 0); }
}

@keyframes slideInDown {
  from { opacity: 0; transform: translateY(-6px); }
  to { opacity: 1; transform: translateY(0); }
}

.animate-shimmer {
  background-size: 200% 100%;
  animation: shimmer 3s linear infinite;
}

.animate-glow-pulse {
  animation: glowPulse 2.5s ease-in-out infinite;
}

.animate-slide-in-down {
  animation: slideInDown 0.4s ease-out;
}
"""
    globals_file.write_text(globals_content, encoding="utf-8")
    print("OK - globals.css animations added")
else:
    print("INFO - animations already present")

# ============ 2) Rep layout — fancy company name ============
layout_file = app / "rep" / "layout.tsx"
layout = r'''"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { NemoraLogo } from "@/components/brand/NemoraLogo";
import { Icon, icons } from "@/components/ui/Icons";
import { clearToken, getToken, apiFetch } from "@/lib/api";

const TABS = [
  { href: "/rep",            label: "لوحتي",   icon: icons.dashboard },
  { href: "/rep/nearby",     label: "قريبون",  icon: icons.pin },
  { href: "/rep/my-doctors", label: "أطبائي",  icon: icons.doctors },
  { href: "/rep/visits",     label: "زياراتي", icon: icons.visits },
  { href: "/rep/profile",    label: "حسابي",   icon: icons.users },
];

export default function RepLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [ready, setReady] = useState(false);
  const [userName, setUserName] = useState("Rep");
  const [userEmail, setUserEmail] = useState("");
  const [orgName, setOrgName] = useState("");

  useEffect(() => {
    const token = getToken();
    if (!token) { router.push("/login"); return; }
    try {
      const payload = JSON.parse(atob(token.split(".")[1]));
      if (payload.role === "ADMIN") { router.push("/admin"); return; }
      if (payload.role === "MANAGER") { router.push("/manager"); return; }
    } catch {
      clearToken(); router.push("/login"); return;
    }
    (async () => {
      try {
        const me: any = await apiFetch("/api/auth/me");
        setUserName(me.full_name ?? me.email ?? "Rep");
        setUserEmail(me.email ?? "");
        const org: any = await apiFetch("/api/organizations/me").catch(() => null);
        if (org) setOrgName(org.name ?? "");
      } catch {}
      setReady(true);
    })();
  }, [router]);

  if (!ready) return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="w-5 h-5 border-2 border-slate-300 border-t-sky-500 rounded-full animate-spin" />
    </div>
  );

  function logout() { clearToken(); router.push("/login"); }

  const initials = userName.split(" ").map((n: string) => n[0]).slice(0, 2).join("").toUpperCase();

  return (
    <div className="min-h-screen bg-slate-50 pb-24" dir="rtl">
      {/* ============ HEADER ============ */}
      <header className="sticky top-0 z-40 bg-gradient-to-b from-slate-900 via-slate-900 to-slate-800 border-b border-slate-700/50 shadow-xl shadow-slate-900/10">
        <div className="max-w-3xl mx-auto px-4 py-3.5 flex items-center justify-between gap-3">

          {/* User avatar + name */}
          <button onClick={logout} className="flex items-center gap-2.5 shrink-0 group">
            <div className="relative">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-sky-400 to-teal-400 flex items-center justify-center text-white text-xs font-bold shadow-lg shadow-sky-500/30 group-hover:shadow-sky-400/50 transition-all duration-300">
                {initials}
              </div>
              <span className="absolute -bottom-0.5 -end-0.5 w-3 h-3 rounded-full bg-teal-400 border-2 border-slate-900 animate-pulse-dot" />
            </div>
            <div className="text-end hidden sm:block">
              <div className="text-sm font-semibold text-white leading-tight">
                {userName}
              </div>
              <div className="text-[10px] text-slate-400 leading-tight">
                {userEmail}
              </div>
            </div>
          </button>

          {/* Company name — fancy */}
          {orgName && (
            <div className="flex-1 min-w-0 flex justify-center animate-slide-in-down">
              <div className="relative inline-flex items-center gap-2.5 px-5 py-2 rounded-full bg-gradient-to-r from-sky-500/20 via-teal-500/20 to-sky-500/20 border border-sky-400/30 backdrop-blur-sm overflow-hidden animate-glow-pulse">
                {/* shimmer layer */}
                <div
                  className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent animate-shimmer pointer-events-none"
                  style={{ backgroundSize: "200% 100%" }}
                />
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  className="text-sky-300 shrink-0"
                >
                  <path d="M3 21h18 M5 21V7l8-4v18 M19 21V11l-6-4 M9 9h.01 M9 12h.01 M9 15h.01 M9 18h.01" />
                </svg>
                <span className="relative text-base font-bold tracking-wide bg-gradient-to-r from-white via-sky-100 to-white bg-clip-text text-transparent whitespace-nowrap">
                  {orgName}
                </span>
                <span className="relative w-1.5 h-1.5 rounded-full bg-teal-400 animate-pulse-dot" />
              </div>
            </div>
          )}

          {/* NEMORA logo */}
          <Link href="/rep" className="flex items-center gap-2 shrink-0 group">
            <span className="text-base font-bold tracking-tight text-white group-hover:text-sky-300 transition">
              NEMORA
            </span>
            <NemoraLogo size={26} dark />
          </Link>
        </div>
      </header>

      {/* Page content */}
      <main className="max-w-3xl mx-auto px-4 py-5">
        {children}
      </main>

      {/* Bottom nav */}
      <nav className="fixed bottom-0 inset-x-0 z-50 bg-white border-t border-slate-200 shadow-2xl shadow-slate-900/5">
        <div className="max-w-3xl mx-auto grid grid-cols-5">
          {TABS.map((tab) => {
            const active =
              tab.href === "/rep"
                ? pathname === "/rep"
                : pathname.startsWith(tab.href);
            return (
              <Link
                key={tab.href}
                href={tab.href}
                className={`relative flex flex-col items-center gap-0.5 py-3 transition-all duration-200 ${
                  active ? "text-sky-600" : "text-slate-400 hover:text-slate-600"
                }`}
              >
                {active && (
                  <span className="absolute top-0 left-1/2 -translate-x-1/2 w-10 h-0.5 rounded-full bg-gradient-to-r from-sky-500 to-teal-500" />
                )}
                <Icon d={tab.icon} size={21} stroke={active ? 2.3 : 1.8} />
                <span className={`text-[10px] ${active ? "font-bold" : "font-medium"}`}>
                  {tab.label}
                </span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
'''
layout_file.write_text(layout, encoding="utf-8")
print("OK - rep/layout.tsx (fancy header)")

# ============ 3) My Doctors — with specialty filter chips + clickable cards ============
doctors_page = app / "rep" / "my-doctors" / "page.tsx"
page = r'''"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Doctor, apiFetch, doctorDisplayName, getAllDoctors } from "@/lib/api";
import { Icon, icons } from "@/components/ui/Icons";

const SPECIALTY_COLORS: Record<string, string> = {
  "جلدية": "from-rose-500 to-pink-500",
  "أسنان": "from-sky-500 to-cyan-500",
  "أطفال": "from-amber-500 to-orange-500",
  "عيون": "from-indigo-500 to-violet-500",
  "عظام": "from-slate-600 to-slate-800",
  "باطنة": "from-teal-500 to-emerald-500",
  "نساء وتوليد": "from-fuchsia-500 to-purple-500",
  "قلب": "from-red-500 to-rose-600",
  "مخ وأعصاب": "from-violet-500 to-purple-600",
  "مسالك بولية": "from-cyan-500 to-blue-500",
  "أنف وأذن وحنجرة": "from-lime-500 to-green-500",
  "جهاز هضمي": "from-orange-500 to-red-500",
  "نفسية": "from-emerald-500 to-teal-500",
  "صدر وحساسية": "from-sky-400 to-blue-500",
  "مستشفى": "from-slate-500 to-slate-700",
  "مختبرات": "from-yellow-500 to-amber-500",
};

function specColor(spec?: string | null) {
  if (!spec) return "from-slate-400 to-slate-600";
  return SPECIALTY_COLORS[spec] ?? "from-sky-500 to-teal-500";
}

function initials(name: string) {
  const parts = name.replace(/^(د\.?|د\/|دكتور|دكتورة|Dr\.?|Doctor)\s*/i, "").split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2);
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

export default function MyDoctorsPage() {
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [mySpecs, setMySpecs] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [activeSpec, setActiveSpec] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const me: any = await apiFetch("/api/auth/me").catch(() => null);
        setMySpecs(me?.specialties ?? []);
        const all = await getAllDoctors();
        setDoctors(all);
      } catch {}
      setLoading(false);
    })();
  }, []);

  // Specialty counts (only within rep's own specialties)
  const specCounts = useMemo(() => {
    const map = new Map<string, number>();
    for (const d of doctors) {
      const s = (d.specialty ?? "").trim();
      if (!s) continue;
      map.set(s, (map.get(s) ?? 0) + 1);
    }
    return map;
  }, [doctors]);

  const filtered = useMemo(() => {
    let list = doctors;
    if (activeSpec) {
      list = list.filter((d) => (d.specialty ?? "").trim() === activeSpec);
    }
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(
        (d) =>
          doctorDisplayName(d).toLowerCase().includes(q) ||
          (d.specialty ?? "").toLowerCase().includes(q) ||
          (d.phone ?? "").toLowerCase().includes(q) ||
          (d.address ?? "").toLowerCase().includes(q)
      );
    }
    return list;
  }, [doctors, activeSpec, search]);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">أطبائي</h1>
        <p className="text-sm text-slate-600 mt-0.5">
          {loading
            ? "جاري التحميل..."
            : activeSpec
            ? `${activeSpec} · ${filtered.length} طبيب`
            : `${doctors.length} طبيب في تخصصاتك`}
        </p>
      </div>

      {/* Specialty filter chips */}
      {mySpecs.length > 1 && (
        <div className="flex flex-wrap gap-2 -mx-1 px-1 overflow-x-auto">
          <button
            onClick={() => setActiveSpec(null)}
            className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold transition whitespace-nowrap border ${
              activeSpec === null
                ? "bg-slate-900 text-white border-slate-900 shadow-sm"
                : "bg-white text-slate-600 border-slate-200 hover:border-slate-300"
            }`}
          >
            الكل
            <span
              className={`text-[10px] tabular-nums ${
                activeSpec === null ? "text-white/70" : "text-slate-400"
              }`}
            >
              {doctors.length}
            </span>
          </button>
          {mySpecs.map((s) => {
            const active = activeSpec === s;
            const count = specCounts.get(s) ?? 0;
            return (
              <button
                key={s}
                onClick={() => setActiveSpec(active ? null : s)}
                className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold transition whitespace-nowrap border ${
                  active
                    ? "bg-sky-500 text-white border-sky-500 shadow-sm"
                    : "bg-white text-slate-600 border-slate-200 hover:border-sky-300"
                }`}
              >
                {s}
                <span
                  className={`text-[10px] tabular-nums ${
                    active ? "text-white/80" : "text-slate-400"
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
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
          placeholder="ابحث بالاسم أو التخصص أو الهاتف..."
          className="w-full ps-9 pe-3 py-2.5 rounded-xl border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-400 transition"
        />
      </div>

      {/* List */}
      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="rounded-2xl bg-white border border-slate-200 p-5">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-full bg-slate-100 animate-pulse" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-40 bg-slate-100 rounded animate-pulse" />
                  <div className="h-3 w-24 bg-slate-100 rounded animate-pulse" />
                  <div className="h-3 w-32 bg-slate-100 rounded animate-pulse" />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl bg-white border border-slate-200 p-12 text-center">
          <div className="w-14 h-14 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 mx-auto mb-4">
            <Icon d={icons.doctors} size={26} />
          </div>
          <div className="text-base font-semibold text-slate-900 mb-1">
            {search ? "لا توجد نتائج" : "لا يوجد أطباء"}
          </div>
          <p className="text-xs text-slate-500 max-w-xs mx-auto">
            {search
              ? "جرّب تعديل البحث أو الفلتر."
              : "تواصل مع الأدمن لإضافة تخصصات لك."}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((d) => {
            const name = doctorDisplayName(d);
            return (
              <Link
                key={d.id}
                href={`/rep/doctors/${d.id}`}
                className="group block rounded-2xl bg-white border border-slate-200 p-5 hover:border-sky-300 hover:shadow-lg hover:shadow-sky-500/5 hover:-translate-y-0.5 transition-all duration-200"
              >
                <div className="flex items-start gap-4">
                  {/* Avatar */}
                  <div className="relative shrink-0">
                    <div
                      className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${specColor(d.specialty)} text-white flex items-center justify-center font-bold text-base shadow-md`}
                    >
                      {initials(name)}
                    </div>
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <h3 className="text-base font-bold text-slate-900 leading-tight truncate group-hover:text-sky-700 transition">
                          {name}
                        </h3>
                        {d.specialty && (
                          <div className="text-xs text-slate-500 mt-1">{d.specialty}</div>
                        )}
                      </div>
                      <span className="text-slate-300 group-hover:text-sky-500 transition rtl:rotate-180 shrink-0 mt-1">
                        <Icon d={icons.chevron} size={20} />
                      </span>
                    </div>

                    {/* Meta */}
                    <div className="mt-3 space-y-1.5">
                      {d.phone && (
                        <div className="flex items-center gap-2 text-xs text-slate-600">
                          <span className="w-5 h-5 rounded-md bg-teal-50 text-teal-600 flex items-center justify-center shrink-0">
                            <Icon d={icons.phone} size={11} />
                          </span>
                          <span dir="ltr" className="tabular-nums font-medium">
                            {d.phone}
                          </span>
                        </div>
                      )}
                      {d.address && (
                        <div className="flex items-start gap-2 text-xs text-slate-600">
                          <span className="w-5 h-5 rounded-md bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0 mt-0.5">
                            <Icon d={icons.pin} size={11} />
                          </span>
                          <span className="line-clamp-1 leading-snug">{d.address}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
'''
doctors_page.parent.mkdir(parents=True, exist_ok=True)
doctors_page.write_text(page, encoding="utf-8")
print("OK - my-doctors page (with filter chips + clickable)")

# ============ 4) Doctor profile page for rep ============
profile_dir = app / "rep" / "doctors" / "[id]"
profile_dir.mkdir(parents=True, exist_ok=True)

profile = r'''"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { Doctor, doctorDisplayName, getDoctor, buildMapsUrl } from "@/lib/api";
import { Icon, icons } from "@/components/ui/Icons";

const DoctorMiniMap = dynamic(
  () => import("@/components/map/DoctorMiniMap").then((m) => m.DoctorMiniMap),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-full flex items-center justify-center bg-slate-100 rounded-2xl">
        <div className="text-xs text-slate-500">...</div>
      </div>
    ),
  }
);

function initials(name: string) {
  const parts = name
    .replace(/^(د\.?|د\/|دكتور|دكتورة|Dr\.?|Doctor)\s*/i, "")
    .split(/\s+/)
    .filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2);
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

export default function RepDoctorProfilePage() {
  const params = useParams<{ id: string }>();
  const id = params?.id;
  const [doctor, setDoctor] = useState<Doctor | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    (async () => {
      try {
        const d = await getDoctor(id);
        setDoctor(d);
      } catch (e: any) {
        setError(e.message || "Failed to load doctor");
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-32 bg-slate-100 rounded animate-pulse" />
        <div className="h-40 bg-slate-100 rounded-2xl animate-pulse" />
        <div className="h-64 bg-slate-100 rounded-2xl animate-pulse" />
      </div>
    );
  }

  if (error || !doctor) {
    return (
      <div className="space-y-4">
        <Link
          href="/rep/my-doctors"
          className="inline-flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900"
        >
          <span className="rtl:rotate-180">
            <Icon d={icons.arrow_left} size={16} />
          </span>
          رجوع
        </Link>
        <div className="rounded-2xl bg-red-50 border border-red-200 px-6 py-8 text-center">
          <div className="text-red-700 font-medium mb-1">تعذّر تحميل بيانات الطبيب</div>
          <p className="text-sm text-red-600">{error}</p>
        </div>
      </div>
    );
  }

  const name = doctorDisplayName(doctor);
  const hasLocation = doctor.latitude != null && doctor.longitude != null;
  const mapsUrl = buildMapsUrl(doctor);

  return (
    <div className="space-y-4 pb-4">
      {/* Back */}
      <Link
        href="/rep/my-doctors"
        className="inline-flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900"
      >
        <span className="rtl:rotate-180">
          <Icon d={icons.arrow_left} size={16} />
        </span>
        رجوع
      </Link>

      {/* Header card */}
      <div className="rounded-2xl bg-gradient-to-br from-slate-900 to-slate-800 text-white p-5 relative overflow-hidden">
        <div className="absolute -top-16 -end-16 w-56 h-56 bg-sky-500/20 rounded-full blur-3xl" />
        <div className="relative flex items-start gap-4">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-sky-500 to-teal-500 flex items-center justify-center text-white font-bold text-xl shrink-0 shadow-lg">
            {initials(name)}
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-xl font-bold leading-tight">{name}</h1>
            <div className="mt-2 flex flex-wrap gap-1.5 text-xs">
              {doctor.specialty && (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-white/10 backdrop-blur border border-white/20">
                  {doctor.specialty}
                </span>
              )}
              {doctor.priority && (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full bg-amber-500/20 border border-amber-400/30 text-amber-200">
                  {doctor.priority}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Contact */}
      <div className="rounded-2xl bg-white border border-slate-200 p-5">
        <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">
          معلومات التواصل
        </h2>
        <div className="space-y-2">
          {doctor.phone && (
            <a
              href={`tel:${doctor.phone}`}
              className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-slate-50 transition group"
            >
              <span className="w-9 h-9 rounded-lg bg-teal-50 text-teal-600 flex items-center justify-center shrink-0 group-hover:bg-teal-500 group-hover:text-white transition">
                <Icon d={icons.phone} size={15} />
              </span>
              <div className="flex-1 min-w-0">
                <div className="text-[10px] text-slate-500">الهاتف</div>
                <div
                  dir="ltr"
                  className="text-sm font-medium text-slate-900 tabular-nums text-start"
                >
                  {doctor.phone}
                </div>
              </div>
            </a>
          )}
          {(doctor.address || doctor.city) && (
            <div className="flex items-start gap-3 p-2.5">
              <span className="w-9 h-9 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
                <Icon d={icons.pin} size={15} />
              </span>
              <div className="flex-1 min-w-0">
                <div className="text-[10px] text-slate-500">العنوان</div>
                <div className="text-sm font-medium text-slate-900 leading-snug">
                  {[doctor.address, doctor.city, doctor.state].filter(Boolean).join("، ")}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Take me there */}
      <a
        href={mapsUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="block rounded-2xl bg-gradient-to-r from-sky-500 to-teal-500 hover:from-sky-600 hover:to-teal-600 text-white p-4 transition shadow-lg shadow-sky-500/20"
      >
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-white/20 backdrop-blur flex items-center justify-center shrink-0">
            <Icon d={icons.navigation} size={20} />
          </div>
          <div className="flex-1">
            <div className="font-semibold">وصّلني بالدكتور</div>
            <div className="text-xs text-white/80 mt-0.5">افتح في خرائط Google</div>
          </div>
          <span className="rtl:rotate-180">
            <Icon d={icons.chevron} size={18} />
          </span>
        </div>
      </a>

      {/* Map */}
      <div className="rounded-2xl bg-white border border-slate-200 overflow-hidden">
        <div className="px-5 py-3 border-b border-slate-200 flex items-center justify-between">
          <h2 className="text-xs font-semibold text-slate-700">الموقع على الخريطة</h2>
          {hasLocation && (
            <span dir="ltr" className="text-[10px] text-slate-400 tabular-nums">
              {doctor.latitude!.toFixed(4)}, {doctor.longitude!.toFixed(4)}
            </span>
          )}
        </div>
        <div className="h-64">
          {hasLocation ? (
            <DoctorMiniMap
              latitude={doctor.latitude!}
              longitude={doctor.longitude!}
              label={name}
            />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center bg-slate-50 text-center px-6">
              <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 mb-3">
                <Icon d={icons.pin} size={22} />
              </div>
              <div className="text-sm font-medium text-slate-700 mb-1">
                لا يوجد إحداثيات محفوظة
              </div>
              <p className="text-xs text-slate-500 max-w-xs">
                زر "وصّلني" سيفتح خرائط Google على العنوان المكتوب.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Notes */}
      {doctor.notes && (
        <div className="rounded-2xl bg-white border border-slate-200 p-5">
          <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">
            ملاحظات
          </h2>
          <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-wrap">
            {doctor.notes}
          </p>
        </div>
      )}
    </div>
  );
}
'''
(profile_dir / "page.tsx").write_text(profile, encoding="utf-8")
print("OK - /rep/doctors/[id]/page.tsx created")
print("Done!")