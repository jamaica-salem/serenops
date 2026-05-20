import { useEffect, useState } from "react";
import { useOutletContext } from "react-router-dom";
import {
  BriefcaseBusiness,
  UserRoundCheck,
  Sparkles,
  FilePenLine,
  ReceiptText,
  FileSignature,
  RefreshCcwDot,
  CircleDollarSign,
  CalendarClock,
  MessageSquareMore,
  FolderKanban,
  SlidersHorizontal,
} from "lucide-react";
import api from "../lib/api";
import MyTasksCard from "../components/dashboard/MyTasksCard";
import ProjectsOverviewCard from "../components/dashboard/ProjectsOverviewCard";
import AIInsightsCard from "../components/dashboard/AIInsightsCard";
import MeetingsCard from "../components/dashboard/MeetingsCard";
import TaskProgressCard from "../components/dashboard/TaskProgressCard";
import OpenTicketsCard from "../components/dashboard/OpenTicketsCard";
import TaskFormDialog from "../components/TaskFormDialog";
import { useAuth } from "../contexts/AuthContext";

export default function Dashboard() {
  const { user } = useAuth();
  const { search } = useOutletContext();
  const [summary, setSummary] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [meetings, setMeetings] = useState([]);
  const [users, setUsers] = useState([]);
  const [projects, setProjects] = useState([]);
  const [clients, setClients] = useState([]);
  const [openDialog, setOpenDialog] = useState(false);

  const reload = async () => {
    try {
      const [s, t, m, p, u, c] = await Promise.all([
        api.get("/dashboard/summary"),
        api.get("/tasks"),
        api.get("/meetings"),
        api.get("/projects"),
        api.get("/users"),
        api.get("/clients"),
      ]);
      setSummary(s.data);
      setTasks(t.data);
      setMeetings(m.data);
      setProjects(p.data);
      setUsers(u.data);
      setClients(c.data);
    } catch (e) {
      // 401s redirect to /login via the global interceptor; ignore here.
      if (e?.response?.status !== 401) console.error("Dashboard reload failed:", e);
    }
  };

  useEffect(() => { reload(); /* eslint-disable-line */ }, []);

  const myTasks = tasks.filter((t) => t.assignee_id === user?.id);
  const filtered = search
    ? tasks.filter((t) => t.title.toLowerCase().includes(search.toLowerCase()))
    : tasks;

  return (
    <div className="space-y-6 animate-fade-up" data-testid="dashboard-page">
      <div className="flex items-end justify-between flex-wrap gap-3">
        <div>
          <p className="text-sm text-[#667C74]">Welcome back, {user?.name?.split(" ")[0] || "there"}!</p>
          <h1 className="font-display text-3xl sm:text-4xl font-bold text-[#1D2A25] tracking-tight mt-1">
            Client Operations Dashboard
          </h1>
          <p className="text-sm text-[#667C74] mt-2">Manage every client, project, and deliverable in one calm, organized space.</p>
        </div>
        <button className="h-10 px-4 rounded-xl border border-[#E5ECE8] bg-white text-sm text-[#42534d] inline-flex items-center gap-2 hover:bg-[#f7faf8]">
          <SlidersHorizontal className="w-4 h-4" />
          Customize Dashboard
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
        <Metric label="Clients" value={summary?.total_clients ?? 0} icon={BriefcaseBusiness} />
        <Metric label="Active Clients" value={summary?.active_clients ?? 0} icon={UserRoundCheck} />
        <Metric label="Leads" value={summary?.leads ?? 0} icon={Sparkles} />
        <Metric label="Pending Proposals" value={summary?.pending_proposals ?? 0} icon={FilePenLine} />
        <Metric label="Pending Invoices" value={summary?.pending_invoices ?? 0} icon={ReceiptText} />
        <Metric label="Pending Contracts" value={summary?.pending_contracts ?? 0} icon={FileSignature} />
        <Metric label="Revisions Pending" value={summary?.revisions_pending ?? 0} icon={RefreshCcwDot} />
        <Metric label="Payments Due" value={summary?.payments_due ?? 0} icon={CircleDollarSign} />
        <Metric label="Deadlines (7d)" value={summary?.upcoming_deadlines ?? 0} icon={CalendarClock} />
        <Metric label="Needs Follow-up" value={summary?.clients_needing_follow_up ?? 0} icon={MessageSquareMore} />
        <Metric label="Projects In Progress" value={summary?.projects_in_progress ?? 0} icon={FolderKanban} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        <div className="lg:col-span-1 md:col-span-2 lg:row-span-2">
          <MyTasksCard tasks={myTasks} onAdd={() => setOpenDialog(true)} />
        </div>
        <div className="lg:col-span-1">
          <ProjectsOverviewCard summary={summary} />
        </div>
        <div className="lg:col-span-1">
          <AIInsightsCard insights={summary?.ai_insights || []} />
        </div>
        <div className="lg:col-span-1 md:col-span-2 lg:row-span-2">
          <MeetingsCard meetings={meetings} />
        </div>
        <div className="lg:col-span-2 md:col-span-2">
          <TaskProgressCard summary={summary} />
        </div>
      </div>

      <OpenTicketsCard tasks={filtered} users={users} />

      <TaskFormDialog
        open={openDialog}
        onOpenChange={setOpenDialog}
        projects={projects}
        clients={clients}
        onSaved={reload}
      />
    </div>
  );
}

function Metric({ label, value, icon: Icon }) {
  return (
    <div className="bg-white rounded-2xl border border-[#E5ECE8] p-4">
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-[#eef6f1] flex items-center justify-center text-[#3f7d69]">
          <Icon className="w-4 h-4" />
        </div>
        <div className="min-w-0">
          <div className="text-xs text-[#667C74] truncate">{label}</div>
          <div className="text-2xl font-semibold text-[#1D2A25] mt-0.5 leading-none">{value}</div>
        </div>
      </div>
    </div>
  );
}
