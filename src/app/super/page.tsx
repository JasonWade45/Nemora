"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  AuditLogEntry,
  OrganizationDetail,
  OrganizationSummary,
  PlatformAnalytics,
  PlatformStats,
  PlatformDoctor,
  ImportResult,
  PlatformDoctorsStats,
  activateOrganization,
  broadcastNotification,
  clearToken,
  deletePlatformDoctor,
  getOrganization,
  getPlatformAnalytics,
  getPlatformDoctorsStats,
  getSuperStats,
  getSystemHealth,
  getToken,
  impersonateUser,
  importPlatformDoctors,
  listAuditLogs,
  listOrganizations,
  listPlatformDoctors,
  resetUserPassword,
  superDeleteUser,
  superUpdateUser,
  suspendOrganization,
  updateOrganization,
} from "@/lib/api";
import { Icon, icons } from "@/components/ui/Icons";

type Tab = "overview" | "organizations" | "audit" | "broadcast" | "analytics" | "import-doctors";

const TABS: { key: Tab; label: string; icon: string }[] = [
  { key: "overview", label: "نظرة عامة", icon: icons.dashboard },
  { key: "organizations", label: "الشركات", icon: icons.users },
  { key: "import-doctors", label: "دكاترة المنصة", icon: icons.doctors },
  { key: "analytics", label: "التحليلات", icon: icons.target },
  { key: "audit", label: "السجلات", icon: icons.reports },
  { key: "broadcast", label: "إشعار عام", icon: icons.visits },
];

export default function SuperAdminPage() {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("overview");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [stats, setStats] = useState<PlatformStats | null>(null);
  const [orgs, setOrgs] = useState<OrganizationSummary[]>([]);

  async function loadStats() {
    const s = await getSuperStats();
    setStats(s);
  }

  async function loadOrgs() {
    const o = await listOrganizations();
    setOrgs(o);
  }

  useEffect(() => {
    const token = getToken();
    if (!token) { router.push("/login"); return; }
    (async () => {
      try {
        await Promise.all([loadStats(), loadOrgs()]);
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
      <header className="bg-gradient-to-r from-slate-900 to-slate-800 text-white sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
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
            تسجيل خروج
          </button>
        </div>

        {/* Tabs */}
        <div className="max-w-7xl mx-auto px-6 flex gap-1 overflow-x-auto">
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`px-4 py-2 text-xs font-semibold transition border-b-2 whitespace-nowrap ${
                tab === t.key
                  ? "text-sky-400 border-sky-400"
                  : "text-slate-400 border-transparent hover:text-white"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8">
        {tab === "overview" && <OverviewTab stats={stats} orgs={orgs} />}
        {tab === "organizations" && <OrganizationsTab orgs={orgs} reload={loadOrgs} />}
        {tab === "import-doctors" && <ImportDoctorsTab />}
        {tab === "analytics" && <AnalyticsTab />}
        {tab === "audit" && <AuditTab />}
        {tab === "broadcast" && <BroadcastTab />}
      </main>
    </div>
  );
}

// ============ Overview Tab ============

function OverviewTab({ stats, orgs }: { stats: PlatformStats | null; orgs: OrganizationSummary[] }) {
  if (!stats) return null;

  const cards = [
    { label: "الشركات", value: stats.organizations, grad: "from-sky-500 to-cyan-500" },
    { label: "المستخدمين", value: stats.users, grad: "from-teal-500 to-emerald-500" },
    { label: "الأطباء", value: stats.doctors, grad: "from-indigo-500 to-violet-500" },
    { label: "الزيارات", value: stats.visits, grad: "from-amber-500 to-orange-500" },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {cards.map((c) => (
          <div key={c.label} className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5">
            <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${c.grad} text-white flex items-center justify-center mb-3`}>
              <Icon d={icons.dashboard} size={20} />
            </div>
            <div className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">{c.label}</div>
            <div className="text-3xl font-bold text-slate-900 dark:text-white tabular-nums">{c.value}</div>
          </div>
        ))}
      </div>

      <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6">
        <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-4">آخر الشركات المسجلة</h3>
        <div className="space-y-2">
          {orgs.slice(0, 5).map((o) => (
            <div key={o.id} className="flex items-center justify-between py-2 border-b border-slate-100 dark:border-slate-800 last:border-0">
              <div>
                <div className="text-sm font-semibold text-slate-900 dark:text-white">{o.name}</div>
                <div className="text-[11px] text-slate-500 font-mono" dir="ltr">{o.slug}</div>
              </div>
              <div className="text-xs text-slate-500">
                {new Date(o.created_at).toLocaleDateString("ar-EG")}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ============ Organizations Tab ============

function OrganizationsTab({ orgs, reload }: { orgs: OrganizationSummary[]; reload: () => Promise<void> }) {
  const [selected, setSelected] = useState<string | null>(null);

  if (selected) {
    return (
      <OrgDetail id={selected} onClose={() => { setSelected(null); reload(); }} />
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-slate-900 dark:text-white">
          الشركات ({orgs.length})
        </h2>
        <button
          onClick={() => reload()}
          className="text-xs font-medium text-sky-600 hover:text-sky-800"
        >
          ⟳ تحديث
        </button>
      </div>

      <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
            <tr>
              <th className="text-start px-4 py-3 text-xs font-semibold text-slate-600 dark:text-slate-300">الشركة</th>
              <th className="text-start px-4 py-3 text-xs font-semibold text-slate-600 dark:text-slate-300">الخطة</th>
              <th className="text-start px-4 py-3 text-xs font-semibold text-slate-600 dark:text-slate-300">الحالة</th>
              <th className="text-start px-4 py-3 text-xs font-semibold text-slate-600 dark:text-slate-300">مستخدمين</th>
              <th className="text-start px-4 py-3 text-xs font-semibold text-slate-600 dark:text-slate-300">زيارات</th>
              <th className="text-start px-4 py-3 text-xs font-semibold text-slate-600 dark:text-slate-300">التاريخ</th>
              <th className="text-start px-4 py-3 text-xs font-semibold text-slate-600 dark:text-slate-300"></th>
            </tr>
          </thead>
          <tbody>
            {orgs.map((o) => (
              <tr
                key={o.id}
                className="border-b border-slate-100 dark:border-slate-800 last:border-0 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition"
              >
                <td className="px-4 py-3">
                  <div className="font-medium text-slate-900 dark:text-white">{o.name}</div>
                  <div className="text-[11px] text-slate-500 font-mono" dir="ltr">{o.slug}</div>
                </td>
                <td className="px-4 py-3">
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                    o.plan === "enterprise" ? "bg-purple-100 text-purple-700" :
                    o.plan === "professional" ? "bg-sky-100 text-sky-700" :
                    "bg-slate-100 text-slate-600"
                  }`}>
                    {o.plan}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                    o.status === "active" ? "bg-teal-100 text-teal-700" : "bg-red-100 text-red-700"
                  }`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${o.status === "active" ? "bg-teal-500" : "bg-red-500"}`} />
                    {o.status === "active" ? "نشطة" : "معلقة"}
                  </span>
                </td>
                <td className="px-4 py-3 tabular-nums text-slate-700 dark:text-slate-300">{o.users_count}</td>
                <td className="px-4 py-3 tabular-nums text-slate-700 dark:text-slate-300">{o.visits_count}</td>
                <td className="px-4 py-3 text-xs text-slate-500">
                  {new Date(o.created_at).toLocaleDateString("ar-EG")}
                </td>
                <td className="px-4 py-3">
                  <button
                    onClick={() => setSelected(o.id)}
                    className="text-xs font-medium text-sky-600 hover:text-sky-800 px-2 py-1 rounded hover:bg-sky-50"
                  >
                    إدارة →
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ============ Org Detail ============

function OrgDetail({ id, onClose }: { id: string; onClose: () => void }) {
  const [org, setOrg] = useState<OrganizationDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    try {
      const o = await getOrganization(id);
      setOrg(o);
    } catch {}
    setLoading(false);
  }

  useEffect(() => { load(); }, [id]);

  function flash(text: string) {
    setMsg(text);
    setTimeout(() => setMsg(null), 2500);
  }

  async function toggleSuspend() {
    if (!org) return;
    try {
      if (org.status === "active") {
        await suspendOrganization(org.id);
        flash("تم تعليق الشركة");
      } else {
        await activateOrganization(org.id);
        flash("تم تفعيل الشركة");
      }
      await load();
    } catch (e: any) { flash(e.message); }
  }

  async function changePlan(plan: string) {
    if (!org) return;
    try {
      await updateOrganization(org.id, { plan: plan as any });
      flash("تم تغيير الخطة");
      await load();
    } catch (e: any) { flash(e.message); }
  }

  async function resetPw(userId: string) {
    const pw = prompt("كلمة السر الجديدة (8 أحرف على الأقل):");
    if (!pw || pw.length < 8) return;
    try {
      await resetUserPassword(userId, pw);
      flash("تم تغيير كلمة السر");
    } catch (e: any) { flash(e.message); }
  }

  async function toggleUserActive(userId: string, current: boolean) {
    try {
      await superUpdateUser(userId, { is_active: !current });
      flash(current ? "تم إيقاف المستخدم" : "تم تفعيل المستخدم");
      await load();
    } catch (e: any) { flash(e.message); }
  }

  async function deleteUser(userId: string) {
    if (!confirm("متأكد من حذف المستخدم؟")) return;
    try {
      await superDeleteUser(userId);
      flash("تم حذف المستخدم");
      await load();
    } catch (e: any) { flash(e.message); }
  }

  async function impersonate(userId: string, email: string) {
    if (!confirm(`الدخول كـ ${email}؟`)) return;
    try {
      const data = await impersonateUser(userId);
      localStorage.setItem("nemora_token", data.access_token);
      window.location.href = "/admin";
    } catch (e: any) { flash(e.message); }
  }

  if (loading) {
    return <div className="text-center py-10"><div className="w-6 h-6 border-2 border-slate-300 border-t-sky-500 rounded-full animate-spin mx-auto" /></div>;
  }

  if (!org) {
    return <div className="text-center py-10 text-slate-500">الشركة غير موجودة</div>;
  }

  return (
    <div className="space-y-4">
      {msg && (
        <div className="fixed top-20 start-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-xl bg-slate-900 text-white text-xs font-medium shadow-lg">
          {msg}
        </div>
      )}

      <button onClick={onClose} className="text-xs font-medium text-slate-500 hover:text-slate-800">
        ← رجوع للقائمة
      </button>

      {/* Header */}
      <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">{org.name}</h2>
            <div className="text-xs text-slate-500 font-mono mt-1" dir="ltr">{org.slug}</div>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={toggleSuspend}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                org.status === "active"
                  ? "bg-red-50 text-red-700 hover:bg-red-100 border border-red-200"
                  : "bg-teal-50 text-teal-700 hover:bg-teal-100 border border-teal-200"
              }`}
            >
              {org.status === "active" ? "تعليق الشركة" : "تفعيل الشركة"}
            </button>
          </div>
        </div>

        {/* Plan selector */}
        <div className="mt-4 flex flex-wrap gap-2">
          {["basic", "professional", "enterprise"].map((p) => (
            <button
              key={p}
              onClick={() => changePlan(p)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition border ${
                org.plan === p
                  ? "bg-sky-500 text-white border-sky-500"
                  : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-sky-300"
              }`}
            >
              {p}
            </button>
          ))}
        </div>
      </div>

      {/* Users */}
      <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 overflow-hidden">
        <div className="px-5 py-3 border-b border-slate-200 dark:border-slate-800">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white">
            المستخدمين ({org.users.length})
          </h3>
        </div>
        <table className="w-full text-sm">
          <thead className="bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
            <tr>
              <th className="text-start px-4 py-2.5 text-xs font-semibold text-slate-600 dark:text-slate-300">الاسم</th>
              <th className="text-start px-4 py-2.5 text-xs font-semibold text-slate-600 dark:text-slate-300">البريد</th>
              <th className="text-start px-4 py-2.5 text-xs font-semibold text-slate-600 dark:text-slate-300">الدور</th>
              <th className="text-start px-4 py-2.5 text-xs font-semibold text-slate-600 dark:text-slate-300">الحالة</th>
              <th className="text-start px-4 py-2.5 text-xs font-semibold text-slate-600 dark:text-slate-300"></th>
            </tr>
          </thead>
          <tbody>
            {org.users.map((u) => (
              <tr key={u.id} className="border-b border-slate-100 dark:border-slate-800 last:border-0">
                <td className="px-4 py-2.5 font-medium text-slate-900 dark:text-white">
                  {u.full_name}
                  {u.is_super_admin && (
                    <span className="ms-2 inline-flex px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-100 text-amber-700">★ SUPER</span>
                  )}
                </td>
                <td className="px-4 py-2.5 text-xs text-slate-500" dir="ltr">{u.email}</td>
                <td className="px-4 py-2.5">
                  <span className="inline-flex px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-700">
                    {u.role}
                  </span>
                </td>
                <td className="px-4 py-2.5">
                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                    u.is_active ? "bg-teal-100 text-teal-700" : "bg-red-100 text-red-700"
                  }`}>
                    {u.is_active ? "نشط" : "موقوف"}
                  </span>
                </td>
                <td className="px-4 py-2.5">
                  <div className="flex gap-1 justify-end">
                    <button
                      onClick={() => impersonate(u.id, u.email)}
                      className="text-[10px] font-medium px-2 py-1 rounded bg-purple-50 text-purple-700 hover:bg-purple-100"
                      title="الدخول كـ"
                    >
                      دخول
                    </button>
                    <button
                      onClick={() => resetPw(u.id)}
                      className="text-[10px] font-medium px-2 py-1 rounded bg-sky-50 text-sky-700 hover:bg-sky-100"
                    >
                      كلمة سر
                    </button>
                    <button
                      onClick={() => toggleUserActive(u.id, u.is_active)}
                      className={`text-[10px] font-medium px-2 py-1 rounded ${
                        u.is_active ? "bg-amber-50 text-amber-700 hover:bg-amber-100" : "bg-teal-50 text-teal-700 hover:bg-teal-100"
                      }`}
                    >
                      {u.is_active ? "إيقاف" : "تفعيل"}
                    </button>
                    <button
                      onClick={() => deleteUser(u.id)}
                      className="text-[10px] font-medium px-2 py-1 rounded bg-red-50 text-red-700 hover:bg-red-100"
                    >
                      حذف
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ============ Analytics Tab ============

function AnalyticsTab() {
  const [data, setData] = useState<PlatformAnalytics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getPlatformAnalytics().then(setData).catch(() => {}).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="text-center py-10"><div className="w-6 h-6 border-2 border-slate-300 border-t-sky-500 rounded-full animate-spin mx-auto" /></div>;
  if (!data) return <div className="text-center py-10 text-slate-500">فشل التحميل</div>;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "شركات جديدة (30 يوم)", value: data.new_orgs_30d },
          { label: "شركات جديدة (7 أيام)", value: data.new_orgs_7d },
          { label: "مستخدمين جدد (30 يوم)", value: data.new_users_30d },
          { label: "زيارات (30 يوم)", value: data.visits_30d },
        ].map((c) => (
          <div key={c.label} className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5">
            <div className="text-xs font-medium text-slate-500 mb-2">{c.label}</div>
            <div className="text-3xl font-bold text-slate-900 dark:text-white tabular-nums">{c.value}</div>
          </div>
        ))}
      </div>

      <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6">
        <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-4">أنشط الشركات</h3>
        <div className="space-y-3">
          {data.top_organizations.map((o, i) => (
            <div key={o.id} className="flex items-center gap-3">
              <span className="w-7 h-7 rounded-lg bg-slate-100 text-slate-700 flex items-center justify-center text-xs font-bold">
                {i + 1}
              </span>
              <div className="flex-1">
                <div className="text-sm font-semibold text-slate-900 dark:text-white">{o.name}</div>
                <div className="text-[11px] text-slate-500 font-mono" dir="ltr">{o.slug}</div>
              </div>
              <span className="text-lg font-bold text-sky-600 tabular-nums">{o.visits}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ============ Audit Tab ============

function AuditTab() {
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("");

  async function load() {
    setLoading(true);
    try {
      const data = await listAuditLogs({ limit: 200, action_filter: filter || undefined });
      setLogs(data);
    } catch {}
    setLoading(false);
  }

  useEffect(() => { load(); }, [filter]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <input
          type="text"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          placeholder="ابحث في الأحداث (مثال: VISIT، SIGNUP، LOGIN)"
          className="flex-1 px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/20"
        />
        <button onClick={load} className="px-4 py-2 rounded-xl bg-slate-900 text-white text-xs font-semibold">
          بحث
        </button>
      </div>

      {loading ? (
        <div className="text-center py-10"><div className="w-6 h-6 border-2 border-slate-300 border-t-sky-500 rounded-full animate-spin mx-auto" /></div>
      ) : (
        <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
              <tr>
                <th className="text-start px-4 py-2.5 text-xs font-semibold text-slate-600 dark:text-slate-300">الحدث</th>
                <th className="text-start px-4 py-2.5 text-xs font-semibold text-slate-600 dark:text-slate-300">الكيان</th>
                <th className="text-start px-4 py-2.5 text-xs font-semibold text-slate-600 dark:text-slate-300">الفاعل</th>
                <th className="text-start px-4 py-2.5 text-xs font-semibold text-slate-600 dark:text-slate-300">التاريخ</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => (
                <tr key={log.id} className="border-b border-slate-100 dark:border-slate-800 last:border-0">
                  <td className="px-4 py-2.5 text-xs font-medium text-slate-900 dark:text-white">{log.action}</td>
                  <td className="px-4 py-2.5 text-xs text-slate-500">{log.entity}</td>
                  <td className="px-4 py-2.5 text-xs text-slate-500">
                    {log.actor_name}
                    {log.actor_email && <span className="block text-[10px] text-slate-400" dir="ltr">{log.actor_email}</span>}
                  </td>
                  <td className="px-4 py-2.5 text-xs text-slate-500">
                    {log.created_at ? new Date(log.created_at).toLocaleString("ar-EG") : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ============ Broadcast Tab ============

function BroadcastTab() {
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [type, setType] = useState("SYSTEM");
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  async function send() {
    const trimmedTitle = title.trim();
    const trimmedMessage = message.trim();

    // Frontend validation (Arabic messages)
    if (trimmedTitle.length === 0) {
      setResult("❌ العنوان مطلوب");
      return;
    }
    if (trimmedTitle.length < 2) {
      setResult("❌ العنوان يجب أن يكون حرفين على الأقل");
      return;
    }
    if (trimmedMessage.length === 0) {
      setResult("❌ الرسالة مطلوبة");
      return;
    }
    if (trimmedMessage.length < 2) {
      setResult("❌ الرسالة يجب أن تكون حرفين على الأقل");
      return;
    }

    setSending(true);
    setResult(null);
    try {
      const res = await broadcastNotification({
        title: trimmedTitle,
        message: trimmedMessage,
        type,
      });
      setResult(`✅ تم الإرسال إلى ${res.sent_to} مستخدم`);
      setTitle("");
      setMessage("");
    } catch (err: any) {
      // Parse FastAPI validation errors and show Arabic message
      let msg = "فشل الإرسال. حاول مرة أخرى.";
      try {
        const raw = err?.message || "";
        const parsed = JSON.parse(raw);
        if (parsed?.detail) {
          if (typeof parsed.detail === "string") {
            msg = parsed.detail;
          } else if (Array.isArray(parsed.detail) && parsed.detail[0]?.msg) {
            msg = parsed.detail[0].msg;
          }
        }
      } catch {
        // not JSON — keep default
      }
      setResult(`❌ ${msg}`);
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6">
        <h3 className="text-base font-bold text-slate-900 dark:text-white mb-1">إشعار عام</h3>
        <p className="text-xs text-slate-500 mb-5">
          سيصل الإشعار لكل المستخدمين النشطين في المنصة.
        </p>

        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">النوع</label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-sm"
            >
              <option value="SYSTEM">نظام</option>
              <option value="VISIT">زيارات</option>
              <option value="TARGET">أهداف</option>
              <option value="FOLLOW_UP">متابعات</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">العنوان</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="مثال: تحديث جديد"
              className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">الرسالة</label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={5}
              placeholder="اكتب الرسالة هنا..."
              className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-sm resize-none"
            />
          </div>

          {result && (
            <div className={`rounded-lg px-4 py-2.5 text-xs font-medium ${
              result.startsWith("✅") ? "bg-teal-50 text-teal-800" : "bg-red-50 text-red-700"
            }`}>
              {result}
            </div>
          )}

          <button
            onClick={send}
            disabled={sending || !title.trim() || !message.trim()}
            className="w-full py-3 rounded-xl bg-gradient-to-r from-sky-500 to-teal-500 text-white text-sm font-bold disabled:opacity-60"
          >
            {sending ? "جاري الإرسال..." : "إرسال الإشعار"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ============ Import Doctors Tab ============

function ImportDoctorsTab() {
  const [stats, setStats] = useState<PlatformDoctorsStats | null>(null);
  const [doctors, setDoctors] = useState<PlatformDoctor[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [search, setSearch] = useState("");
  const [specialtyFilter, setSpecialtyFilter] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);

  async function loadStats() {
    try {
      const s = await getPlatformDoctorsStats();
      setStats(s);
    } catch {}
  }

  async function loadDoctors() {
    setLoading(true);
    try {
      const d = await listPlatformDoctors({
        search: search || undefined,
        specialty: specialtyFilter || undefined,
        page_size: 200,
      });
      setDoctors(d);
    } catch {}
    setLoading(false);
  }

  useEffect(() => {
    Promise.all([loadStats(), loadDoctors()]);
  }, []);

  useEffect(() => {
    loadDoctors();
  }, [search, specialtyFilter]);

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setImportResult(null);
    try {
      const result = await importPlatformDoctors(file);
      setImportResult(result);
      await Promise.all([loadStats(), loadDoctors()]);
    } catch (err: any) {
      setImportResult({
        success: 0,
        duplicates: 0,
        failed: 1,
        errors: [{ row: 0, name: "", error: err.message || "Upload failed" }],
        total: 1,
      });
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  }

  async function handleDelete(id: string, name: string) {
    if (!confirm(`هل أنت متأكد من حذف "${name}"؟`)) return;
    setDeletingId(id);
    try {
      await deletePlatformDoctor(id);
      await Promise.all([loadStats(), loadDoctors()]);
    } catch (err: any) {
      alert(err.message || "فشل الحذف");
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5">
          <div className="text-xs font-medium text-slate-500 mb-1">إجمالي الدكاترة</div>
          <div className="text-3xl font-bold text-slate-900 dark:text-white tabular-nums">{stats?.total ?? 0}</div>
        </div>
        <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5">
          <div className="text-xs font-medium text-slate-500 mb-1">عدد التخصصات</div>
          <div className="text-3xl font-bold text-slate-900 dark:text-white tabular-nums">{stats?.specialties.length ?? 0}</div>
        </div>
        <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5">
          <div className="text-xs font-medium text-slate-500 mb-1">آخر استيراد</div>
          <div className="text-lg font-bold text-slate-900 dark:text-white">
            {doctors.length > 0 ? new Date(doctors[0].created_at).toLocaleDateString("ar-EG") : "—"}
          </div>
        </div>
      </div>

      {/* Upload Section */}
      <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6">
        <h3 className="text-base font-bold text-slate-900 dark:text-white mb-1">استيراد دكاترة من Excel أو CSV</h3>
        <p className="text-xs text-slate-500 mb-4">
          ارفع ملف Excel أو CSV يحتوي على أعمدة: name (الاسم)، specialty (التخصص)، phone (الهاتف)، email (البريد)، address (العنوان)، city (المدينة)، area (المنطقة).
          الدكاترة ستظهر تلقائياً للشركات ذات التخصص المناسب.
        </p>

        <label className="block">
          <input
            type="file"
            accept=".xlsx,.xls,.csv"
            onChange={handleFileUpload}
            disabled={uploading}
            className="hidden"
          />
          <div className={`flex items-center justify-center gap-3 px-6 py-8 rounded-xl border-2 border-dashed transition cursor-pointer ${
            uploading
              ? "border-sky-300 bg-sky-50 dark:bg-sky-950"
              : "border-slate-200 dark:border-slate-700 hover:border-sky-400 hover:bg-sky-50 dark:hover:bg-sky-950/50"
          }`}>
            {uploading ? (
              <>
                <div className="w-5 h-5 border-2 border-sky-300 border-t-sky-600 rounded-full animate-spin" />
                <span className="text-sm font-medium text-sky-700 dark:text-sky-300">جاري الاستيراد...</span>
              </>
            ) : (
              <>
                <Icon d={icons.plus} size={24} className="text-slate-400" />
                <span className="text-sm font-medium text-slate-600 dark:text-slate-300">اختر ملف Excel أو CSV</span>
              </>
            )}
          </div>
        </label>

        {/* Import Result */}
        {importResult && (
          <div className={`mt-4 rounded-xl px-4 py-3 ${
            importResult.failed === 0 && importResult.errors.length === 0
              ? "bg-teal-50 dark:bg-teal-950 border border-teal-200 dark:border-teal-800"
              : "bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800"
          }`}>
            <div className="flex flex-wrap gap-4 text-sm">
              <span className="font-semibold text-teal-700 dark:text-teal-300">تم الاستيراد: {importResult.success}</span>
              <span className="text-slate-600 dark:text-slate-400">مكرر: {importResult.duplicates}</span>
              {importResult.failed > 0 && (
                <span className="font-semibold text-red-600">فشل: {importResult.failed}</span>
              )}
            </div>
            {importResult.errors.length > 0 && (
              <div className="mt-2 text-xs text-red-600 dark:text-red-400 max-h-32 overflow-y-auto">
                {importResult.errors.slice(0, 10).map((err, i) => (
                  <div key={i}>صف {err.row}: {err.name} — {err.error}</div>
                ))}
                {importResult.errors.length > 10 && <div>... و {importResult.errors.length - 10} أخطاء أخرى</div>}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Specialty Distribution */}
      {stats && stats.specialties.length > 0 && (
        <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-3">التخصصات</h3>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setSpecialtyFilter("")}
              className={`px-3 py-1 rounded-full text-xs font-semibold transition ${
                !specialtyFilter
                  ? "bg-sky-500 text-white"
                  : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200"
              }`}
            >
              الكل ({stats.total})
            </button>
            {stats.specialties.map((s) => (
              <button
                key={s.specialty}
                onClick={() => setSpecialtyFilter(specialtyFilter === s.specialty ? "" : s.specialty)}
                className={`px-3 py-1 rounded-full text-xs font-semibold transition ${
                  specialtyFilter === s.specialty
                    ? "bg-sky-500 text-white"
                    : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200"
                }`}
              >
                {s.specialty} ({s.count})
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Doctors Table */}
      <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 overflow-hidden">
        <div className="px-5 py-3 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white">
            الدكاترة ({doctors.length})
          </h3>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="بحث بالاسم أو التخصص أو الهاتف..."
            className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs w-64 focus:outline-none focus:ring-2 focus:ring-sky-500/20"
          />
        </div>

        {loading ? (
          <div className="text-center py-10">
            <div className="w-6 h-6 border-2 border-slate-300 border-t-sky-500 rounded-full animate-spin mx-auto" />
          </div>
        ) : doctors.length === 0 ? (
          <div className="text-center py-10 text-slate-500 text-sm">لا يوجد دكاترة بعد. ارفع ملف Excel للبدء.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
                <tr>
                  <th className="text-start px-4 py-2.5 text-xs font-semibold text-slate-600 dark:text-slate-300">الاسم</th>
                  <th className="text-start px-4 py-2.5 text-xs font-semibold text-slate-600 dark:text-slate-300">التخصص</th>
                  <th className="text-start px-4 py-2.5 text-xs font-semibold text-slate-600 dark:text-slate-300">الهاتف</th>
                  <th className="text-start px-4 py-2.5 text-xs font-semibold text-slate-600 dark:text-slate-300">المدينة</th>
                  <th className="text-start px-4 py-2.5 text-xs font-semibold text-slate-600 dark:text-slate-300">المنطقة</th>
                  <th className="text-start px-4 py-2.5 text-xs font-semibold text-slate-600 dark:text-slate-300"></th>
                </tr>
              </thead>
              <tbody>
                {doctors.map((d) => (
                  <tr key={d.id} className="border-b border-slate-100 dark:border-slate-800 last:border-0 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition">
                    <td className="px-4 py-2.5">
                      <div className="font-medium text-slate-900 dark:text-white">{d.full_name}</div>
                      {d.email && <div className="text-[10px] text-slate-400" dir="ltr">{d.email}</div>}
                    </td>
                    <td className="px-4 py-2.5">
                      {d.specialty && (
                        <span className="inline-flex px-2 py-0.5 rounded-full text-[10px] font-semibold bg-indigo-100 text-indigo-700 dark:bg-indigo-900 dark:text-indigo-300">
                          {d.specialty}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-2.5 text-xs text-slate-600 dark:text-slate-400" dir="ltr">{d.phone || "—"}</td>
                    <td className="px-4 py-2.5 text-xs text-slate-600 dark:text-slate-400">{d.city || "—"}</td>
                    <td className="px-4 py-2.5 text-xs text-slate-600 dark:text-slate-400">{d.area || "—"}</td>
                    <td className="px-4 py-2.5">
                      <button
                        onClick={() => handleDelete(d.id, d.full_name)}
                        disabled={deletingId === d.id}
                        className="text-[10px] font-medium px-2 py-1 rounded bg-red-50 text-red-700 hover:bg-red-100 disabled:opacity-50"
                      >
                        {deletingId === d.id ? "..." : "حذف"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}