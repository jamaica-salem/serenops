import { useEffect, useMemo, useState } from "react";
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
  GripVertical,
  Plus,
  X,
  ListTodo,
  AlertTriangle,
  Clock,
  CheckCheck,
  Layers3,
  Circle,
} from "lucide-react";
import {
  DndContext,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  SortableContext,
  rectSwappingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import api from "../lib/api";
import MyTasksCard from "../components/dashboard/MyTasksCard";
import ProjectsOverviewCard from "../components/dashboard/ProjectsOverviewCard";
import AIInsightsCard from "../components/dashboard/AIInsightsCard";
import MeetingsCard from "../components/dashboard/MeetingsCard";
import TaskProgressCard from "../components/dashboard/TaskProgressCard";
import OpenTicketsCard from "../components/dashboard/OpenTicketsCard";
import TaskFormDialog from "../components/TaskFormDialog";
import { useAuth } from "../contexts/AuthContext";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";

const DASHBOARD_LAYOUT_KEY = "serenops_dashboard_cards_v1";
const DASHBOARD_KPI_LAYOUT_KEY = "serenops_dashboard_kpis_v1";
const DASHBOARD_NOTES_KEY = "serenops_dashboard_notes_v1";

const DASHBOARD_CARDS = [
  { id: "my_tasks", label: "My Tasks", className: "lg:col-span-1 md:col-span-2 lg:row-span-2" },
  { id: "projects_overview", label: "Projects Overview", className: "lg:col-span-1" },
  { id: "ai_insights", label: "AI Insights", className: "lg:col-span-1" },
  { id: "meetings", label: "My Meetings", className: "lg:col-span-1 md:col-span-2 lg:row-span-2" },
  { id: "task_progress", label: "Task Progress", className: "lg:col-span-2 md:col-span-2" },
  { id: "open_tickets", label: "Open Tickets", className: "lg:col-span-2 md:col-span-2" },
  { id: "proposals", label: "Proposals", className: "lg:col-span-1" },
  { id: "notes", label: "Notes", className: "lg:col-span-1 md:col-span-2" },
];

const DEFAULT_DASHBOARD_CARDS = [
  "my_tasks",
  "projects_overview",
  "ai_insights",
  "meetings",
  "task_progress",
  "open_tickets",
];

const KPI_CARDS = [
  { id: "total_clients", label: "Clients", icon: BriefcaseBusiness, getValue: (s) => s?.total_clients ?? 0 },
  { id: "active_clients", label: "Active Clients", icon: UserRoundCheck, getValue: (s) => s?.active_clients ?? 0 },
  { id: "leads", label: "Leads", icon: Sparkles, getValue: (s) => s?.leads ?? 0 },
  { id: "pending_proposals", label: "Pending Proposals", icon: FilePenLine, getValue: (s) => s?.pending_proposals ?? 0 },
  { id: "pending_invoices", label: "Pending Invoices", icon: ReceiptText, getValue: (s) => s?.pending_invoices ?? 0 },
  { id: "pending_contracts", label: "Pending Contracts", icon: FileSignature, getValue: (s) => s?.pending_contracts ?? 0 },
  { id: "revisions_pending", label: "Revisions Pending", icon: RefreshCcwDot, getValue: (s) => s?.revisions_pending ?? 0 },
  { id: "payments_due", label: "Payments Due", icon: CircleDollarSign, getValue: (s) => s?.payments_due ?? 0 },
  { id: "upcoming_deadlines", label: "Deadlines (7d)", icon: CalendarClock, getValue: (s) => s?.upcoming_deadlines ?? 0 },
  { id: "clients_needing_follow_up", label: "Needs Follow-up", icon: MessageSquareMore, getValue: (s) => s?.clients_needing_follow_up ?? 0 },
  { id: "projects_in_progress", label: "Projects In Progress", icon: FolderKanban, getValue: (s) => s?.projects_in_progress ?? 0 },
  { id: "total_tasks", label: "Total Tasks", icon: ListTodo, getValue: (s) => s?.total_tasks ?? 0 },
  { id: "overdue", label: "Overdue Tasks", icon: AlertTriangle, getValue: (s) => s?.overdue ?? 0 },
  { id: "in_progress", label: "Tasks In Progress", icon: Clock, getValue: (s) => s?.in_progress ?? 0 },
  { id: "completed", label: "Completed Tasks", icon: CheckCheck, getValue: (s) => s?.completed ?? 0 },
  { id: "backlog", label: "Backlog", icon: Layers3, getValue: (s) => s?.backlog ?? 0 },
  { id: "not_started", label: "Not Started", icon: Circle, getValue: (s) => s?.not_started ?? 0 },
];

const DEFAULT_KPI_CARDS = [
  "total_clients",
  "active_clients",
  "leads",
  "pending_proposals",
  "pending_invoices",
  "pending_contracts",
  "revisions_pending",
  "payments_due",
  "upcoming_deadlines",
  "clients_needing_follow_up",
  "projects_in_progress",
];

const DASHBOARD_CARD_BY_ID = Object.fromEntries(DASHBOARD_CARDS.map((card) => [card.id, card]));
const KPI_CARD_BY_ID = Object.fromEntries(KPI_CARDS.map((kpi) => [kpi.id, kpi]));

function sanitizeOrder(rawCards, allowedCards, fallback) {
  const allowed = new Set(allowedCards.map((card) => card.id));
  const next = [];
  for (const cardId of rawCards || []) {
    if (allowed.has(cardId) && !next.includes(cardId)) next.push(cardId);
  }
  return next.length ? next : [...fallback];
}

function swapItems(list, fromIndex, toIndex) {
  if (fromIndex === toIndex || fromIndex < 0 || toIndex < 0) return list;
  const next = [...list];
  const temp = next[fromIndex];
  next[fromIndex] = next[toIndex];
  next[toIndex] = temp;
  return next;
}

function parseDate(input) {
  if (!input) return null;
  const d = new Date(input);
  return Number.isNaN(d.getTime()) ? null : d;
}

function daysFromNow(input, now) {
  const d = parseDate(input);
  if (!d) return null;
  const delta = d.setHours(0, 0, 0, 0) - now.setHours(0, 0, 0, 0);
  return Math.round(delta / 86400000);
}

function deriveDashboardSummary({ tasks, clients, proposals, invoices, contracts, revisions, projects, userId }) {
  const today = new Date();
  const counts = { overdue: 0, in_progress: 0, completed: 0, backlog: 0, not_started: 0 };

  for (const t of tasks) {
    const status = t.status || "todo";
    if (status === "in_progress") counts.in_progress += 1;
    if (status === "done") counts.completed += 1;
    if (status === "backlog") counts.backlog += 1;
    if (status === "todo") counts.not_started += 1;
    const dueDiff = daysFromNow(t.due_date, new Date(today));
    if (dueDiff !== null && dueDiff < 0 && status !== "done") counts.overdue += 1;
  }

  const active_clients = clients.filter((c) => ["active", "onboarding", "waiting_for_client", "maintenance"].includes(c.status)).length;
  const leads = clients.filter((c) => c.status === "lead").length;
  const pending_proposals = proposals.filter((p) => ["draft", "sent"].includes(p.status)).length;
  const pending_invoices = invoices.filter((i) => ["sent", "partially_paid", "overdue"].includes(i.status)).length;
  const pending_contracts = contracts.filter((c) => ["draft", "sent"].includes(c.status)).length;
  const projects_in_progress = projects.filter((p) => p.status === "in_progress").length;
  const revisions_pending = revisions.filter((r) => ["requested", "in_progress"].includes(r.status)).length;
  const payments_due = invoices.filter((i) => Number(i.balance_due || 0) > 0 && i.status !== "cancelled").length;

  const upcoming_task_deadlines = tasks.filter((t) => {
    const dueDiff = daysFromNow(t.due_date, new Date(today));
    return dueDiff !== null && dueDiff >= 0 && dueDiff <= 7 && t.status !== "done";
  }).length;

  const upcoming_invoice_deadlines = invoices.filter((i) => {
    const dueDiff = daysFromNow(i.due_date, new Date(today));
    return dueDiff !== null && dueDiff >= 0 && dueDiff <= 7 && ["sent", "partially_paid", "overdue"].includes(i.status);
  }).length;

  const clients_needing_follow_up = clients.filter((c) => {
    if (!["lead", "active", "onboarding", "waiting_for_client", "maintenance"].includes(c.status)) return false;
    const last = parseDate(c.last_contacted_at || c.created_at);
    if (!last) return false;
    const diff = Math.floor((today - last) / 86400000);
    return diff >= 14;
  }).length;

  const myTasks = tasks.filter((t) => t.assignee_id === userId);
  const myOverdue = myTasks.filter((t) => {
    const dueDiff = daysFromNow(t.due_date, new Date(today));
    return dueDiff !== null && dueDiff < 0 && t.status !== "done";
  }).length;
  const myInProgress = myTasks.filter((t) => t.status === "in_progress").length;
  const myDueToday = myTasks.filter((t) => {
    const dueDiff = daysFromNow(t.due_date, new Date(today));
    return dueDiff === 0 && t.status !== "done";
  }).length;

  const ai_insights = [];
  if (myOverdue) ai_insights.push(`You have ${myOverdue} overdue task${myOverdue !== 1 ? "s" : ""}.`);
  if (myInProgress >= 3) ai_insights.push(`You're juggling ${myInProgress} tasks in progress — consider focusing on top 2.`);
  if (myDueToday) ai_insights.push(`${myDueToday} task${myDueToday !== 1 ? "s" : ""} due today.`);
  if (!ai_insights.length) ai_insights.push("All clear! No urgent attention needed today.");
  if (counts.backlog > 5) ai_insights.push(`Backlog growing: ${counts.backlog} items waiting.`);

  return {
    total_tasks: tasks.length,
    overdue: counts.overdue,
    in_progress: counts.in_progress,
    completed: counts.completed,
    backlog: counts.backlog,
    not_started: counts.not_started,
    total_clients: clients.length,
    active_clients,
    leads,
    pending_proposals,
    pending_invoices,
    pending_contracts,
    projects_in_progress,
    revisions_pending,
    payments_due,
    upcoming_deadlines: upcoming_task_deadlines + upcoming_invoice_deadlines,
    clients_needing_follow_up,
    ai_insights: ai_insights.slice(0, 4),
  };
}

export default function Dashboard() {
  const { user } = useAuth();
  const { search } = useOutletContext();
  const [tasks, setTasks] = useState([]);
  const [meetings, setMeetings] = useState([]);
  const [users, setUsers] = useState([]);
  const [projects, setProjects] = useState([]);
  const [clients, setClients] = useState([]);
  const [proposals, setProposals] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [contracts, setContracts] = useState([]);
  const [revisions, setRevisions] = useState([]);
  const [selectedClientId, setSelectedClientId] = useState("all");
  const [openDialog, setOpenDialog] = useState(false);
  const [customizing, setCustomizing] = useState(false);
  const [cardOrder, setCardOrder] = useState([...DEFAULT_DASHBOARD_CARDS]);
  const [kpiOrder, setKpiOrder] = useState([...DEFAULT_KPI_CARDS]);
  const [notes, setNotes] = useState("");

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  useEffect(() => {
    try {
      const rawCards = localStorage.getItem(DASHBOARD_LAYOUT_KEY);
      if (rawCards) setCardOrder(sanitizeOrder(JSON.parse(rawCards), DASHBOARD_CARDS, DEFAULT_DASHBOARD_CARDS));

      const rawKpis = localStorage.getItem(DASHBOARD_KPI_LAYOUT_KEY);
      if (rawKpis) setKpiOrder(sanitizeOrder(JSON.parse(rawKpis), KPI_CARDS, DEFAULT_KPI_CARDS));

      const savedNotes = localStorage.getItem(DASHBOARD_NOTES_KEY) || "";
      setNotes(savedNotes);
    } catch {
      setCardOrder([...DEFAULT_DASHBOARD_CARDS]);
      setKpiOrder([...DEFAULT_KPI_CARDS]);
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(DASHBOARD_LAYOUT_KEY, JSON.stringify(cardOrder));
  }, [cardOrder]);

  useEffect(() => {
    localStorage.setItem(DASHBOARD_KPI_LAYOUT_KEY, JSON.stringify(kpiOrder));
  }, [kpiOrder]);

  useEffect(() => {
    localStorage.setItem(DASHBOARD_NOTES_KEY, notes);
  }, [notes]);

  const reload = async () => {
    try {
      const [t, m, p, u, c, pr, inv, ctr, rev] = await Promise.all([
        api.get("/tasks"),
        api.get("/meetings"),
        api.get("/projects"),
        api.get("/users"),
        api.get("/clients"),
        api.get("/proposals"),
        api.get("/invoices"),
        api.get("/contracts"),
        api.get("/revisions"),
      ]);
      setTasks(t.data);
      setMeetings(m.data);
      setProjects(p.data);
      setUsers(u.data);
      setClients(c.data);
      setProposals(pr.data);
      setInvoices(inv.data);
      setContracts(ctr.data);
      setRevisions(rev.data);
    } catch (e) {
      if (e?.response?.status !== 401) console.error("Dashboard reload failed:", e);
    }
  };

  useEffect(() => { reload(); /* eslint-disable-line */ }, []);

  const scopedClients = selectedClientId === "all"
    ? clients
    : clients.filter((c) => c.id === selectedClientId);

  const scopedProjects = selectedClientId === "all"
    ? projects
    : projects.filter((p) => p.client_id === selectedClientId);

  const scopedProjectIds = new Set(scopedProjects.map((p) => p.id));
  const isClientScoped = selectedClientId !== "all";

  const scopedTasks = tasks.filter((t) => {
    if (!isClientScoped) return true;
    if (t.client_id === selectedClientId) return true;
    return t.project_id && scopedProjectIds.has(t.project_id);
  });

  const scopedMeetings = meetings.filter((m) => {
    if (!isClientScoped) return true;
    return m.project_id && scopedProjectIds.has(m.project_id);
  });

  const scopedProposals = isClientScoped ? proposals.filter((p) => p.client_id === selectedClientId) : proposals;
  const scopedInvoices = isClientScoped ? invoices.filter((i) => i.client_id === selectedClientId) : invoices;
  const scopedContracts = isClientScoped ? contracts.filter((c) => c.client_id === selectedClientId) : contracts;
  const scopedRevisions = isClientScoped ? revisions.filter((r) => r.client_id === selectedClientId) : revisions;

  const scopedSummary = useMemo(() => deriveDashboardSummary({
    tasks: scopedTasks,
    clients: scopedClients,
    proposals: scopedProposals,
    invoices: scopedInvoices,
    contracts: scopedContracts,
    revisions: scopedRevisions,
    projects: scopedProjects,
    userId: user?.id,
  }), [scopedTasks, scopedClients, scopedProposals, scopedInvoices, scopedContracts, scopedRevisions, scopedProjects, user?.id]);

  const myTasks = scopedTasks.filter((t) => t.assignee_id === user?.id);
  const filtered = search
    ? scopedTasks.filter((t) => t.title.toLowerCase().includes(search.toLowerCase()))
    : scopedTasks;

  const toggleTaskDone = async (task) => {
    const nextStatus = task.status === "done" ? "todo" : "done";
    setTasks((prev) => prev.map((t) => (t.id === task.id ? { ...t, status: nextStatus } : t)));
    try {
      await api.patch(`/tasks/${task.id}`, { status: nextStatus });
      await reload();
    } catch (e) {
      if (e?.response?.status !== 401) console.error("Task toggle failed:", e);
      await reload();
    }
  };

  const cardContent = {
    my_tasks: <MyTasksCard tasks={myTasks} onAdd={() => setOpenDialog(true)} onToggleDone={toggleTaskDone} />,
    projects_overview: <ProjectsOverviewCard summary={scopedSummary} />,
    ai_insights: <AIInsightsCard insights={scopedSummary?.ai_insights || []} />,
    meetings: <MeetingsCard meetings={scopedMeetings} />,
    task_progress: <TaskProgressCard summary={scopedSummary} />,
    open_tickets: <OpenTicketsCard tasks={filtered} users={users} />,
    proposals: <ProposalsCard pending={scopedSummary?.pending_proposals ?? 0} />,
    notes: <NotesCard notes={notes} onChange={setNotes} />,
  };

  const availableCards = useMemo(
    () => DASHBOARD_CARDS.filter((card) => !cardOrder.includes(card.id)),
    [cardOrder]
  );

  const availableKpis = useMemo(
    () => KPI_CARDS.filter((kpi) => !kpiOrder.includes(kpi.id)),
    [kpiOrder]
  );

  const onCardDragEnd = (event) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    setCardOrder((prev) => {
      const oldIndex = prev.indexOf(active.id);
      const newIndex = prev.indexOf(over.id);
      if (oldIndex === -1 || newIndex === -1) return prev;
      return swapItems(prev, oldIndex, newIndex);
    });
  };

  const onKpiDragEnd = (event) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    setKpiOrder((prev) => {
      const oldIndex = prev.indexOf(active.id);
      const newIndex = prev.indexOf(over.id);
      if (oldIndex === -1 || newIndex === -1) return prev;
      return swapItems(prev, oldIndex, newIndex);
    });
  };

  const removeCard = (cardId) => {
    setCardOrder((prev) => (prev.length > 1 ? prev.filter((id) => id !== cardId) : prev));
  };

  const addCard = (cardId) => {
    if (!DASHBOARD_CARD_BY_ID[cardId]) return;
    setCardOrder((prev) => (prev.includes(cardId) ? prev : [...prev, cardId]));
  };

  const removeKpi = (kpiId) => {
    setKpiOrder((prev) => (prev.length > 1 ? prev.filter((id) => id !== kpiId) : prev));
  };

  const addKpi = (kpiId) => {
    if (!KPI_CARD_BY_ID[kpiId]) return;
    setKpiOrder((prev) => (prev.includes(kpiId) ? prev : [...prev, kpiId]));
  };

  return (
    <div className="space-y-6 animate-fade-up" data-testid="dashboard-page">
      <div className="flex items-end justify-between flex-wrap gap-3">
        <div>
          <p className="text-sm text-[#667C74] dark:text-[#9bb2a8]">Welcome back, {user?.name?.split(" ")[0] || "there"}!</p>
          <h1 className="font-display text-3xl sm:text-4xl font-bold text-[#1C4B3E] dark:text-[#d7e6b6] tracking-tight mt-1">
            Client Operations Dashboard
          </h1>
          <p className="text-sm text-[#667C74] dark:text-[#9bb2a8] mt-2">Manage every client, project, and deliverable in one calm, organized space.</p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={selectedClientId} onValueChange={setSelectedClientId}>
            <SelectTrigger className="h-10 min-w-[180px] rounded-xl border-[#E5ECE8] dark:border-[#29433a]">
              <SelectValue placeholder="Filter by client" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Clients</SelectItem>
              {clients.map((client) => (
                <SelectItem key={client.id} value={client.id}>{client.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <button
            type="button"
            onClick={() => setCustomizing((prev) => !prev)}
            className={`h-10 px-4 rounded-xl border text-sm inline-flex items-center gap-2 whitespace-nowrap shrink-0 transition-colors ${
              customizing
                ? "border-[#1C4B3E] bg-[#1C4B3E] text-white"
                : "border-[#E5ECE8] bg-white text-[#42534d] hover:bg-[#f7faf8] dark:border-[#29433a] dark:bg-[#102821] dark:text-[#d7e6b6] dark:hover:bg-[#15342a]"
            }`}
            data-testid="dashboard-customize-btn"
          >
            <SlidersHorizontal className="w-4 h-4" />
            {customizing ? "Done" : "Customize Dashboard"}
          </button>
        </div>
      </div>

      {customizing && (
        <div className="bg-[#f7faf8] border border-[#E5ECE8] dark:bg-[#102821] dark:border-[#29433a] rounded-2xl p-4 space-y-3">
          <div className="text-xs text-[#667C74] dark:text-[#a2b9af]">Drag by handles to reorder. Remove cards with the X button.</div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="text-sm text-[#42534d] dark:text-[#c8d9d1] mr-2">Add KPI cards:</div>
            {availableKpis.length === 0 && <div className="text-xs text-[#667C74] dark:text-[#a2b9af]">All KPI cards are already added.</div>}
            {availableKpis.map((kpi) => (
              <button
                key={kpi.id}
                type="button"
                onClick={() => addKpi(kpi.id)}
                className="inline-flex items-center gap-1 rounded-full border border-[#d9e7e1] bg-white px-3 py-1.5 text-xs text-[#35584d] hover:bg-[#edf5f1] dark:border-[#2a463d] dark:bg-[#143229] dark:text-[#cde0d7] dark:hover:bg-[#1b3d32]"
              >
                <Plus className="w-3 h-3" />
                {kpi.label}
              </button>
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="text-sm text-[#42534d] dark:text-[#c8d9d1] mr-2">Add dashboard cards:</div>
            {availableCards.length === 0 && <div className="text-xs text-[#667C74] dark:text-[#a2b9af]">All dashboard cards are already added.</div>}
            {availableCards.map((card) => (
              <button
                key={card.id}
                type="button"
                onClick={() => addCard(card.id)}
                className="inline-flex items-center gap-1 rounded-full border border-[#d9e7e1] bg-white px-3 py-1.5 text-xs text-[#35584d] hover:bg-[#edf5f1] dark:border-[#2a463d] dark:bg-[#143229] dark:text-[#cde0d7] dark:hover:bg-[#1b3d32]"
              >
                <Plus className="w-3 h-3" />
                {card.label}
              </button>
            ))}
          </div>
        </div>
      )}

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onKpiDragEnd}>
        <SortableContext items={kpiOrder} strategy={rectSwappingStrategy}>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3" data-testid="dashboard-kpis-grid">
            {kpiOrder.map((kpiId) => {
              const kpi = KPI_CARD_BY_ID[kpiId];
              if (!kpi) return null;
              return (
                <SortableKpiCard
                  key={kpiId}
                  id={kpiId}
                  label={kpi.label}
                  customizing={customizing}
                  removable={kpiOrder.length > 1}
                  onRemove={() => removeKpi(kpiId)}
                >
                  <Metric label={kpi.label} value={kpi.getValue(scopedSummary)} icon={kpi.icon} />
                </SortableKpiCard>
              );
            })}
          </div>
        </SortableContext>
      </DndContext>

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onCardDragEnd}>
        <SortableContext items={cardOrder} strategy={rectSwappingStrategy}>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5" data-testid="dashboard-cards-grid">
            {cardOrder.map((cardId) => {
              const card = DASHBOARD_CARD_BY_ID[cardId];
              if (!card) return null;
              return (
                <SortableDashboardCard
                  key={cardId}
                  id={cardId}
                  className={card.className}
                  label={card.label}
                  customizing={customizing}
                  onRemove={() => removeCard(cardId)}
                  removable={cardOrder.length > 1}
                >
                  {cardContent[cardId]}
                </SortableDashboardCard>
              );
            })}
          </div>
        </SortableContext>
      </DndContext>

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

function SortableKpiCard({ id, label, customizing, removable, onRemove, children }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id,
    disabled: !customizing,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 20 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`relative ${customizing ? "rounded-2xl ring-1 ring-[#dce9e3] dark:ring-[#2b473e]" : ""} ${isDragging ? "opacity-80" : ""}`}
      data-testid={`dashboard-kpi-${id}`}
    >
      {customizing && (
        <div className="absolute top-2 left-2 right-2 z-10 flex items-center justify-between pointer-events-none">
          <button
            type="button"
            className="pointer-events-auto inline-flex items-center gap-1 rounded-full bg-white/95 px-2 py-1 text-[11px] text-[#42534d] border border-[#dbe7e1] dark:bg-[#0f261f] dark:text-[#c8d9d1] dark:border-[#2a463d] cursor-grab active:cursor-grabbing"
            {...attributes}
            {...listeners}
            aria-label={`Drag ${label}`}
          >
              <GripVertical className="w-3.5 h-3.5 text-[#6a8178] dark:text-[#a3b9b0]" />
            <span>{label}</span>
          </button>
          {removable && (
            <button
              type="button"
              onClick={onRemove}
              className="pointer-events-auto w-6 h-6 rounded-full bg-white/95 border border-[#dbe7e1] text-[#6a8178] dark:bg-[#0f261f] dark:border-[#2a463d] dark:text-[#a3b9b0] hover:text-red-600 hover:border-red-200 inline-flex items-center justify-center"
              aria-label={`Remove ${label}`}
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      )}
      {children}
    </div>
  );
}

function SortableDashboardCard({ id, className, label, customizing, removable, onRemove, children }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id,
    disabled: !customizing,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 20 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`${className} relative ${customizing ? "rounded-2xl ring-1 ring-[#dce9e3] dark:ring-[#2b473e]" : ""} ${isDragging ? "opacity-80" : ""}`}
      data-testid={`dashboard-card-${id}`}
    >
      {customizing && (
        <div className="absolute top-2 left-2 right-2 z-10 flex items-center justify-between pointer-events-none">
          <button
            type="button"
            className="pointer-events-auto inline-flex items-center gap-1 rounded-full bg-white/95 px-2 py-1 text-[11px] text-[#42534d] border border-[#dbe7e1] dark:bg-[#0f261f] dark:text-[#c8d9d1] dark:border-[#2a463d] cursor-grab active:cursor-grabbing"
            {...attributes}
            {...listeners}
            aria-label={`Drag ${label}`}
          >
              <GripVertical className="w-3.5 h-3.5 text-[#6a8178] dark:text-[#a3b9b0]" />
            <span>{label}</span>
          </button>
          {removable && (
            <button
              type="button"
              onClick={onRemove}
              className="pointer-events-auto w-6 h-6 rounded-full bg-white/95 border border-[#dbe7e1] text-[#6a8178] dark:bg-[#0f261f] dark:border-[#2a463d] dark:text-[#a3b9b0] hover:text-red-600 hover:border-red-200 inline-flex items-center justify-center"
              aria-label={`Remove ${label}`}
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      )}
      {children}
    </div>
  );
}

function ProposalsCard({ pending }) {
  return (
    <div className="bg-white dark:bg-[#112b23] rounded-2xl border border-[#E5ECE8] dark:border-[#2b473e] p-5 h-full" data-testid="card-proposals">
      <div className="flex items-center justify-between">
        <h3 className="font-display text-lg font-semibold text-[#1C4B3E] dark:text-[#d7e6b6]">Proposals</h3>
        <span className="text-xs px-2 py-1 rounded-full bg-[#eef6f1] text-[#3f7d69] dark:bg-[#1b3a30] dark:text-[#b9d7ca]">Live</span>
      </div>
      <div className="mt-4 text-4xl font-display font-semibold text-[#1C4B3E] dark:text-[#d7e6b6]">{pending}</div>
      <p className="mt-2 text-sm text-[#667C74] dark:text-[#9cb3a9]">Pending proposals that need review or follow-up.</p>
    </div>
  );
}

function NotesCard({ notes, onChange }) {
  return (
    <div className="bg-white dark:bg-[#112b23] rounded-2xl border border-[#E5ECE8] dark:border-[#2b473e] p-5 h-full" data-testid="card-notes">
      <h3 className="font-display text-lg font-semibold text-[#1C4B3E] dark:text-[#d7e6b6]">Notes</h3>
      <p className="text-xs text-[#667C74] dark:text-[#9cb3a9] mt-1 mb-3">Personal dashboard notes are saved automatically.</p>
      <textarea
        value={notes}
        onChange={(e) => onChange(e.target.value)}
        rows={8}
        placeholder="Write reminders, priorities, or quick ideas..."
        className="w-full rounded-xl border border-[#E5ECE8] dark:border-[#2b473e] bg-[#f8fbf9] dark:bg-[#0f261f] px-3 py-2 text-sm text-[#35584d] dark:text-[#d7e6b6] placeholder:text-[#93a89f] dark:placeholder:text-[#7e988e] focus:outline-none focus:ring-2 focus:ring-[#5FA38D]/25 focus:border-[#5FA38D]"
      />
    </div>
  );
}

function Metric({ label, value, icon: Icon }) {
  return (
    <div className="bg-white dark:bg-[#112b23] rounded-2xl border border-[#E5ECE8] dark:border-[#2b473e] p-4 h-full">
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-[#eef6f1] dark:bg-[#1b3a30] flex items-center justify-center text-[#3f7d69] dark:text-[#b9d7ca]">
          <Icon className="w-4 h-4" />
        </div>
        <div className="min-w-0">
          <div className="text-xs text-[#667C74] dark:text-[#9cb3a9] truncate">{label}</div>
          <div className="text-2xl font-semibold text-[#1D2A25] dark:text-[#d7e6b6] mt-0.5 leading-none">{value}</div>
        </div>
      </div>
    </div>
  );
}
