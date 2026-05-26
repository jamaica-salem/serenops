import { ArrowRight } from "lucide-react";

const STATUS_CHIP = {
  todo: "bg-gray-100 text-gray-700",
  in_progress: "bg-blue-50 text-blue-700",
  waiting_for_client: "bg-amber-50 text-amber-700",
  for_review: "bg-orange-50 text-orange-700",
  done: "bg-green-50 text-green-700",
  backlog: "bg-amber-50 text-amber-700",
};

export default function OpenTicketsCard({ tasks = [], users = [] }) {
  const open = tasks.filter((t) => t.status !== "done").slice(0, 6);
  const userById = Object.fromEntries(users.map((u) => [u.id, u]));

  return (
    <div className="bg-white rounded-2xl border border-[#E5ECE8] p-5" data-testid="card-open-tickets">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-display text-lg font-semibold text-[#1C4B3E] dark:text-[#d7e6b6]">Open Tickets</h3>
        <span className="text-xs text-[#667C74]">{open.length} open</span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
        {open.map((t) => {
          const u = userById[t.assignee_id];
          return (
            <div
              key={t.id}
              data-testid={`ticket-${t.id}`}
              className="p-4 rounded-xl border border-[#E5ECE8] hover:border-[#d2e0d9] hover:shadow-sm transition-all bg-[#f8fbf9]"
            >
              <div className="flex items-center gap-3 mb-3">
                <img
                  src={u?.avatar_url || "https://images.unsplash.com/photo-1758518729459-235dcaadc611?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NjY2NzF8MHwxfHNlYXJjaHwzfHxwcm9mZXNzaW9uYWwlMjBwb3J0cmFpdCUyMHNtaWxpbmclMjBmYWNlfGVufDB8fHx8MTc3NzQyNzEzMXww&ixlib=rb-4.1.0&q=85"}
                  alt={u?.name}
                  className="w-9 h-9 rounded-full object-cover"
                />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-[#1D2A25] truncate">{u?.name || "Unassigned"}</div>
                  <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${STATUS_CHIP[t.status] || STATUS_CHIP.todo}`}>
                    {t.status.replace("_", " ")}
                  </span>
                </div>
              </div>
              <div className="text-sm text-[#2b3a35] line-clamp-2 mb-3 min-h-[40px]">{t.title}</div>
              <button className="inline-flex items-center gap-1 text-xs font-medium text-[#2f6f5a] hover:text-[#255342]">
                View <ArrowRight className="w-3 h-3" />
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
