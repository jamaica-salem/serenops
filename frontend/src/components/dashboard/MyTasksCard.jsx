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

const PROJECT_TINTS = ["#FFEDD5", "#DBEAFE", "#FCE7F3", "#D1FAE5", "#EDE9FE"];

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
    return t.due_date === tomorrowStr;
  });

  const ongoing = tasks.filter((t) => t.status === "in_progress").length;

  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-5 h-full flex flex-col" data-testid="card-my-tasks">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-display text-lg font-semibold text-gray-900">My Tasks</h3>
        <button
          onClick={onAdd}
          data-testid="add-task-btn"
          className="w-8 h-8 rounded-full bg-gray-900 text-white flex items-center justify-center hover:bg-gray-700 transition-colors"
          aria-label="Add task"
        >
          <Plus className="w-4 h-4" />
        </button>
      </div>

      <div className="flex items-center gap-2 mb-3">
        <button
          data-testid="my-tasks-today"
          onClick={() => setTab("today")}
          className={`px-4 py-1.5 text-xs rounded-full transition-colors ${
            tab === "today" ? "bg-gray-900 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
          }`}
        >
          Today
        </button>
        <button
          data-testid="my-tasks-tomorrow"
          onClick={() => setTab("tomorrow")}
          className={`px-4 py-1.5 text-xs rounded-full transition-colors ${
            tab === "tomorrow" ? "bg-gray-900 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
          }`}
        >
          Tomorrow
        </button>
      </div>

      <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-gray-50 rounded-full text-xs font-medium text-gray-700 mb-4 self-start border border-gray-100">
        <span className="w-5 h-5 rounded-full bg-gray-900 text-white flex items-center justify-center text-[10px]">{ongoing}</span>
        On Going Tasks
      </div>

      <div className="space-y-3 flex-1 overflow-y-auto pr-1 -mr-1">
        {filtered.length === 0 && (
          <div className="text-sm text-gray-400 italic py-6 text-center">
            Nothing here. {tab === "today" ? "Enjoy the calm." : "Add a task for tomorrow."}
          </div>
        )}
        {filtered.slice(0, 5).map((t) => {
          const { Icon, color } = STATUS_ICONS[t.status] || STATUS_ICONS.todo;
          return (
            <div
              key={t.id}
              data-testid={`my-task-${t.id}`}
              className="rounded-xl p-3 border border-gray-100"
              style={{ backgroundColor: tintFor(t.project_id) + "55" }}
            >
              <div className="flex items-start gap-2">
                <Icon className={`w-4 h-4 mt-0.5 shrink-0 ${color}`} />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-gray-900 leading-snug">{t.title}</div>
                  {t.description && (
                    <div className="text-xs text-gray-600 mt-0.5 line-clamp-2">{t.description}</div>
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
        className="text-xs text-gray-500 hover:text-orange-700 mt-3 self-end"
      >
        See all tasks →
      </Link>
    </div>
  );
}
