"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { NemoraLogo } from "@/components/brand/NemoraLogo";
import { Icon, icons } from "@/components/ui/Icons";
import { LanguageToggle } from "@/components/ui/LanguageToggle";
import { clearToken, getToken, apiFetch } from "@/lib/api";
import { useLanguage } from "@/lib/language-context";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { t, dir } = useLanguage();
  const [ready, setReady] = useState(false);
  const [userName, setUserName] = useState("Admin");
  const [userEmail, setUserEmail] = useState("");
  const [orgName, setOrgName] = useState("");

  useEffect(() => {
    const token = getToken();
    if (!token) { router.push("/login"); return; }

    // Check role from token
    try {
      const payload = JSON.parse(atob(token.split(".")[1]));
      const role = payload.role;
      if (role === "MEDICAL_REP") { router.push("/rep"); return; }
      if (role === "MANAGER") { router.push("/manager"); return; }
    } catch {
      clearToken();
      router.push("/login");
      return;
    }

    (async () => {
      try {
        const me: any = await apiFetch("/api/auth/me");
        setUserName(me.full_name ?? me.email ?? "Admin");
        setUserEmail(me.email ?? "");
        const org: any = await apiFetch("/api/organizations/me").catch(() => null);
        if (org) setOrgName(org.name ?? "");
      } catch {}
      setReady(true);
    })();
  }, [router]);

  if (!ready) return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="flex items-center gap-3 text-slate-500">
        <div className="w-5 h-5 border-2 border-slate-300 border-t-sky-500 rounded-full animate-spin" />
        <span className="text-sm">{t.loading}</span>
      </div>
    </div>
  );

  function logout() { clearToken(); router.push("/login"); }

  const initials = userName.split(" ").map((n: string) => n[0]).slice(0, 2).join("").toUpperCase();

  const nav = [
    { href: "/admin", label: t.dashboard, icon: icons.dashboard },
    { href: "/admin/doctors", label: t.doctors, icon: icons.doctors },
    { href: "/admin/users", label: t.users, icon: icons.users },
    { href: "/admin/map", label: t.liveMap, icon: icons.pin },
  ];

  return (
    <div className="min-h-screen flex bg-slate-50" dir={dir}>
      <aside className="w-64 bg-slate-900 text-slate-300 flex flex-col border-e border-slate-800 shrink-0">
        <div className="h-16 flex items-center gap-2.5 px-5 border-b border-slate-800">
          <NemoraLogo size={26} dark />
          <span className="text-lg font-bold text-white tracking-tight">NEMORA</span>
        </div>

        {orgName && (
          <div className="px-5 py-4 border-b border-slate-800">
            <div className="text-[10px] uppercase tracking-wider text-slate-500 mb-1">{t.organization}</div>
            <div className="text-sm font-medium text-white truncate">{orgName}</div>
          </div>
        )}

        <nav className="flex-1 p-3 space-y-0.5">
          {nav.map((n) => {
            const active = n.href === "/admin" ? pathname === "/admin" : pathname.startsWith(n.href);
            return (
              <Link key={n.href} href={n.href}
                className={`group flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition ${
                  active
                    ? "bg-gradient-to-r from-sky-500/20 to-teal-500/10 text-white border border-sky-500/30"
                    : "text-slate-400 hover:bg-slate-800/60 hover:text-white border border-transparent"
                }`}>
                <span className={active ? "text-sky-400" : "text-slate-500 group-hover:text-slate-300"}>
                  <Icon d={n.icon} size={18} />
                </span>
                <span>{n.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="p-3 border-t border-slate-800">
          <div className="flex items-center gap-3 px-3 py-2 mb-2">
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-sky-500 to-teal-500 flex items-center justify-center text-white text-xs font-bold shrink-0">
              {initials}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium text-white truncate">{userName}</div>
              <div className="text-[11px] text-slate-500 truncate">{userEmail}</div>
            </div>
          </div>
          <button onClick={logout}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-slate-400 hover:bg-slate-800/60 hover:text-white transition">
            <Icon d={icons.logout} size={16} />
            <span>{t.signOut}</span>
          </button>
        </div>
      </aside>

      <main className="flex-1 flex flex-col overflow-hidden min-w-0">
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-6 lg:px-8 shrink-0">
          <div className="flex items-center gap-2 text-sm">
            <span className="text-slate-400">{t.workspace}</span>
            <span className="text-slate-300">/</span>
            <span className="font-medium text-slate-700">{t.admin}</span>
          </div>
          <div className="flex items-center gap-2">
            <LanguageToggle />
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-sky-500 to-teal-500 flex items-center justify-center text-white text-xs font-bold">
              {initials}
            </div>
          </div>
        </header>
        <div className="flex-1 overflow-y-auto p-6 lg:p-8">{children}</div>
      </main>
    </div>
  );
}