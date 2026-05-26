import { useEffect, useRef, useState } from "react";
import { Sparkles, Send } from "lucide-react";
import api from "../lib/api";

const QUICK = [
  "What should I work on today?",
  "Summarize my tasks",
  "Which tasks are overdue?",
  "What's my focus this week?",
];

export default function AIAssistantPage() {
  const [messages, setMessages] = useState([
    { role: "ai", text: "Hi! I'm SerenOps AI. I can help you plan your day, summarize tasks, and surface what's overdue." },
  ]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const sessionRef = useRef(null);
  const scrollRef = useRef(null);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages]);

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
    } catch {
      setMessages((m) => [...m, { role: "ai", text: "Sorry, I couldn't reach the assistant right now." }]);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-5 animate-fade-up" data-testid="assistant-page">
      <div>
        <h1 className="font-display text-3xl sm:text-4xl font-bold text-foreground flex items-center gap-2">
          AI Assistant <Sparkles className="w-7 h-7 text-primary" />
        </h1>
        <p className="text-sm text-muted-foreground mt-1">Ask anything about your tasks</p>
      </div>

      <div className="bg-card rounded-2xl border border-border flex flex-col h-[calc(100vh-15rem)] min-h-[460px]">
        <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 space-y-4">
          {messages.map((m, i) => (
            <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[75%] px-4 py-2.5 text-sm leading-snug whitespace-pre-line ${
                m.role === "user"
                  ? "bg-foreground text-white rounded-2xl rounded-tr-sm"
                  : "bg-primary/10 text-foreground border border-primary/20 rounded-2xl rounded-tl-sm"
              }`}>{m.text}</div>
            </div>
          ))}
          {busy && (
            <div className="flex justify-start">
              <div className="bg-primary/10 border border-primary/20 rounded-2xl px-3 py-2 flex gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-primary pulse-dot" />
                <span className="w-1.5 h-1.5 rounded-full bg-primary pulse-dot" style={{ animationDelay: "0.2s" }} />
                <span className="w-1.5 h-1.5 rounded-full bg-primary pulse-dot" style={{ animationDelay: "0.4s" }} />
              </div>
            </div>
          )}
        </div>

        {messages.length <= 1 && (
          <div className="px-6 pb-3 flex flex-wrap gap-2">
            {QUICK.map((q) => (
              <button
                key={q}
                data-testid={`assistant-quick-${q.slice(0, 8)}`}
                onClick={() => send(q)}
                className="text-xs px-3 py-1.5 bg-primary/10 text-primary border border-primary/20 rounded-full hover:bg-primary/15"
              >{q}</button>
            ))}
          </div>
        )}

        <form
          onSubmit={(e) => { e.preventDefault(); send(); }}
          className="border-t border-border/70 p-4 flex items-center gap-3"
        >
          <input
            data-testid="assistant-input"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask about your work…"
            className="flex-1 h-10 px-3 rounded-lg border border-border focus:outline-none focus:ring-2 focus:ring-ring/20 focus:border-ring text-sm"
          />
          <button
            data-testid="assistant-send"
            type="submit"
            disabled={busy || !input.trim()}
            className="h-10 px-4 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 disabled:opacity-50 inline-flex items-center gap-1"
          >
            <Send className="w-4 h-4" /> Send
          </button>
        </form>
      </div>
    </div>
  );
}
