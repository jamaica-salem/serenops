import { useEffect, useState } from "react";
import { Sparkles, Save, KeyRound } from "lucide-react";
import api from "../lib/api";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { Input } from "../components/ui/input";
import { Button } from "../components/ui/button";

const PROVIDERS = [
  { value: "openai", label: "OpenAI", desc: "GPT-5.x family" },
  { value: "anthropic", label: "Anthropic", desc: "Claude Sonnet / Opus" },
  { value: "gemini", label: "Google Gemini", desc: "Gemini 2.5 / 3.x" },
  { value: "custom", label: "Custom (OpenAI-compatible)", desc: "Self-hosted · Ollama · LiteLLM" },
];

const MODEL_SUGGESTIONS = {
  openai: ["gpt-5.1", "gpt-5", "gpt-4o-mini", "gpt-4.1"],
  anthropic: ["claude-sonnet-4-5-20250929", "claude-haiku-4-5-20251001"],
  gemini: ["gemini-2.5-flash", "gemini-3-flash-preview", "gemini-2.5-pro"],
  custom: ["llama3", "mistral"],
};

export default function SettingsPage() {
  const [cfg, setCfg] = useState({ provider: "openai", model: "gpt-5.1", api_key: "", base_url: "" });
  const [hasCustomKey, setHasCustomKey] = useState(false);
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    api.get("/llm-config").then(({ data }) => {
      setCfg({
        provider: data.provider,
        model: data.model,
        api_key: "",
        base_url: data.base_url || "",
      });
      setHasCustomKey(data.has_custom_key);
    }).catch((e) => {
      if (e?.response?.status !== 401) console.error("LLM config load failed:", e);
    });
  }, []);

  const save = async () => {
    setBusy(true);
    try {
      const payload = { provider: cfg.provider, model: cfg.model };
      if (cfg.api_key) payload.api_key = cfg.api_key;
      if (cfg.provider === "custom" && cfg.base_url) payload.base_url = cfg.base_url;
      await api.put("/llm-config", payload);
      setSaved(true);
      if (cfg.api_key) setHasCustomKey(true);
      setCfg({ ...cfg, api_key: "" });
      setTimeout(() => setSaved(false), 2200);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-up max-w-3xl" data-testid="settings-page">
      <div>
        <p className="text-sm text-gray-500">Configure your AI assistant</p>
        <h1 className="font-display text-3xl sm:text-4xl font-bold text-gray-900">Settings</h1>
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 p-6">
        <div className="flex items-start gap-4 mb-6">
          <div className="w-10 h-10 rounded-lg bg-orange-50 text-orange-600 flex items-center justify-center">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <h2 className="font-display text-lg font-semibold text-gray-900">AI Provider</h2>
            <p className="text-sm text-gray-500">Choose the LLM behind SerenOps AI and configure your own provider key.</p>
          </div>
        </div>

        <div className="space-y-5">
          <div>
            <label className="text-xs font-medium text-gray-600 uppercase tracking-wider">Provider</label>
            <div className="grid sm:grid-cols-2 gap-2 mt-2">
              {PROVIDERS.map((p) => (
                <button
                  key={p.value}
                  data-testid={`provider-${p.value}`}
                  onClick={() => setCfg({ ...cfg, provider: p.value, model: MODEL_SUGGESTIONS[p.value][0] })}
                  className={`text-left rounded-xl border p-3 transition-all ${
                    cfg.provider === p.value
                      ? "border-orange-500 bg-orange-50/40 ring-2 ring-orange-500/10"
                      : "border-gray-200 hover:border-gray-300"
                  }`}
                >
                  <div className="font-medium text-sm text-gray-900">{p.label}</div>
                  <div className="text-xs text-gray-500">{p.desc}</div>
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-gray-600 uppercase tracking-wider">Model</label>
            <Select value={cfg.model} onValueChange={(v) => setCfg({ ...cfg, model: v })}>
              <SelectTrigger data-testid="settings-model" className="mt-2 max-w-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                {(MODEL_SUGGESTIONS[cfg.provider] || []).map((m) => (
                  <SelectItem key={m} value={m}>{m}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input
              data-testid="settings-model-custom"
              value={cfg.model}
              onChange={(e) => setCfg({ ...cfg, model: e.target.value })}
              placeholder="…or enter a custom model name"
              className="mt-2 max-w-xs"
            />
          </div>

          {cfg.provider === "custom" && (
            <div>
              <label className="text-xs font-medium text-gray-600 uppercase tracking-wider">Base URL</label>
              <Input
                data-testid="settings-base-url"
                value={cfg.base_url}
                onChange={(e) => setCfg({ ...cfg, base_url: e.target.value })}
                placeholder="https://your-llm-endpoint/v1"
                className="mt-2"
              />
            </div>
          )}

          <div>
            <label className="text-xs font-medium text-gray-600 uppercase tracking-wider flex items-center gap-1.5">
              <KeyRound className="w-3.5 h-3.5" /> API Key
            </label>
            <Input
              data-testid="settings-api-key"
              type="password"
              value={cfg.api_key}
              onChange={(e) => setCfg({ ...cfg, api_key: e.target.value })}
              placeholder={hasCustomKey ? "•••••••• (saved)  — paste new key to replace" : "Paste your API key"}
              className="mt-2 font-mono text-sm"
            />
            <p className="text-xs text-gray-500 mt-1">
              Keys are stored server-side per user. Leave blank to keep the existing one.
            </p>
          </div>

          <div className="pt-4 border-t border-gray-100 flex items-center gap-3">
            <Button
              data-testid="settings-save"
              onClick={save}
              disabled={busy}
              className="bg-orange-600 hover:bg-orange-700 text-white"
            >
              <Save className="w-4 h-4 mr-1" /> {busy ? "Saving…" : "Save settings"}
            </Button>
            {saved && <span className="text-sm text-green-700" data-testid="settings-saved">Saved ✓</span>}
          </div>
        </div>
      </div>
    </div>
  );
}
