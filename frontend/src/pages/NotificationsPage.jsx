import { useEffect, useState } from "react";
import { Bell, AlertTriangle, Clock, Sparkles, CheckCheck, X } from "lucide-react";
import api from "../lib/api";

const ICONS = {
  overdue: AlertTriangle,
  due_soon: Clock,
  ai_alert: Sparkles,
};

const TINTS = {
  overdue: "bg-red-50 text-red-700 border-red-100",
  due_soon: "bg-amber-50 text-amber-700 border-amber-100",
  ai_alert: "bg-orange-50 text-orange-700 border-orange-100",
};

export default function NotificationsPage() {
  const [items, setItems] = useState([]);
  const [busy, setBusy] = useState(false);

  const load = async () => {
    try {
      const { data } = await api.get("/notifications");
      setItems(data);
    } catch (e) {
      if (e?.response?.status !== 401) console.error("Notifications load failed:", e);
    }
  };
  useEffect(() => { load(); }, []);

  const markRead = async (id) => {
    setItems((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
    try { await api.patch(`/notifications/${id}/read`); } catch { load(); }
  };

  const remove = async (id) => {
    setItems((prev) => prev.filter((n) => n.id !== id));
    try { await api.delete(`/notifications/${id}`); } catch { load(); }
  };

  const markAll = async () => {
    setBusy(true);
    try {
      await api.post("/notifications/read-all");
      setItems((prev) => prev.map((n) => ({ ...n, read: true })));
    } finally { setBusy(false); }
  };

  const unread = items.filter((n) => !n.read).length;

  return (
    <div className="space-y-5 animate-fade-up" data-testid="notifications-page">
      <div className="flex items-end justify-between flex-wrap gap-3">
        <div>
          <p className="text-sm text-gray-500">Stay on top of deadlines</p>
          <h1 className="font-display text-3xl sm:text-4xl font-bold text-gray-900 flex items-center gap-3">
            Notifications
            {unread > 0 && (
              <span className="text-xs px-2.5 py-1 rounded-full bg-orange-100 text-orange-700 font-medium" data-testid="notif-unread-count">
                {unread} new
              </span>
            )}
          </h1>
        </div>
        {unread > 0 && (
          <button
            data-testid="notif-mark-all-read"
            onClick={markAll}
            disabled={busy}
            className="text-sm px-3 h-9 rounded-lg bg-white border border-gray-200 hover:bg-gray-50 inline-flex items-center gap-1.5 disabled:opacity-50"
          >
            <CheckCheck className="w-4 h-4" /> Mark all read
          </button>
        )}
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 divide-y divide-gray-50">
        {items.length === 0 && (
          <div className="p-12 text-center text-gray-400 italic flex flex-col items-center gap-2">
            <Bell className="w-8 h-8 text-gray-300" />
            All caught up. No notifications.
          </div>
        )}
        {items.map((n) => {
          const Icon = ICONS[n.type] || Bell;
          const tint = TINTS[n.type] || "bg-gray-50 text-gray-700 border-gray-100";
          return (
            <div
              key={n.id}
              data-testid={`notif-${n.id}`}
              className={`p-4 flex items-start gap-3 transition-colors ${
                n.read ? "opacity-60" : "hover:bg-gray-50/60"
              }`}
            >
              <div className={`w-9 h-9 rounded-lg flex items-center justify-center border ${tint}`}>
                <Icon className="w-4 h-4" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-gray-900 flex items-center gap-2">
                  {n.title}
                  {!n.read && <span className="w-1.5 h-1.5 rounded-full bg-orange-500" />}
                </div>
                <div className="text-xs text-gray-500 mt-0.5">{n.message}</div>
              </div>
              <div className="flex items-center gap-1">
                {!n.read && (
                  <button
                    data-testid={`notif-mark-${n.id}`}
                    onClick={() => markRead(n.id)}
                    className="text-xs px-2 py-1 rounded text-gray-500 hover:bg-gray-100"
                  >
                    Mark read
                  </button>
                )}
                <button
                  data-testid={`notif-delete-${n.id}`}
                  onClick={() => remove(n.id)}
                  className="p-1.5 rounded text-gray-300 hover:text-red-600 hover:bg-red-50"
                  aria-label="Dismiss"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
