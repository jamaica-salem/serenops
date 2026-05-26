import { Sparkles, Lightbulb } from "lucide-react";

export default function AIInsightsCard({ insights = [] }) {
  return (
    <div
      className="ai-glow rounded-2xl p-5 h-full flex flex-col dark:bg-[#112b23] dark:border dark:border-[#2b473e]"
      data-testid="card-ai-insights"
    >
      <div className="flex items-center gap-2 mb-4">
        <div className="w-8 h-8 rounded-lg bg-[#e6f4ec] text-[#2f6f5a] flex items-center justify-center">
          <Sparkles className="w-4 h-4" />
        </div>
        <h3 className="font-display text-lg font-semibold text-[#1C4B3E] dark:text-[#d7e6b6]">AI Insights</h3>
      </div>

      <div className="space-y-3 flex-1">
        {insights.length === 0 && (
          <div className="text-sm text-[#667C74] dark:text-[#a2b9af] italic">Generating insights…</div>
        )}
        {insights.map((text, i) => (
          <div
            key={i}
            data-testid={`ai-insight-${i}`}
            className="flex items-start gap-2 bg-white dark:bg-[#0f261f] rounded-lg p-3 border border-[#E5ECE8] dark:border-[#2b473e] animate-fade-up"
            style={{ animationDelay: `${i * 80}ms` }}
          >
            <Lightbulb className="w-4 h-4 text-[#4E8C79] shrink-0 mt-0.5" />
            <span className="text-sm text-[#34453f] dark:text-[#cde0d7] leading-snug">{text}</span>
          </div>
        ))}
      </div>

      <div className="text-[10px] uppercase tracking-widest text-[#4E8C79] dark:text-[#9dc8b8] mt-3 font-semibold">
        Powered by SerenOps AI
      </div>
    </div>
  );
}
