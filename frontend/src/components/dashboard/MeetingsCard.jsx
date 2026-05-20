import { Calendar, Video } from "lucide-react";

function platformBadge(p) {
  if (p === "Zoom") return { color: "bg-blue-50 text-blue-700", label: "Zoom" };
  if (p === "Meet") return { color: "bg-green-50 text-green-700", label: "Meet" };
  return { color: "bg-gray-100 text-gray-700", label: p };
}

function timeStr(iso) {
  try {
    const d = new Date(iso);
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  } catch {
    return "—";
  }
}

export default function MeetingsCard({ meetings = [] }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-5 h-full flex flex-col" data-testid="card-meetings">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-display text-lg font-semibold text-gray-900">My Meetings</h3>
        <button className="w-7 h-7 rounded-full hover:bg-gray-100 flex items-center justify-center text-gray-400">
          <Calendar className="w-4 h-4" />
        </button>
      </div>

      <div className="space-y-2 flex-1">
        {meetings.length === 0 && (
          <div className="text-sm text-gray-400 italic py-4">No meetings scheduled.</div>
        )}
        {meetings.slice(0, 4).map((m) => {
          const b = platformBadge(m.platform);
          return (
            <div key={m.id} data-testid={`meeting-${m.id}`} className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 transition-colors">
              <div className="w-9 h-9 rounded-lg bg-gray-100 flex items-center justify-center text-gray-500">
                <Video className="w-4 h-4" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-gray-900 truncate">{m.title}</div>
                <div className="text-xs text-gray-500">{timeStr(m.starts_at)}</div>
              </div>
              <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${b.color}`}>{b.label}</span>
            </div>
          );
        })}
      </div>

      <button className="text-xs text-gray-500 hover:text-orange-700 mt-3 self-end">
        See all meetings →
      </button>
    </div>
  );
}
