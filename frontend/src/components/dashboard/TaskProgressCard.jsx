const ROWS = [
  { key: "overdue", label: "Overdue", color: "bg-red-500" },
  { key: "in_progress", label: "In Progress", color: "bg-[#7FA8A4]" },
  { key: "completed", label: "Completed", color: "bg-[#6FCF97]" },
  { key: "backlog", label: "Backlog", color: "bg-amber-500" },
];

export default function TaskProgressCard({ summary }) {
  if (!summary) return null;
  const total = Math.max(summary.total_tasks || 1, 1);

  return (
    <div className="bg-white rounded-2xl border border-[#E5ECE8] p-5 h-full" data-testid="card-task-progress">
      <div className="flex items-center justify-between mb-5">
        <h3 className="font-display text-lg font-semibold text-[#1D2A25]">Task Progress Overview</h3>
        <span className="text-xs text-[#667C74]">Across all projects</span>
      </div>

      <div className="space-y-4">
        {ROWS.map((r) => {
          const v = summary[r.key] || 0;
          const pct = Math.min(100, Math.round((v / total) * 100));
          return (
            <div key={r.key} data-testid={`progress-${r.key}`} className="space-y-1.5">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium text-[#42534d]">{r.label}</span>
                <span className="text-[#667C74] text-xs">
                  <span className="text-[#1D2A25] font-semibold">{v}</span> · {pct}%
                </span>
              </div>
              <div className="h-2 rounded-full bg-[#edf3ef] overflow-hidden">
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
