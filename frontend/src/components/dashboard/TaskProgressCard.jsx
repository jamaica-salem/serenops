const ROWS = [
  { key: "overdue", label: "Overdue", color: "bg-red-500" },
  { key: "in_progress", label: "In Progress", color: "bg-blue-500" },
  { key: "completed", label: "Completed", color: "bg-green-500" },
  { key: "backlog", label: "Backlog", color: "bg-amber-500" },
];

export default function TaskProgressCard({ summary }) {
  if (!summary) return null;
  const total = Math.max(summary.total_tasks || 1, 1);

  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-5 h-full" data-testid="card-task-progress">
      <div className="flex items-center justify-between mb-5">
        <h3 className="font-display text-lg font-semibold text-gray-900">Task Progress Overview</h3>
        <span className="text-xs text-gray-500">Across all projects</span>
      </div>

      <div className="space-y-4">
        {ROWS.map((r) => {
          const v = summary[r.key] || 0;
          const pct = Math.min(100, Math.round((v / total) * 100));
          return (
            <div key={r.key} data-testid={`progress-${r.key}`} className="space-y-1.5">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium text-gray-700">{r.label}</span>
                <span className="text-gray-500 text-xs">
                  <span className="text-gray-900 font-semibold">{v}</span> · {pct}%
                </span>
              </div>
              <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
                <div
                  className={`h-full ${r.color} rounded-full transition-all duration-700`}
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
