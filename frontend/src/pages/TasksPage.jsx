import { useEffect, useState } from "react";
import { useLocation, useNavigate, useOutletContext } from "react-router-dom";
import { Plus, List, LayoutGrid, Trash2, Pencil } from "lucide-react";
import {
  DndContext, PointerSensor, useSensor, useSensors,
  DragOverlay, closestCenter,
} from "@dnd-kit/core";
import {
  SortableContext, useSortable, verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { useDroppable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import api from "../lib/api";
import TaskFormDialog from "../components/TaskFormDialog";

const STATUS_LABEL = {
  todo: "Todo",
  in_progress: "In Progress",
  waiting_for_client: "Waiting for Client",
  for_review: "For Review",
  done: "Done",
  backlog: "Backlog",
};
const STATUS_CHIP = {
  todo: "bg-muted text-foreground",
  in_progress: "bg-sky-500/10 text-sky-700 dark:text-sky-400",
  waiting_for_client: "bg-amber-500/10 text-amber-700 dark:text-amber-400",
  for_review: "bg-primary/10 text-primary",
  done: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
  backlog: "bg-amber-500/10 text-amber-700 dark:text-amber-400",
};
const PRIORITY_CHIP = {
  low: "bg-muted text-muted-foreground",
  medium: "bg-sky-500/10 text-sky-700 dark:text-sky-400",
  high: "bg-amber-500/10 text-amber-700 dark:text-amber-400",
  urgent: "bg-destructive/10 text-destructive",
};
const COL_DOT = {
  todo: "bg-muted-foreground",
  in_progress: "bg-sky-500/100",
  waiting_for_client: "bg-amber-500",
  for_review: "bg-primary",
  done: "bg-emerald-500/100",
  backlog: "bg-amber-500",
};
const COLUMNS = ["todo", "in_progress", "waiting_for_client", "for_review", "done", "backlog"];

function KanbanCard({ task, onEdit }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: task.id,
    data: { type: "task", status: task.status },
  });
  const style = {
    transform: CSS.Translate.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };
  return (
    <div
      ref={setNodeRef}
      style={style}
      data-testid={`kanban-card-${task.id}`}
      className="bg-card rounded-lg p-3 border border-border/70 hover:shadow-sm transition group cursor-grab active:cursor-grabbing"
      {...attributes}
      {...listeners}
    >
      <div className="text-sm font-medium text-foreground mb-1">{task.title}</div>
      {task.description && <div className="text-xs text-muted-foreground line-clamp-2 mb-2">{task.description}</div>}
      <div className="flex items-center gap-1.5">
        <span className={`text-[10px] px-1.5 py-0.5 rounded ${PRIORITY_CHIP[task.priority]}`}>{task.priority}</span>
        {task.due_date && <span className="text-[10px] text-muted-foreground">{task.due_date}</span>}
        <button
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => { e.stopPropagation(); onEdit(task); }}
          className="ml-auto text-muted-foreground/70 hover:text-foreground"
        ><Pencil className="w-3 h-3" /></button>
      </div>
    </div>
  );
}

function KanbanColumn({ id, items, onEdit }) {
  const { setNodeRef, isOver } = useDroppable({ id, data: { type: "column", status: id } });
  return (
    <div
      ref={setNodeRef}
      data-testid={`kanban-col-${id}`}
      className={`bg-muted/50 rounded-xl p-3 border transition-colors ${
        isOver ? "border-primary/50 bg-primary/10" : "border-border/70"
      }`}
    >
      <div className="flex items-center justify-between mb-3 px-1">
        <div className="flex items-center gap-2">
          <span className={`w-2 h-2 rounded-full ${COL_DOT[id]}`} />
          <span className="font-display text-sm font-semibold text-foreground">{STATUS_LABEL[id]}</span>
        </div>
        <span className="text-xs text-muted-foreground">{items.length}</span>
      </div>
      <SortableContext items={items.map((t) => t.id)} strategy={verticalListSortingStrategy}>
        <div className="space-y-2 min-h-[200px]">
          {items.map((t) => <KanbanCard key={t.id} task={t} onEdit={onEdit} />)}
          {items.length === 0 && (
            <div className="text-xs text-muted-foreground/80 italic text-center py-6 border-2 border-dashed border-border rounded-lg">
              Drop here
            </div>
          )}
        </div>
      </SortableContext>
    </div>
  );
}

export default function TasksPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const { search } = useOutletContext();
  const [tasks, setTasks] = useState([]);
  const [projects, setProjects] = useState([]);
  const [clients, setClients] = useState([]);
  const [users, setUsers] = useState([]);
  const [view, setView] = useState("list");
  const [editing, setEditing] = useState(null);
  const [open, setOpen] = useState(false);
  const [filter, setFilter] = useState("all");
  const [activeTask, setActiveTask] = useState(null);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }));

  const load = async () => {
    try {
      const [t, p, u, c] = await Promise.all([
        api.get("/tasks"), api.get("/projects"), api.get("/users"), api.get("/clients"),
      ]);
      setTasks(t.data);
      setProjects(p.data);
      setUsers(u.data);
      setClients(c.data);
    } catch (e) {
      if (e?.response?.status !== 401) console.error("Tasks load failed:", e);
    }
  };

  useEffect(() => { load(); }, []);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get("new") === "1") {
      setEditing(null);
      setOpen(true);
      navigate("/tasks", { replace: true });
    }
  }, [location.search, navigate]);

  const remove = async (id) => {
    if (!confirm("Delete this task?")) return;
    await api.delete(`/tasks/${id}`);
    load();
  };

  const moveStatus = async (id, status) => {
    setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, status } : t)));
    try {
      await api.patch(`/tasks/${id}`, { status });
    } catch {
      load();
    }
  };

  const onDragStart = (e) => {
    const id = e.active.id;
    setActiveTask(tasks.find((t) => t.id === id) || null);
  };

  const onDragEnd = (e) => {
    setActiveTask(null);
    const { active, over } = e;
    if (!over) return;
    const draggedId = active.id;
    const dragged = tasks.find((t) => t.id === draggedId);
    if (!dragged) return;

    // dropping on column → use column id directly
    let targetStatus = null;
    if (over.data?.current?.type === "column") {
      targetStatus = over.data.current.status;
    } else if (over.data?.current?.type === "task") {
      targetStatus = over.data.current.status;
    } else if (COLUMNS.includes(over.id)) {
      targetStatus = over.id;
    }
    if (!targetStatus || targetStatus === dragged.status) return;
    moveStatus(draggedId, targetStatus);
  };

  let visible = tasks;
  if (filter !== "all") visible = visible.filter((t) => t.status === filter);
  if (search) visible = visible.filter((t) => t.title.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="space-y-5 animate-fade-up" data-testid="tasks-page">
      <div className="flex items-end justify-between flex-wrap gap-4">
        <div>
          <h1 className="font-display text-3xl sm:text-4xl font-bold text-foreground">Tasks</h1>
          <p className="text-sm text-muted-foreground mt-1">Plan and track every task</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex bg-muted rounded-full p-1">
            <button
              data-testid="tasks-view-list"
              onClick={() => setView("list")}
              className={`px-3 py-1.5 text-xs rounded-full flex items-center gap-1 ${view === "list" ? "bg-card shadow-sm text-foreground" : "text-muted-foreground"}`}
            >
              <List className="w-3.5 h-3.5" /> List
            </button>
            <button
              data-testid="tasks-view-kanban"
              onClick={() => setView("kanban")}
              className={`px-3 py-1.5 text-xs rounded-full flex items-center gap-1 ${view === "kanban" ? "bg-card shadow-sm text-foreground" : "text-muted-foreground"}`}
            >
              <LayoutGrid className="w-3.5 h-3.5" /> Kanban
            </button>
          </div>
          <button
            data-testid="tasks-add-btn"
            onClick={() => { setEditing(null); setOpen(true); }}
            className="bg-primary hover:bg-primary/90 text-primary-foreground text-sm px-4 h-9 rounded-lg inline-flex items-center gap-1 transition"
          >
            <Plus className="w-4 h-4" /> Add Task
          </button>
        </div>
      </div>

      {view === "list" && (
        <>
          <div className="flex items-center gap-1 flex-wrap">
            {["all", ...COLUMNS].map((s) => (
              <button
                key={s}
                data-testid={`tasks-filter-${s}`}
                onClick={() => setFilter(s)}
                className={`text-xs px-3 py-1.5 rounded-full ${filter === s ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/80"}`}
              >
                {s === "all" ? "All" : STATUS_LABEL[s]}
              </button>
            ))}
          </div>

          <div className="bg-card rounded-2xl border border-border overflow-hidden">
            <table className="w-full text-sm">
              <thead className="text-xs uppercase tracking-wider text-muted-foreground border-b border-border/70">
                <tr>
                  <th className="text-left px-5 py-3">Title</th>
                  <th className="text-left px-3 py-3">Status</th>
                  <th className="text-left px-3 py-3">Priority</th>
                  <th className="text-left px-3 py-3">Assignee</th>
                  <th className="text-left px-3 py-3">Due</th>
                  <th className="text-left px-3 py-3">Project</th>
                  <th className="px-3 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {visible.map((t) => {
                  const proj = projects.find((p) => p.id === t.project_id);
                  const u = users.find((x) => x.id === t.assignee_id);
                  return (
                    <tr key={t.id} data-testid={`task-row-${t.id}`} className="border-b border-border/50 hover:bg-muted/50/50">
                      <td className="px-5 py-3">
                        <div className="font-medium text-foreground">{t.title}</div>
                        {t.description && <div className="text-xs text-muted-foreground line-clamp-1">{t.description}</div>}
                      </td>
                      <td className="px-3 py-3">
                        <span className={`text-[11px] px-2 py-0.5 rounded-full ${STATUS_CHIP[t.status]}`}>{STATUS_LABEL[t.status]}</span>
                      </td>
                      <td className="px-3 py-3">
                        <span className={`text-[11px] px-2 py-0.5 rounded-full ${PRIORITY_CHIP[t.priority]}`}>{t.priority}</span>
                      </td>
                      <td className="px-3 py-3">
                        {u ? (
                          <div className="flex items-center gap-2">
                            <img src={u.avatar_url} alt={u.name} className="w-6 h-6 rounded-full object-cover" />
                            <span className="text-xs text-foreground">{u.name.split(" ")[0]}</span>
                          </div>
                        ) : <span className="text-xs text-muted-foreground/80">—</span>}
                      </td>
                      <td className="px-3 py-3 text-muted-foreground">{t.due_date || "—"}</td>
                      <td className="px-3 py-3">
                        {proj ? (
                          <span className="inline-flex items-center gap-1.5 text-xs text-foreground">
                            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: proj.color }} />
                            {proj.name}
                          </span>
                        ) : <span className="text-xs text-muted-foreground/80">—</span>}
                      </td>
                      <td className="px-3 py-3 text-right whitespace-nowrap">
                        <button
                          data-testid={`task-edit-${t.id}`}
                          onClick={() => { setEditing(t); setOpen(true); }}
                          className="p-1.5 text-muted-foreground/80 hover:text-foreground hover:bg-muted rounded"
                        ><Pencil className="w-3.5 h-3.5" /></button>
                        <button
                          data-testid={`task-delete-${t.id}`}
                          onClick={() => remove(t.id)}
                          className="p-1.5 text-muted-foreground/80 hover:text-destructive hover:bg-destructive/10 rounded ml-1"
                        ><Trash2 className="w-3.5 h-3.5" /></button>
                      </td>
                    </tr>
                  );
                })}
                {visible.length === 0 && (
                  <tr><td colSpan={7} className="text-center text-muted-foreground/80 py-12 text-sm italic">No tasks match.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      )}

      {view === "kanban" && (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={onDragStart}
          onDragEnd={onDragEnd}
        >
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {COLUMNS.map((col) => (
              <KanbanColumn
                key={col}
                id={col}
                items={visible.filter((t) => t.status === col)}
                onEdit={(t) => { setEditing(t); setOpen(true); }}
              />
            ))}
          </div>
          <DragOverlay>
            {activeTask ? (
              <div className="bg-card rounded-lg p-3 border border-primary/40 shadow-lg w-72 cursor-grabbing">
                <div className="text-sm font-medium text-foreground">{activeTask.title}</div>
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>
      )}

      <TaskFormDialog
        open={open}
        onOpenChange={setOpen}
        task={editing}
        projects={projects}
        clients={clients}
        users={users}
        onSaved={load}
      />
    </div>
  );
}
