import { useEffect, useState } from "react";
import { useOutletContext } from "react-router-dom";
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
      <div className="flex items-end justify-between flex-wrap gap-2">
        <div>
          <p className="text-sm text-gray-500">Manage client operations from lead to delivery</p>
          <h1 className="font-display text-3xl sm:text-4xl font-bold text-gray-900 tracking-tight">
            Client Operations Dashboard
          </h1>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <Metric label="Clients" value={summary?.total_clients ?? 0} />
        <Metric label="Active Clients" value={summary?.active_clients ?? 0} />
        <Metric label="Leads" value={summary?.leads ?? 0} />
        <Metric label="Pending Proposals" value={summary?.pending_proposals ?? 0} />
        <Metric label="Pending Invoices" value={summary?.pending_invoices ?? 0} />
        <Metric label="Pending Contracts" value={summary?.pending_contracts ?? 0} />
        <Metric label="Revisions Pending" value={summary?.revisions_pending ?? 0} />
        <Metric label="Payments Due" value={summary?.payments_due ?? 0} />
        <Metric label="Deadlines (7d)" value={summary?.upcoming_deadlines ?? 0} />
        <Metric label="Needs Follow-up" value={summary?.clients_needing_follow_up ?? 0} />
        <Metric label="Projects In Progress" value={summary?.projects_in_progress ?? 0} />
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

function Metric({ label, value }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-3">
      <div className="text-[11px] text-gray-500">{label}</div>
      <div className="text-xl font-semibold text-gray-900 mt-1">{value}</div>
    </div>
  );
}
