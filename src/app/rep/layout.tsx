"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { NemoraLogo } from "@/components/brand/NemoraLogo";
import { Icon, icons } from "@/components/ui/Icons";
import { clearToken, getToken, apiFetch } from "@/lib/api";

const PRODUCTS_ICON =
  "M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z";

const SALES_ICON =
  "M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2 8m0 0h14M7 21h10";

const TABS = [
  { href: "/rep",            label: "لوحتي",   icon: icons.dashboard },
  { href: "/rep/nearby",     label: "قريبون",  icon: icons.pin },
  { href: "/rep/my-doctors", label: "أطبائي",  icon: icons.doctors },
  { href: "/rep/sales",      label: "مبيعاتي", icon: SALES_ICON },
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
    if (!token) {
      router.push("/login");
      return;
    }
    try {
      const payload = JSON.parse(atob(token.split(".")[1]));
      if (payload.role === "ADMIN") {
        router.push("/admin");
        return;
      }
      if (payload.role === "MANAGER") {
        router.push("/manager");
        return;
      }
    } catch {
      clearToken();
      router.push("/login");
      return;
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

  if (!ready) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="w-5 h-5 border-2 border-slate-300 border-t-sky-500 rounded-full animate-spin" />
      </div>
    );
  }

  function logout() {
    clearToken();
    router.push("/login");
  }

  const initials = userName
    .split(" ")
    .map((n: string) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

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
              <span className="absolute -bottom-0.5 -end-0.5 w-3 h-3 rounded-full bg-teal-400 border-2 border-slate-900 animate-pulse" />
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

          {/* Company name */}
          {orgName && (
            <div className="flex-1 min-w-0 flex justify-center">
              <div className="relative inline-flex items-center gap-2.5 px-5 py-2 rounded-full bg-gradient-to-r from-sky-500/20 via-teal-500/20 to-sky-500/20 border border-sky-400/30 backdrop-blur-sm overflow-hidden">
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
                <span className="relative w-1.5 h-1.5 rounded-full bg-teal-400 animate-pulse" />
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
      <main className="max-w-3xl mx-auto px-4 py-5">{children}</main>

      {/* Bottom nav */}
      <nav className="fixed bottom-0 inset-x-0 z-50 bg-white border-t border-slate-200 shadow-2xl shadow-slate-900/5">
        <div className="max-w-3xl mx-auto grid grid-cols-6">
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
                  <span className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 rounded-full bg-gradient-to-r from-sky-500 to-teal-500" />
                )}
                <Icon d={tab.icon} size={20} stroke={active ? 2.3 : 1.8} />
                <span
                  className={`text-[9px] ${active ? "font-bold" : "font-medium"}`}
                >
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