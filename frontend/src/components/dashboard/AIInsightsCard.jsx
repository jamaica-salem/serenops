import { Sparkles, Lightbulb } from "lucide-react";

export default function AIInsightsCard({ insights = [] }) {
  return (
    <div
      className="ai-glow rounded-2xl p-5 h-full flex flex-col"
      data-testid="card-ai-insights"
    >
      <div className="flex items-center gap-2 mb-4">
        <div className="w-8 h-8 rounded-lg bg-orange-600 text-white flex items-center justify-center">
          <Sparkles className="w-4 h-4" />
        </div>
        <h3 className="font-display text-lg font-semibold text-gray-900">AI Insights</h3>
      </div>

      <div className="space-y-3 flex-1">
        {insights.length === 0 && (
          <div className="text-sm text-gray-500 italic">Generating insights…</div>
        )}
        {insights.map((text, i) => (
          <div
            key={i}
            data-testid={`ai-insight-${i}`}
            className="flex items-start gap-2 bg-white rounded-lg p-3 border border-orange-100/70 animate-fade-up"
            style={{ animationDelay: `${i * 80}ms` }}
          >
            <Lightbulb className="w-4 h-4 text-orange-600 shrink-0 mt-0.5" />
            <span className="text-sm text-gray-800 leading-snug">{text}</span>
          </div>
        ))}
      </div>

      <div className="text-[10px] uppercase tracking-widest text-orange-700/80 mt-3 font-semibold">
        Powered by Panze AI
      </div>
    </div>
  );
}
