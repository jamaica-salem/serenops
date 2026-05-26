import { Search, Bell, Mail, Plus, PanelLeft, Moon, Sun, AlertTriangle, Clock, Sparkles, CheckCheck, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../lib/api";
import { useAuth } from "../../contexts/AuthContext";

const FILTERS = [
  { key: "today", label: "Today" },
  { key: "week", label: "This Week" },
  { key: "month", label: "This Month" },
  { key: "year", label: "This Year" },
];

const NOTIF_ICONS = {
  overdue: AlertTriangle,
  due_soon: Clock,
  ai_alert: Sparkles,
};

const NOTIF_TINTS = {
  overdue: "bg-red-50 text-red-700 border-red-100",
  due_soon: "bg-amber-50 text-amber-700 border-amber-100",
  ai_alert: "bg-orange-50 text-orange-700 border-orange-100",
};

const unreadCount = (rows) => rows.filter((n) => !n.read).length;
const QUICK_CREATE_ACTIONS = [
  { label: "New Task", href: "/tasks?new=1" },
  { label: "New Client", href: "/clients?new=1" },
  { label: "New Project", href: "/projects?new=1" },
];

export default function TopBar({ filter, onFilterChange, search, onSearch, sidebarOpen, onToggleSidebar }) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [notifCount, setNotifCount] = useState(0);
  const [notifOpen, setNotifOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [notifs, setNotifs] = useState([]);
  const [notifBusy, setNotifBusy] = useState(false);
  const [theme, setTheme] = useState(() => localStorage.getItem("theme") || "light");
  const notifRef = useRef(null);
  const createRef = useRef(null);

  const syncNotifications = (rows) => {
    setNotifs(rows);
    setNotifCount(unreadCount(rows));
  };

  const loadNotifications = async () => {
    try {
      const { data } = await api.get("/notifications");
      syncNotifications(data);
    } catch {
      // swallowed; interceptor handles 401 redirects
    }
  };

  useEffect(() => {
    loadNotifications();
  }, []);

  useEffect(() => {
    if (!notifOpen) return;
    loadNotifications();
  }, [notifOpen]);

  useEffect(() => {
    if (!notifOpen && !createOpen) return;
    const handleClick = (event) => {
      if (notifRef.current && !notifRef.current.contains(event.target)) {
        setNotifOpen(false);
      }
      if (createRef.current && !createRef.current.contains(event.target)) {
        setCreateOpen(false);
      }
    };
    const handleKey = (event) => {
      if (event.key === "Escape") {
        setNotifOpen(false);
        setCreateOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("keydown", handleKey);
    };
  }, [notifOpen, createOpen]);

  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle("dark", theme === "dark");
    localStorage.setItem("theme", theme);
  }, [theme]);

  return (
    <header
      className="h-20 border border-[#1e3a31]/10 bg-background/95 backdrop-blur-md px-4 md:px-6 flex items-center gap-4 sticky top-2 md:top-4 z-30 rounded-2xl mx-2 md:mx-4 mt-2 md:mt-4 shadow-[0_10px_24px_rgba(16,42,34,0.08)]"
      data-testid="topbar"
    >
      <button
        type="button"
        onClick={onToggleSidebar}
        aria-label={sidebarOpen ? "Hide sidebar" : "Show sidebar"}
        className="w-10 h-10 rounded-xl border border-border bg-card text-foreground hover:bg-muted flex items-center justify-center"
      >
        <PanelLeft className="w-4 h-4" />
      </button>

      <div className="flex-1 max-w-xl relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <input
          data-testid="topbar-search"
          value={search || ""}
          onChange={(e) => onSearch?.(e.target.value)}
          placeholder="Search clients, projects, tasks, invoices..."
          className="w-full h-11 pl-9 pr-4 rounded-xl bg-card border border-border text-sm text-foreground focus:outline-none focus:border-[#5FA38D] focus:ring-2 focus:ring-[#5FA38D]/20 transition-colors"
        />
      </div>

      <div className="hidden lg:flex items-center bg-card rounded-xl p-1 border border-border">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            data-testid={`filter-${f.key}`}
            onClick={() => onFilterChange?.(f.key)}
            className={`px-4 py-1.5 text-sm rounded-lg transition-colors ${
              filter === f.key
                ? "bg-secondary text-secondary-foreground font-medium"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div className="ml-auto flex items-center gap-1 md:gap-2">
        <div className="relative" ref={createRef}>
          <button
            type="button"
            onClick={() => {
              setNotifOpen(false);
              setCreateOpen((prev) => !prev);
            }}
            className="w-9 h-9 rounded-full bg-[#0F6A4F] text-white hover:bg-[#0C5B44] flex items-center justify-center"
            aria-label="Quick create"
            data-testid="topbar-create"
          >
            <Plus className="w-4 h-4" />
          </button>
          {createOpen && (
            <div className="absolute right-0 mt-3 w-44 rounded-xl border border-border bg-background shadow-xl z-50 p-1">
              {QUICK_CREATE_ACTIONS.map((action) => (
                <button
                  key={action.href}
                  type="button"
                  className="w-full text-left px-3 py-2 rounded-lg text-sm text-foreground hover:bg-muted"
                  onClick={() => {
                    setCreateOpen(false);
                    navigate(action.href);
                  }}
                >
                  {action.label}
                </button>
              ))}
            </div>
          )}
        </div>
        <button
          type="button"
          onClick={() => setTheme((prev) => (prev === "dark" ? "light" : "dark"))}
          className="w-9 h-9 rounded-full hover:bg-muted flex items-center justify-center text-muted-foreground"
          aria-label={theme === "dark" ? "Switch to light theme" : "Switch to dark theme"}
          data-testid="topbar-theme-toggle"
        >
          {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
        </button>
        <button className="hidden md:flex w-9 h-9 rounded-full hover:bg-muted items-center justify-center text-muted-foreground" aria-label="Mail" data-testid="topbar-mail">
          <Mail className="w-4 h-4" />
        </button>
        <div className="relative" ref={notifRef}>
          <button
            type="button"
            onClick={() => {
              setCreateOpen(false);
              setNotifOpen((prev) => !prev);
            }}
            aria-label="Notifications"
            aria-expanded={notifOpen}
            className="relative w-9 h-9 rounded-full hover:bg-muted flex items-center justify-center text-muted-foreground"
            data-testid="topbar-notifications"
          >
            <Bell className="w-4 h-4" />
            {notifCount > 0 && (
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-[#5FA38D] rounded-full" />
            )}
          </button>
          {notifOpen && (
            <div
              className="absolute right-0 mt-3 w-[360px] max-w-[85vw] rounded-2xl border border-border bg-background shadow-xl z-50"
              data-testid="topbar-notifications-panel"
            >
              <div className="flex items-center justify-between px-4 py-3 border-b border-border">
                <div className="text-sm font-semibold text-foreground">Notifications</div>
                {notifCount > 0 && (
                  <button
                    type="button"
                    onClick={async () => {
                      setNotifBusy(true);
                      const next = notifs.map((n) => ({ ...n, read: true }));
                      syncNotifications(next);
                      try {
                        await api.post("/notifications/read-all");
                      } catch {
                        loadNotifications();
                      } finally {
                        setNotifBusy(false);
                      }
                    }}
                    disabled={notifBusy}
                    className="text-xs px-2.5 py-1 rounded-md border border-border hover:bg-muted disabled:opacity-50"
                    data-testid="notif-mark-all-read"
                  >
                    <CheckCheck className="w-3.5 h-3.5 inline-block mr-1" />
                    Mark all
                  </button>
                )}
              </div>
              {notifs.length === 0 ? (
                <div className="px-6 py-8 text-center text-sm text-muted-foreground">
                  You are all caught up.
                </div>
              ) : (
                <div className="max-h-[420px] overflow-auto">
                  {notifs.map((n) => {
                    const Icon = NOTIF_ICONS[n.type] || Bell;
                    const tint = NOTIF_TINTS[n.type] || "bg-muted text-muted-foreground border-border";
                    return (
                      <div
                        key={n.id}
                        className={`px-4 py-3 flex items-start gap-3 border-b border-border/60 last:border-b-0 ${
                          n.read ? "opacity-60" : "hover:bg-muted/40"
                        }`}
                        data-testid={`notif-${n.id}`}
                      >
                        <div className={`w-9 h-9 rounded-lg flex items-center justify-center border ${tint}`}>
                          <Icon className="w-4 h-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium text-foreground flex items-center gap-2">
                            {n.title}
                            {!n.read && <span className="w-1.5 h-1.5 rounded-full bg-orange-500" />}
                          </div>
                          <div className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{n.message}</div>
                        </div>
                        <div className="flex items-center gap-1">
                          {!n.read && (
                            <button
                              type="button"
                              onClick={async () => {
                                const next = notifs.map((item) => (item.id === n.id ? { ...item, read: true } : item));
                                syncNotifications(next);
                                try {
                                  await api.patch(`/notifications/${n.id}/read`);
                                } catch {
                                  loadNotifications();
                                }
                              }}
                              className="text-xs px-2 py-1 rounded text-muted-foreground hover:bg-muted"
                              data-testid={`notif-mark-${n.id}`}
                            >
                              Mark read
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={async () => {
                              const next = notifs.filter((item) => item.id !== n.id);
                              syncNotifications(next);
                              try {
                                await api.delete(`/notifications/${n.id}`);
                              } catch {
                                loadNotifications();
                              }
                            }}
                            className="p-1.5 rounded text-muted-foreground/60 hover:text-red-600 hover:bg-red-50"
                            aria-label="Dismiss"
                            data-testid={`notif-delete-${n.id}`}
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>

        <button
          type="button"
          className="ml-2 flex items-center gap-3 pl-3 border-l border-border text-left"
          data-testid="topbar-user"
        >
          <img
            src={user?.avatar_url || "https://images.unsplash.com/photo-1758518729459-235dcaadc611?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NjY2NzF8MHwxfHNlYXJjaHwzfHxwcm9mZXNzaW9uYWwlMjBwb3J0cmFpdCUyMHNtaWxpbmclMjBmYWNlfGVufDB8fHx8MTc3NzQyNzEzMXww&ixlib=rb-4.1.0&q=85"}
            alt={user?.name}
            className="w-9 h-9 rounded-full object-cover"
          />
          <div className="hidden md:block">
            <div className="text-sm font-medium text-foreground leading-tight">{user?.name}</div>
            <div className="text-xs text-muted-foreground">{user?.role === "admin" ? "Admin" : "Project member"}</div>
          </div>
        </button>
      </div>
    </header>
  );
}
