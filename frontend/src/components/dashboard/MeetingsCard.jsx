import { Calendar, Video } from "lucide-react";

function platformBadge(p) {
  if (p === "Zoom") return { color: "bg-blue-50 text-blue-700", label: "Zoom" };
  if (p === "Meet") return { color: "bg-green-50 text-green-700", label: "Meet" };
  return { color: "bg-[#edf3ef] text-[#667C74]", label: p };
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
    <div className="bg-white rounded-2xl border border-[#E5ECE8] p-5 h-full flex flex-col" data-testid="card-meetings">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-display text-lg font-semibold text-[#1D2A25]">My Meetings</h3>
        <button className="w-7 h-7 rounded-full hover:bg-[#f1f5f3] flex items-center justify-center text-[#8EA39B]">
          <Calendar className="w-4 h-4" />
        </button>
      </div>

      <div className="space-y-2 flex-1">
        {meetings.length === 0 && (
          <div className="text-sm text-[#8EA39B] italic py-4">No meetings scheduled.</div>
        )}
        {meetings.slice(0, 4).map((m) => {
          const b = platformBadge(m.platform);
          return (
            <div key={m.id} data-testid={`meeting-${m.id}`} className="flex items-center gap-3 p-2 rounded-lg hover:bg-[#f6faf8] transition-colors">
              <div className="w-9 h-9 rounded-lg bg-[#f2f7f4] flex items-center justify-center text-[#667C74]">
                <Video className="w-4 h-4" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-[#1D2A25] truncate">{m.title}</div>
                <div className="text-xs text-[#8EA39B]">{timeStr(m.starts_at)}</div>
              </div>
              <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${b.color}`}>{b.label}</span>
            </div>
          );
        })}
      </div>

      <button className="text-xs text-[#667C74] hover:text-[#2f6f5a] mt-3 self-end">
        See all meetings →
      </button>
    </div>
  );
}
