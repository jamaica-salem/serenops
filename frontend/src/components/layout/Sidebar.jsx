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
      className="hidden md:flex w-60 shrink-0 border-r border-[#1F342E] bg-[#14211D] flex-col text-[#F3F7F5]"
      data-testid="sidebar"
    >
      <div className="h-16 flex items-center gap-2 px-5 border-b border-[#1F342E]">
        <div className="w-8 h-8 rounded-lg bg-[#1B2B25] border border-[#31443D] flex items-center justify-center text-[#7BC4A4] font-bold font-display">
          S
        </div>
        <div>
          <div className="font-display font-bold text-[#F3F7F5] leading-none">SerenOps</div>
          <div className="text-[10px] uppercase tracking-widest text-[#8EA39B]">client os</div>
        </div>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1">
        {items.map(({ to, icon: Icon, label, testid, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            data-testid={testid}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                isActive
                  ? "bg-[#22352E] text-[#F3F7F5] font-medium"
                  : "text-[#B8C8C1] hover:bg-[#1B2B25] hover:text-[#F3F7F5]"
              }`
            }
          >
            <Icon className="w-4 h-4" />
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>

      <div className="p-3 border-t border-[#1F342E]">
        <div className="flex items-center gap-3 px-2 py-2">
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
            className="p-1.5 rounded-md text-[#8EA39B] hover:text-[#F3F7F5] hover:bg-[#1B2B25]"
            title="Logout"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </aside>
  );
}
