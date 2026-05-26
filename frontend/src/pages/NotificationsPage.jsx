import { useEffect, useState } from "react";
import { Bell, AlertTriangle, Clock, Sparkles, CheckCheck, X } from "lucide-react";
import api from "../lib/api";

const ICONS = {
  overdue: AlertTriangle,
  due_soon: Clock,
  ai_alert: Sparkles,
};

const TINTS = {
  overdue: "bg-destructive/10 text-destructive border-destructive/30",
  due_soon: "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/30",
  ai_alert: "bg-primary/10 text-primary border-primary/20",
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
          <h1 className="font-display text-3xl sm:text-4xl font-bold text-foreground flex items-center gap-3">
            Notifications
            {unread > 0 && (
              <span className="text-xs px-2.5 py-1 rounded-full bg-primary/15 text-primary font-medium" data-testid="notif-unread-count">
                {unread} new
              </span>
            )}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">Stay on top of deadlines</p>
        </div>
        {unread > 0 && (
          <button
            data-testid="notif-mark-all-read"
            onClick={markAll}
            disabled={busy}
            className="text-sm px-3 h-9 rounded-lg bg-card border border-border hover:bg-muted/50 inline-flex items-center gap-1.5 disabled:opacity-50"
          >
            <CheckCheck className="w-4 h-4" /> Mark all read
          </button>
        )}
      </div>

      <div className="bg-card rounded-2xl border border-border divide-y divide-gray-50">
        {items.length === 0 && (
          <div className="p-12 text-center text-muted-foreground/80 italic flex flex-col items-center gap-2">
            <Bell className="w-8 h-8 text-muted-foreground/70" />
            All caught up. No notifications.
          </div>
        )}
        {items.map((n) => {
          const Icon = ICONS[n.type] || Bell;
          const tint = TINTS[n.type] || "bg-muted/50 text-foreground border-border/70";
          return (
            <div
              key={n.id}
              data-testid={`notif-${n.id}`}
              className={`p-4 flex items-start gap-3 transition-colors ${
                n.read ? "opacity-60" : "hover:bg-muted/50/60"
              }`}
            >
              <div className={`w-9 h-9 rounded-lg flex items-center justify-center border ${tint}`}>
                <Icon className="w-4 h-4" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-foreground flex items-center gap-2">
                  {n.title}
                  {!n.read && <span className="w-1.5 h-1.5 rounded-full bg-primary" />}
                </div>
                <div className="text-xs text-muted-foreground mt-0.5">{n.message}</div>
              </div>
              <div className="flex items-center gap-1">
                {!n.read && (
                  <button
                    data-testid={`notif-mark-${n.id}`}
                    onClick={() => markRead(n.id)}
                    className="text-xs px-2 py-1 rounded text-muted-foreground hover:bg-muted"
                  >
                    Mark read
                  </button>
                )}
                <button
                  data-testid={`notif-delete-${n.id}`}
                  onClick={() => remove(n.id)}
                  className="p-1.5 rounded text-muted-foreground/70 hover:text-destructive hover:bg-destructive/10"
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
