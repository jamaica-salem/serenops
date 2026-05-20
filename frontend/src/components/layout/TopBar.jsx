import { Search, Bell, Mail, Plus, PanelLeft, Moon, Sun } from "lucide-react";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../../lib/api";
import { useAuth } from "../../contexts/AuthContext";

const FILTERS = [
  { key: "today", label: "Today" },
  { key: "week", label: "This Week" },
  { key: "month", label: "This Month" },
  { key: "year", label: "This Year" },
];

export default function TopBar({ filter, onFilterChange, search, onSearch, sidebarOpen, onToggleSidebar }) {
  const { user } = useAuth();
  const [notifCount, setNotifCount] = useState(0);
  const [theme, setTheme] = useState(() => localStorage.getItem("theme") || "light");

  useEffect(() => {
    let mounted = true;
    api.get("/notifications").then(({ data }) => {
      if (mounted) setNotifCount(data.filter((n) => !n.read).length);
    }).catch(() => { /* swallowed; interceptor handles 401 redirects */ });
    return () => { mounted = false; };
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle("dark", theme === "dark");
    localStorage.setItem("theme", theme);
  }, [theme]);

  return (
    <header
      className="h-20 border-b border-border bg-background/95 backdrop-blur-md px-4 md:px-6 flex items-center gap-4 sticky top-0 z-30"
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
        <button
          type="button"
          onClick={() => setTheme((prev) => (prev === "dark" ? "light" : "dark"))}
          className="w-9 h-9 rounded-full hover:bg-muted flex items-center justify-center text-muted-foreground"
          aria-label={theme === "dark" ? "Switch to light theme" : "Switch to dark theme"}
          data-testid="topbar-theme-toggle"
        >
          {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
        </button>
        <button className="hidden md:flex w-9 h-9 rounded-full bg-[#0F6A4F] text-white hover:bg-[#0C5B44] items-center justify-center" aria-label="Create" data-testid="topbar-create">
          <Plus className="w-4 h-4" />
        </button>
        <button className="hidden md:flex w-9 h-9 rounded-full hover:bg-muted items-center justify-center text-muted-foreground" aria-label="Mail" data-testid="topbar-mail">
          <Mail className="w-4 h-4" />
        </button>
        <Link
          to="/notifications"
          className="relative w-9 h-9 rounded-full hover:bg-muted flex items-center justify-center text-muted-foreground"
          data-testid="topbar-notifications"
        >
          <Bell className="w-4 h-4" />
          {notifCount > 0 && (
            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-[#5FA38D] rounded-full" />
          )}
        </Link>

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
