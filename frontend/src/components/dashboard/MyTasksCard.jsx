import { Plus, Circle, CheckCircle2, Clock } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router-dom";

const STATUS_ICONS = {
  todo: { Icon: Circle, color: "text-gray-400" },
  in_progress: { Icon: Clock, color: "text-blue-500" },
  waiting_for_client: { Icon: Clock, color: "text-amber-500" },
  for_review: { Icon: Clock, color: "text-orange-500" },
  done: { Icon: CheckCircle2, color: "text-green-500" },
  backlog: { Icon: Circle, color: "text-gray-300" },
};

const PROJECT_TINTS = ["#3E6E60", "#2C5568", "#566A4F", "#5C4D66", "#4E6A5E"];

function tintFor(id) {
  if (!id) return "#F3F4F6";
  let s = 0;
  for (let i = 0; i < id.length; i++) s = (s + id.charCodeAt(i)) % PROJECT_TINTS.length;
  return PROJECT_TINTS[s];
}

export default function MyTasksCard({ tasks, onAdd }) {
  const [tab, setTab] = useState("today");

  const todayStr = new Date().toISOString().slice(0, 10);
  const tomorrowStr = new Date(Date.now() + 86400000).toISOString().slice(0, 10);

  const filtered = tasks.filter((t) => {
    if (tab === "today") return !t.due_date || t.due_date <= todayStr || t.status === "in_progress";
    if (tab === "tomorrow") return t.due_date === tomorrowStr;
    return t.due_date && t.due_date < todayStr && t.status !== "done";
  });

  const ongoing = tasks.filter((t) => t.status === "in_progress").length;

  return (
    <div className="rounded-2xl border border-[#1a4136] p-5 h-full flex flex-col bg-[radial-gradient(circle_at_10%_15%,rgba(123,196,164,0.24),transparent_44%),linear-gradient(150deg,#0f2b24_0%,#123c31_100%)] text-[#edf4f1]" data-testid="card-my-tasks">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-display text-lg font-semibold text-white">My Tasks</h3>
        <button
          onClick={onAdd}
          data-testid="add-task-btn"
          className="h-8 px-3 rounded-lg bg-white/10 text-white flex items-center justify-center gap-1 hover:bg-white/20 transition-colors text-xs border border-white/15"
          aria-label="Add task"
        >
          <Plus className="w-4 h-4" />
          New
        </button>
      </div>

      <div className="flex items-center gap-2 mb-3">
        <button
          data-testid="my-tasks-today"
          onClick={() => setTab("today")}
          className={`px-4 py-1.5 text-xs rounded-full transition-colors ${
            tab === "today" ? "bg-white text-[#1D2A25]" : "bg-white/10 text-[#d5e2dc] hover:bg-white/20"
          }`}
        >
          Today
        </button>
        <button
          data-testid="my-tasks-tomorrow"
          onClick={() => setTab("tomorrow")}
          className={`px-4 py-1.5 text-xs rounded-full transition-colors ${
            tab === "tomorrow" ? "bg-white text-[#1D2A25]" : "bg-white/10 text-[#d5e2dc] hover:bg-white/20"
          }`}
        >
          Tomorrow
        </button>
        <button
          data-testid="my-tasks-overdue"
          onClick={() => setTab("overdue")}
          className={`px-4 py-1.5 text-xs rounded-full transition-colors ${
            tab === "overdue" ? "bg-white text-[#1D2A25]" : "bg-white/10 text-[#d5e2dc] hover:bg-white/20"
          }`}
        >
          Overdue
        </button>
      </div>

      <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-white/10 rounded-full text-xs font-medium text-[#e3ece8] mb-4 self-start border border-white/15">
        <span className="w-5 h-5 rounded-full bg-white text-[#1D2A25] flex items-center justify-center text-[10px] font-semibold">{ongoing}</span>
        On Going Tasks
      </div>

      <div className="space-y-3 flex-1 overflow-y-auto pr-1 -mr-1">
        {filtered.length === 0 && (
          <div className="text-sm text-[#c6d6cf] italic py-6 text-center">
            Nothing here. {tab === "today" ? "Enjoy the calm." : "Add a task for tomorrow."}
          </div>
        )}
        {filtered.slice(0, 5).map((t) => {
          const { Icon, color } = STATUS_ICONS[t.status] || STATUS_ICONS.todo;
          return (
            <div
              key={t.id}
              data-testid={`my-task-${t.id}`}
              className="rounded-xl p-3 border border-white/15 bg-white/10"
              style={{ backgroundColor: tintFor(t.project_id) + "55" }}
            >
              <div className="flex items-start gap-2">
                <Icon className={`w-4 h-4 mt-0.5 shrink-0 ${color}`} />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-white leading-snug">{t.title}</div>
                  {t.description && (
                    <div className="text-xs text-[#d6e3dd] mt-0.5 line-clamp-2">{t.description}</div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <Link
        to="/tasks"
        data-testid="my-tasks-see-all"
        className="text-xs text-[#d7e6df] hover:text-white mt-3 self-end"
      >
        See all tasks →
      </Link>
    </div>
  );
}
