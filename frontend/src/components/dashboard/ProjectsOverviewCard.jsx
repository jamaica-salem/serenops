import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts";
import { ArrowUpRight } from "lucide-react";

const COLORS = {
  not_started: "#C5D0CB",
  in_progress: "#5FA38D",
  completed: "#2F6F5A",
};

export default function ProjectsOverviewCard({ summary }) {
  const data = [
    { name: "In Progress", key: "in_progress", value: summary?.in_progress ?? 0 },
    { name: "Completed", key: "completed", value: summary?.completed ?? 0 },
    { name: "Not Started", key: "not_started", value: summary?.not_started ?? 0 },
  ];
  const total = data.reduce((a, b) => a + b.value, 0) || 1;

  return (
    <div className="bg-white dark:bg-[#112b23] rounded-2xl border border-[#E5ECE8] dark:border-[#2b473e] p-5 h-full flex flex-col" data-testid="card-projects-overview">
      <div className="flex items-center justify-between mb-2">
        <h3 className="font-display text-lg font-semibold text-[#1C4B3E] dark:text-[#d7e6b6]">Projects Overview</h3>
        <button className="w-7 h-7 rounded-full hover:bg-[#f1f5f3] dark:hover:bg-[#1b3a30] flex items-center justify-center text-[#8EA39B] dark:text-[#a3b9b0]">
          <ArrowUpRight className="w-4 h-4" />
        </button>
      </div>

      <div className="flex-1 relative flex items-center justify-center min-h-[160px]">
        <ResponsiveContainer width="100%" height={180}>
          <PieChart>
            <Pie
              data={data}
              dataKey="value"
              innerRadius={55}
              outerRadius={75}
              paddingAngle={4}
              cornerRadius={8}
              startAngle={90}
              endAngle={-270}
            >
              {data.map((d) => (
                <Cell key={d.key} fill={COLORS[d.key]} />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <div className="font-display text-2xl font-bold text-[#1D2A25] dark:text-[#d7e6b6]">{total}</div>
          <div className="text-xs text-[#667C74] dark:text-[#9cb3a9]">total</div>
        </div>
      </div>

      <div className="space-y-1.5 text-xs mt-3">
        {data.map((d) => (
          <div key={d.key} className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLORS[d.key] }} />
            <span className="text-[#667C74] dark:text-[#9cb3a9] flex-1">{d.name}</span>
            <span className="font-medium text-[#1D2A25] dark:text-[#d7e6b6]">{d.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
