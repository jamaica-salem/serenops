import { NavLink } from "react-router-dom";
import {
  LayoutDashboard, ListTodo, FolderKanban, Bell, Sparkles, Settings, LogOut, BriefcaseBusiness, ReceiptText, FileSignature, RefreshCcwDot, FilePenLine, LayoutTemplate,
} from "lucide-react";
import { useAuth } from "../../contexts/AuthContext";

const items = [
  { to: "/", icon: LayoutDashboard, label: "Dashboard", testid: "nav-dashboard", end: true },
  { to: "/tasks", icon: ListTodo, label: "Tasks", testid: "nav-tasks" },
  { to: "/clients", icon: BriefcaseBusiness, label: "Clients", testid: "nav-clients" },
  { to: "/projects", icon: FolderKanban, label: "Projects", testid: "nav-projects" },
  { to: "/proposals", icon: FilePenLine, label: "Proposals", testid: "nav-proposals" },
  { to: "/revisions", icon: RefreshCcwDot, label: "Revisions", testid: "nav-revisions" },
  { to: "/invoices", icon: ReceiptText, label: "Invoices", testid: "nav-invoices" },
  { to: "/contracts", icon: FileSignature, label: "Contracts", testid: "nav-contracts" },
  { to: "/templates", icon: LayoutTemplate, label: "Templates", testid: "nav-templates" },
  { to: "/notifications", icon: Bell, label: "Notifications", testid: "nav-notifications" },
  { to: "/assistant", icon: Sparkles, label: "AI Assistant", testid: "nav-assistant" },
  { to: "/settings", icon: Settings, label: "Settings", testid: "nav-settings" },
];

export default function Sidebar() {
  const { user, logout } = useAuth();

  return (
    <aside
      className="hidden md:flex relative w-60 shrink-0 border-r border-[#1e3a31] bg-gradient-to-b from-[#0F2B24] to-[#123C31] flex-col text-[#F3F7F5] overflow-hidden"
      data-testid="sidebar"
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_14%_8%,rgba(123,196,164,0.26),transparent_38%),radial-gradient(circle_at_20%_85%,rgba(95,163,141,0.18),transparent_34%)]" />

      <div className="relative h-20 flex items-center gap-3 px-5 border-b border-white/10">
        <div className="w-10 h-10 rounded-full bg-white/10 border border-white/35 flex items-center justify-center text-white font-bold font-display shadow-sm">
          S
        </div>
        <div>
          <div className="font-display font-semibold text-lg text-[#F3F7F5] leading-none">SerenOps</div>
          <div className="text-[10px] uppercase tracking-[0.18em] text-[#B8C8C1] mt-0.5">client os</div>
        </div>
      </div>

      <nav className="relative flex-1 px-3 py-5 space-y-1.5">
        {items.map(({ to, icon: Icon, label, testid, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            data-testid={testid}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm transition-colors ${
                isActive
                  ? "bg-white/10 text-[#F3F7F5] font-medium"
                  : "text-[#d6e1dc] hover:bg-white/5 hover:text-[#F3F7F5]"
              }`
            }
          >
            <Icon className="w-4 h-4" />
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>

      <div className="relative p-3 border-t border-white/10">
        <div className="flex items-center gap-3 px-2 py-2 rounded-xl bg-white/5">
          <img
            src={user?.avatar_url || "https://images.unsplash.com/photo-1758518729459-235dcaadc611?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NjY2NzF8MHwxfHNlYXJjaHwzfHxwcm9mZXNzaW9uYWwlMjBwb3J0cmFpdCUyMHNtaWxpbmclMjBmYWNlfGVufDB8fHx8MTc3NzQyNzEzMXww&ixlib=rb-4.1.0&q=85"}
            alt={user?.name}
            className="w-8 h-8 rounded-full object-cover"
            data-testid="sidebar-user-avatar"
          />
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium text-[#F3F7F5] truncate">{user?.name}</div>
            <div className="text-xs text-[#8EA39B] truncate">{user?.email}</div>
          </div>
          <button
            onClick={logout}
            data-testid="sidebar-logout-btn"
            className="p-1.5 rounded-md text-[#B8C8C1] hover:text-[#F3F7F5] hover:bg-white/10"
            title="Logout"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </aside>
  );
}
