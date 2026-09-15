import pathlib

backend = pathlib.Path(r"C:\Users\ATG\Documents\Default Project\pharma-crm\backend")
frontend = pathlib.Path(r"C:\Users\ATG\Documents\Default Project\pharma-crm\src")

# ============ 1) Fix list_doctors in backend ============
routes_file = backend / "app" / "modules" / "doctors" / "routes.py"
content = routes_file.read_text(encoding="utf-8")

old_block = """    target_rep_id = assigned_rep_id
    if current_user.role.value == Role.MEDICAL_REP.value:
        target_rep_id = current_user.id

    if target_rep_id:
        query = query.join(DoctorAssignment, DoctorAssignment.doctor_id == Doctor.id).filter(
            DoctorAssignment.organization_id == current_user.organization_id,
            DoctorAssignment.medical_rep_id == target_rep_id,
        )
"""

new_block = """    # Medical reps:
    # - If they have assigned specialties, filter doctors by those specialties.
    # - Otherwise fall back to explicit assignments (if any).
    if current_user.role.value == Role.MEDICAL_REP.value:
        rep_specialties = _safe_load_specialties(current_user.specialties_json)
        if rep_specialties:
            query = query.filter(Doctor.specialty.in_(rep_specialties))
        else:
            query = query.join(DoctorAssignment, DoctorAssignment.doctor_id == Doctor.id).filter(
                DoctorAssignment.organization_id == current_user.organization_id,
                DoctorAssignment.medical_rep_id == current_user.id,
            )

    elif assigned_rep_id:
        query = query.join(DoctorAssignment, DoctorAssignment.doctor_id == Doctor.id).filter(
            DoctorAssignment.organization_id == current_user.organization_id,
            DoctorAssignment.medical_rep_id == assigned_rep_id,
        )
"""

if old_block in content:
    content = content.replace(old_block, new_block)
    routes_file.write_text(content, encoding="utf-8")
    print("OK - doctors/routes.py updated")
else:
    print("WARN - old block not found in doctors/routes.py (file may differ)")

# ============ 2) Update rep layout to show company name ============
layout_file = frontend / "app" / "rep" / "layout.tsx"
layout = r'''"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { NemoraLogo } from "@/components/brand/NemoraLogo";
import { Icon, icons } from "@/components/ui/Icons";
import { clearToken, getToken, apiFetch } from "@/lib/api";

const TABS = [
  { href: "/rep",          label: "لوحتي",   icon: icons.dashboard },
  { href: "/rep/nearby",   label: "قريبون",  icon: icons.pin },
  { href: "/rep/my-doctors", label: "أطبائي", icon: icons.doctors },
  { href: "/rep/visits",   label: "زياراتي", icon: icons.visits },
  { href: "/rep/profile",  label: "حسابي",   icon: icons.users },
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
    <div className="min-h-screen bg-slate-50 pb-20" dir="rtl">
      {/* Top header */}
      <header className="sticky top-0 z-40 bg-white border-b border-slate-200 shadow-sm">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
          <Link href="/rep" className="flex items-center gap-2 shrink-0">
            <NemoraLogo size={26} />
            <span className="text-base font-bold tracking-tight text-slate-900">NEMORA</span>
          </Link>

          {orgName && (
            <div className="flex-1 min-w-0 text-center">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-gradient-to-r from-sky-50 to-teal-50 border border-sky-100">
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-sky-600">
                  <path d="M12 22s-8-7.58-8-13a8 8 0 1 1 16 0c0 5.42-8 13-8 13z" />
                  <circle cx="12" cy="9" r="2" />
                </svg>
                <span className="text-[11px] font-semibold text-sky-800 truncate">{orgName}</span>
              </div>
            </div>
          )}

          <button onClick={logout} className="flex items-center gap-2 shrink-0 group">
            <div className="text-end hidden sm:block">
              <div className="text-xs font-medium text-slate-900 leading-tight">{userName}</div>
              <div className="text-[10px] text-slate-500 leading-tight">{userEmail}</div>
            </div>
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-sky-500 to-teal-500 flex items-center justify-center text-white text-[11px] font-bold shadow-sm group-hover:shadow-md transition">
              {initials}
            </div>
          </button>
        </div>
      </header>

      {/* Page content */}
      <main className="max-w-2xl mx-auto px-4 py-5">
        {children}
      </main>

      {/* Bottom nav */}
      <nav className="fixed bottom-0 inset-x-0 z-50 bg-white border-t border-slate-200 shadow-lg">
        <div className="max-w-2xl mx-auto grid grid-cols-5">
          {TABS.map((tab) => {
            const active =
              tab.href === "/rep"
                ? pathname === "/rep"
                : pathname.startsWith(tab.href);
            return (
              <Link
                key={tab.href}
                href={tab.href}
                className={`flex flex-col items-center gap-0.5 py-2.5 transition ${
                  active ? "text-sky-600" : "text-slate-400"
                }`}
              >
                <Icon d={tab.icon} size={20} stroke={active ? 2.2 : 1.8} />
                <span className="text-[10px] font-medium">{tab.label}</span>
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
print("OK - rep/layout.tsx updated with company name")

# ============ 3) Simplify my-doctors page (rely on backend filtering) ============
doctors_page = frontend / "app" / "rep" / "my-doctors" / "page.tsx"
page = r'''"use client";

import { useEffect, useMemo, useState } from "react";
import { Doctor, apiFetch, buildMapsUrl, doctorDisplayName, getAllDoctors } from "@/lib/api";
import { Icon, icons } from "@/components/ui/Icons";

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

  useEffect(() => {
    (async () => {
      try {
        // Try to load specialties (may be missing from /me)
        const me: any = await apiFetch("/api/auth/me").catch(() => null);
        setMySpecs(me?.specialties ?? []);

        // Load doctors (backend already filters by specialty for reps)
        const all = await getAllDoctors();
        setDoctors(all);
      } catch {}
      setLoading(false);
    })();
  }, []);

  const filtered = useMemo(() => {
    if (!search.trim()) return doctors;
    const q = search.trim().toLowerCase();
    return doctors.filter(
      (d) =>
        doctorDisplayName(d).toLowerCase().includes(q) ||
        (d.specialty ?? "").toLowerCase().includes(q) ||
        (d.phone ?? "").toLowerCase().includes(q) ||
        (d.address ?? "").toLowerCase().includes(q)
    );
  }, [doctors, search]);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">أطبائي</h1>
        <p className="text-sm text-slate-600 mt-0.5">
          {loading
            ? "جاري التحميل..."
            : mySpecs.length > 0
            ? `${mySpecs.join(" · ")} · ${filtered.length} طبيب`
            : `كل الأطباء · ${filtered.length}`}
        </p>
      </div>

      {mySpecs.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {mySpecs.map((s) => (
            <span
              key={s}
              className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-medium bg-teal-50 text-teal-700 border border-teal-100"
            >
              {s}
            </span>
          ))}
        </div>
      )}

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

      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="rounded-2xl bg-white border border-slate-200 p-4">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-full bg-slate-100 animate-pulse" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-40 bg-slate-100 rounded animate-pulse" />
                  <div className="h-3 w-24 bg-slate-100 rounded animate-pulse" />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl bg-white border border-slate-200 p-10 text-center">
          <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 mx-auto mb-3">
            <Icon d={icons.doctors} size={22} />
          </div>
          <div className="text-sm font-medium text-slate-900 mb-1">
            {search ? "لا توجد نتائج" : "لا يوجد أطباء"}
          </div>
          <p className="text-xs text-slate-500">
            {search ? "جرّب تعديل البحث" : "تواصل مع الأدمن لإضافة تخصصات لك"}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((d) => {
            const name = doctorDisplayName(d);
            const mapsUrl = buildMapsUrl(d);
            return (
              <div key={d.id} className="rounded-2xl bg-white border border-slate-200 p-4">
                <div className="flex items-start gap-3">
                  <div className="w-11 h-11 rounded-full bg-gradient-to-br from-sky-500 to-teal-500 text-white flex items-center justify-center text-xs font-bold shrink-0">
                    {initials(name)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold text-slate-900 truncate leading-tight">
                      {name}
                    </div>
                    {d.specialty && (
                      <div className="text-[11px] text-slate-500 mt-0.5">{d.specialty}</div>
                    )}
                    <div className="mt-2 space-y-1 text-xs text-slate-600">
                      {d.phone && (
                        <a href={`tel:${d.phone}`} className="flex items-center gap-1.5 hover:text-sky-600">
                          <Icon d={icons.phone} size={12} />
                          <span dir="ltr" className="tabular-nums">{d.phone}</span>
                        </a>
                      )}
                      {d.address && (
                        <div className="flex items-start gap-1.5">
                          <span className="text-slate-400 mt-0.5 shrink-0"><Icon d={icons.pin} size={12} /></span>
                          <span className="line-clamp-2 leading-snug">{d.address}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex gap-2 mt-3">
                  <a
                    href={mapsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg bg-gradient-to-r from-sky-500 to-teal-500 text-white text-xs font-medium hover:from-sky-600 hover:to-teal-600 transition"
                  >
                    <Icon d={icons.navigation} size={13} />
                    وصّلني
                  </a>
                  {d.phone && (
                    <a
                      href={`tel:${d.phone}`}
                      className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg bg-white border border-slate-200 text-slate-700 text-xs font-medium hover:bg-slate-50 transition"
                    >
                      <Icon d={icons.phone} size={13} />
                      اتصال
                    </a>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
'''
doctors_page.write_text(page, encoding="utf-8")
print("OK - my-doctors page rewritten")
print("Done!")