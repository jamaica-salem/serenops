import { useEffect, useRef, useState } from "react";
import { Sparkles, X, Send, MessageSquare } from "lucide-react";
import api from "../lib/api";

const QUICK_PROMPTS = [
  "What should I work on today?",
  "Summarize my tasks",
  "Which tasks are overdue?",
];

export default function AIChatPanel() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([
    { role: "ai", text: "Hi! I'm your SerenOps AI. Ask me about your tasks." },
  ]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const sessionRef = useRef(null);
  const scrollRef = useRef(null);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, open]);

  const send = async (text) => {
    const msg = (text ?? input).trim();
    if (!msg || busy) return;
    setMessages((m) => [...m, { role: "user", text: msg }]);
    setInput("");
    setBusy(true);
    try {
      const { data } = await api.post("/chat", { message: msg, session_id: sessionRef.current });
      sessionRef.current = data.session_id;
      setMessages((m) => [...m, { role: "ai", text: data.reply, source: data.source }]);
    } catch (e) {
      setMessages((m) => [...m, { role: "ai", text: "Sorry, I couldn't reach the assistant right now." }]);
    } finally {
      setBusy(false);
    }
  };

  if (!open) {
    return (
      <button
        data-testid="ai-chat-fab"
        onClick={() => setOpen(true)}
        className="fixed bottom-24 right-6 w-14 h-14 rounded-full bg-[#5FA38D] text-white shadow-lg hover:shadow-xl hover:bg-[#4E8C79] transition-all flex items-center justify-center z-[60] group"
        aria-label="Open AI assistant"
      >
        <Sparkles className="w-5 h-5 group-hover:scale-110 transition-transform" />
        <span className="absolute right-full mr-3 bg-gray-900 text-white text-xs px-2 py-1 rounded-md opacity-0 group-hover:opacity-100 transition whitespace-nowrap pointer-events-none">
          Ask SerenOps AI
        </span>
      </button>
    );
  }

  return (
    <div
      className="fixed bottom-24 right-6 w-[360px] max-w-[calc(100vw-2rem)] h-[520px] bg-white rounded-2xl shadow-2xl border border-[#E5ECE8] z-[60] flex flex-col overflow-hidden animate-fade-up"
      data-testid="ai-chat-panel"
    >
      <div className="bg-gradient-to-r from-[#0F2B24] to-[#123C31] px-4 py-3 flex items-center justify-between text-white">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-full bg-white/20 flex items-center justify-center">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <div className="text-sm font-semibold font-display leading-none">SerenOps AI</div>
            <div className="text-[10px] opacity-80">Your project copilot</div>
          </div>
        </div>
        <button
          data-testid="ai-chat-close"
          onClick={() => setOpen(false)}
          className="w-7 h-7 rounded-full hover:bg-white/20 flex items-center justify-center"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3 bg-[#f7faf8]">
        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
            <div
              data-testid={`chat-msg-${m.role}-${i}`}
              className={`max-w-[85%] px-3.5 py-2 text-sm leading-snug whitespace-pre-line ${
                m.role === "user"
                  ? "bg-[#1f332d] text-white rounded-2xl rounded-tr-sm"
                  : "bg-white text-[#31443d] border border-[#E5ECE8] rounded-2xl rounded-tl-sm"
              }`}
            >
              {m.text}
            </div>
          </div>
        ))}
        {busy && (
          <div className="flex justify-start">
            <div className="bg-white border border-[#E5ECE8] rounded-2xl rounded-tl-sm px-3.5 py-2 text-sm text-[#667C74] flex gap-1">
              <span className="w-1.5 h-1.5 bg-[#5FA38D] rounded-full pulse-dot" />
              <span className="w-1.5 h-1.5 bg-[#5FA38D] rounded-full pulse-dot" style={{ animationDelay: "0.2s" }} />
              <span className="w-1.5 h-1.5 bg-[#5FA38D] rounded-full pulse-dot" style={{ animationDelay: "0.4s" }} />
            </div>
          </div>
        )}
      </div>

      {messages.length <= 1 && (
        <div className="px-4 py-2 border-t border-[#E5ECE8] flex flex-wrap gap-1.5 bg-white">
          {QUICK_PROMPTS.map((p) => (
            <button
              key={p}
              data-testid={`chat-quick-${p.slice(0, 8)}`}
              onClick={() => send(p)}
              className="text-[11px] px-2.5 py-1 bg-[#eef6f1] text-[#2f6f5a] border border-[#dbe9e2] rounded-full hover:bg-[#e4f1ea]"
            >
              {p}
            </button>
          ))}
        </div>
      )}

      <form
        onSubmit={(e) => { e.preventDefault(); send(); }}
        className="p-3 border-t border-[#E5ECE8] flex items-center gap-2 bg-white"
      >
        <MessageSquare className="w-4 h-4 text-[#8EA39B]" />
        <input
          data-testid="chat-input"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask anything…"
          className="flex-1 text-sm focus:outline-none bg-transparent"
        />
        <button
          type="submit"
          data-testid="chat-send"
          disabled={busy || !input.trim()}
          className="w-8 h-8 rounded-full bg-[#5FA38D] text-white flex items-center justify-center hover:bg-[#4E8C79] disabled:opacity-50"
        >
          <Send className="w-3.5 h-3.5" />
        </button>
      </form>
    </div>
  );
}
