"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  OrganizationSummary,
  PlatformStats,
  clearToken,
  getSuperStats,
  getToken,
  listOrganizations,
} from "@/lib/api";
import { Icon, icons } from "@/components/ui/Icons";

export default function SuperAdminPage() {
  const router = useRouter();
  const [stats, setStats] = useState<PlatformStats | null>(null);
  const [orgs, setOrgs] = useState<OrganizationSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const token = getToken();
    if (!token) {
      router.push("/login");
      return;
    }

    (async () => {
      try {
        const [s, o] = await Promise.all([
          getSuperStats(),
          listOrganizations(),
        ]);
        setStats(s);
        setOrgs(o);
      } catch (e: any) {
        setError(e?.message || "Access denied");
        setTimeout(() => router.push("/admin"), 2000);
      } finally {
        setLoading(false);
      }
    })();
  }, [router]);

  function logout() {
    clearToken();
    router.push("/login");
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950">
        <div className="w-6 h-6 border-2 border-slate-300 border-t-sky-500 rounded-full animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950">
        <div className="text-center">
          <div className="text-red-600 font-semibold mb-2">غير مصرح</div>
          <div className="text-sm text-slate-500">{error}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 pb-10" dir="rtl">
      {/* Header */}
      <header className="bg-gradient-to-r from-slate-900 to-slate-800 text-white">
        <div className="max-w-7xl mx-auto px-6 py-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-sky-400 to-teal-400 flex items-center justify-center font-bold text-lg">
              ★
            </div>
            <div>
              <div className="text-base font-bold tracking-tight">NEMORA Super Admin</div>
              <div className="text-[11px] text-slate-400">لوحة تحكم المنصة</div>
            </div>
          </div>
          <button
            onClick={logout}
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-xs font-medium transition"
          >
            <Icon d={icons.close} size={14} />
            تسجيل خروج
          </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8 space-y-6">
        {/* Stats */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: "الشركات", value: stats.organizations, color: "from-sky-500 to-cyan-500", icon: icons.users },
              { label: "المستخدمين", value: stats.users, color: "from-teal-500 to-emerald-500", icon: icons.users },
              { label: "الأطباء", value: stats.doctors, color: "from-indigo-500 to-violet-500", icon: icons.doctors },
              { label: "الزيارات", value: stats.visits, color: "from-amber-500 to-orange-500", icon: icons.visits },
            ].map((s) => (
              <div key={s.label} className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5">
                <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${s.color} text-white flex items-center justify-center mb-3`}>
                  <Icon d={s.icon} size={20} />
                </div>
                <div className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">{s.label}</div>
                <div className="text-3xl font-bold text-slate-900 dark:text-white tabular-nums">{s.value}</div>
              </div>
            ))}
          </div>
        )}

        {/* Organizations */}
        <div>
          <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-4">
            الشركات المسجلة
          </h2>

          {orgs.length === 0 ? (
            <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-10 text-center">
              <div className="text-sm text-slate-500">لا توجد شركات بعد</div>
            </div>
          ) : (
            <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
                  <tr>
                    <th className="text-start px-4 py-3 text-xs font-semibold text-slate-600 dark:text-slate-300">الشركة</th>
                    <th className="text-start px-4 py-3 text-xs font-semibold text-slate-600 dark:text-slate-300">Slug</th>
                    <th className="text-start px-4 py-3 text-xs font-semibold text-slate-600 dark:text-slate-300">المستخدمين</th>
                    <th className="text-start px-4 py-3 text-xs font-semibold text-slate-600 dark:text-slate-300">الأطباء</th>
                    <th className="text-start px-4 py-3 text-xs font-semibold text-slate-600 dark:text-slate-300">الزيارات</th>
                    <th className="text-start px-4 py-3 text-xs font-semibold text-slate-600 dark:text-slate-300">التاريخ</th>
                  </tr>
                </thead>
                <tbody>
                  {orgs.map((o) => (
                    <tr key={o.id} className="border-b border-slate-100 dark:border-slate-800 last:border-0 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition">
                      <td className="px-4 py-3 font-medium text-slate-900 dark:text-white">{o.name}</td>
                      <td className="px-4 py-3 text-slate-600 dark:text-slate-400 font-mono text-xs" dir="ltr">{o.slug}</td>
                      <td className="px-4 py-3 tabular-nums text-slate-700 dark:text-slate-300">{o.users_count}</td>
                      <td className="px-4 py-3 tabular-nums text-slate-700 dark:text-slate-300">{o.doctors_count}</td>
                      <td className="px-4 py-3 tabular-nums text-slate-700 dark:text-slate-300">{o.visits_count}</td>
                      <td className="px-4 py-3 text-xs text-slate-500 dark:text-slate-400">
                        {new Date(o.created_at).toLocaleDateString("ar-EG")}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="text-center pt-4">
          <Link href="/admin" className="text-xs text-slate-500 hover:text-slate-700">
            ← الدخول إلى لوحة الأدمن
          </Link>
        </div>
      </main>
    </div>
  );
}