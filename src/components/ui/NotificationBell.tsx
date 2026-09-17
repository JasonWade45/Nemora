"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import { Icon, icons } from "@/components/ui/Icons";

type Notification = {
  id: string;
  title: string;
  message: string;
  is_read: boolean;
  created_at: string;
  notification_type?: string;
};

export function NotificationBell() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showPanel, setShowPanel] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadNotifications();
    const interval = setInterval(loadNotifications, 30000);
    return () => clearInterval(interval);
  }, []);

  async function loadNotifications() {
    try {
      const res: any = await apiFetch("/api/notifications?page=1&page_size=10&unread_only=false");
      setNotifications(res.items || []);
      setUnreadCount(res.unread_count || 0);
    } catch {}
    setLoading(false);
  }

  async function markRead(id: string) {
    try {
      await apiFetch(`/api/notifications/${id}/read`, { method: "POST" });
      setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, is_read: true } : n)));
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch {}
  }

  async function markAllRead() {
    try {
      await apiFetch("/api/notifications/read-all", { method: "POST" });
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
      setUnreadCount(0);
    } catch {}
  }

  function requestPushPermission() {
    if ("Notification" in window && "serviceWorker" in navigator) {
      Notification.requestPermission().then((perm) => {
        if (perm === "granted") {
          navigator.serviceWorker?.register("/sw.js");
        }
      });
    }
  }

  return (
    <div className="relative">
      <button
        onClick={() => setShowPanel(!showPanel)}
        className="relative p-2 rounded-lg hover:bg-white/10 transition"
      >
        <Icon d={icons.bell} size={20} className="text-white" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -end-0.5 w-5 h-5 rounded-full bg-red-500 text-white text-[9px] font-bold flex items-center justify-center animate-pulse">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {showPanel && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setShowPanel(false)} />
          <div className="absolute top-full end-0 mt-2 w-80 max-h-96 overflow-y-auto bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 z-50">
            <div className="flex items-center justify-between p-3 border-b border-slate-100 dark:border-slate-700">
              <span className="text-sm font-semibold text-slate-900 dark:text-white">الإشعارات</span>
              {unreadCount > 0 && (
                <button onClick={markAllRead} className="text-[11px] text-sky-600 hover:text-sky-700 font-medium">
                  قراءة الكل
                </button>
              )}
            </div>

            {loading ? (
              <div className="p-6 text-center text-sm text-slate-400">جاري التحميل...</div>
            ) : notifications.length === 0 ? (
              <div className="p-6 text-center text-sm text-slate-400">مفيش إشعارات</div>
            ) : (
              <div className="divide-y divide-slate-100 dark:divide-slate-700">
                {notifications.map((n) => (
                  <button
                    key={n.id}
                    onClick={() => {
                      if (!n.is_read) markRead(n.id);
                    }}
                    className={`w-full text-right p-3 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition ${
                      !n.is_read ? "bg-sky-50/50 dark:bg-sky-900/10" : ""
                    }`}
                  >
                    <div className="flex items-start gap-2">
                      {!n.is_read && <span className="w-2 h-2 rounded-full bg-sky-500 shrink-0 mt-1.5" />}
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-semibold text-slate-900 dark:text-white">{n.title}</div>
                        <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-2">{n.message}</div>
                        <div className="text-[9px] text-slate-400 mt-1">
                          {new Date(n.created_at).toLocaleString("ar-EG", { dateStyle: "short", timeStyle: "short" })}
                        </div>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}

            {/* Push notification permission */}
            {"Notification" in window && Notification.permission === "default" && (
              <div className="p-3 border-t border-slate-100 dark:border-slate-700">
                <button
                  onClick={requestPushPermission}
                  className="w-full py-2 rounded-xl bg-sky-500 text-white text-xs font-semibold hover:bg-sky-600 transition"
                >
                  تفعيل الإشعارات
                </button>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
