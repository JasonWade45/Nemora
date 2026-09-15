"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { clearToken, getToken } from "@/lib/api";

export default function ManagerLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const token = getToken();
    if (!token) { router.push("/login"); return; }
    try {
      const payload = JSON.parse(atob(token.split(".")[1]));
      const role = payload.role;
      if (role === "MEDICAL_REP") { router.push("/rep"); return; }
      if (role === "ADMIN") { router.push("/admin"); return; }
    } catch {
      clearToken(); router.push("/login"); return;
    }
    setReady(true);
  }, [router]);

  if (!ready) return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="w-5 h-5 border-2 border-slate-300 border-t-sky-500 rounded-full animate-spin" />
    </div>
  );

  return <div className="min-h-screen bg-slate-50" dir="rtl">{children}</div>;
}