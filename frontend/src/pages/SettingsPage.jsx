import { useEffect, useState } from "react";
import { Sparkles, Save, KeyRound, Database, Trash2, FolderPlus, AlertTriangle, CheckCircle2, RefreshCw } from "lucide-react";
import api, { formatApiError } from "../lib/api";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { Input } from "../components/ui/input";
import { Button } from "../components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "../components/ui/alert-dialog";

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

  // Sample Data State
  const [sampleLoading, setSampleLoading] = useState(false);
  const [sampleClearing, setSampleClearing] = useState(false);
  const [sampleFeedback, setSampleFeedback] = useState(null);
  const [confirmClearOpen, setConfirmClearOpen] = useState(false);

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

  const handleLoadSampleData = async () => {
    setSampleLoading(true);
    setSampleFeedback(null);
    try {
      const res = await api.post("/sample-data/load");
      setSampleFeedback({
        type: "success",
        message: res?.data?.message || "Sample data loaded successfully!",
      });
    } catch (err) {
      setSampleFeedback({
        type: "error",
        message: formatApiError(err?.response?.data?.detail) || "Failed to load sample data.",
      });
    } finally {
      setSampleLoading(false);
    }
  };

  const handleRemoveSampleData = async () => {
    setConfirmClearOpen(false);
    setSampleClearing(true);
    setSampleFeedback(null);
    try {
      const res = await api.delete("/sample-data/clear");
      setSampleFeedback({
        type: "success",
        message: res?.data?.message || "Sample data removed successfully!",
      });
    } catch (err) {
      setSampleFeedback({
        type: "error",
        message: formatApiError(err?.response?.data?.detail) || "Failed to remove sample data.",
      });
    } finally {
      setSampleClearing(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-up max-w-3xl" data-testid="settings-page">
      <div>
        <h1 className="font-display text-3xl sm:text-4xl font-bold text-foreground">Settings</h1>
        <p className="text-sm text-muted-foreground mt-1">Configure your AI assistant & workspace data</p>
      </div>

      {/* AI Provider Section */}
      <div className="bg-card rounded-2xl border border-border p-6">
        <div className="flex items-start gap-4 mb-6">
          <div className="w-10 h-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <h2 className="font-display text-lg font-semibold text-foreground">AI Provider</h2>
            <p className="text-sm text-muted-foreground">Choose the LLM behind SerenOps AI and configure your own provider key.</p>
          </div>
        </div>

        <div className="space-y-5">
          <div>
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Provider</label>
            <div className="grid sm:grid-cols-2 gap-2 mt-2">
              {PROVIDERS.map((p) => (
                <button
                  key={p.value}
                  data-testid={`provider-${p.value}`}
                  onClick={() => setCfg({ ...cfg, provider: p.value, model: MODEL_SUGGESTIONS[p.value][0] })}
                  className={`text-left rounded-xl border p-3 transition-all ${
                    cfg.provider === p.value
                      ? "border-ring bg-primary/10 ring-2 ring-ring/10"
                      : "border-border hover:border-border"
                  }`}
                >
                  <div className="font-medium text-sm text-foreground">{p.label}</div>
                  <div className="text-xs text-muted-foreground">{p.desc}</div>
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Model</label>
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
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Base URL</label>
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
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
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
            <p className="text-xs text-muted-foreground mt-1">
              Keys are stored server-side per user. Leave blank to keep the existing one.
            </p>
          </div>

          <div className="pt-4 border-t border-border/70 flex items-center gap-3">
            <Button
              data-testid="settings-save"
              onClick={save}
              disabled={busy}
              className="bg-primary hover:bg-primary/90 text-white"
            >
              <Save className="w-4 h-4 mr-1" /> {busy ? "Saving…" : "Save settings"}
            </Button>
            {saved && <span className="text-sm text-emerald-700 dark:text-emerald-400" data-testid="settings-saved">Saved ✓</span>}
          </div>
        </div>
      </div>

      {/* Demo & Sample Data Management Section */}
      <div className="bg-card rounded-2xl border border-border p-6" data-testid="sample-data-section">
        <div className="flex items-start gap-4 mb-6">
          <div className="w-10 h-10 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
            <Database className="w-5 h-5" />
          </div>
          <div>
            <h2 className="font-display text-lg font-semibold text-foreground">Sample Data Management</h2>
            <p className="text-sm text-muted-foreground">
              Populate SerenOps with realistic demo clients, projects, tasks, proposals, contracts, and invoices to explore features, or remove sample data anytime.
            </p>
          </div>
        </div>

        {sampleFeedback && (
          <div
            data-testid="sample-data-feedback"
            className={`p-3.5 rounded-xl text-sm flex items-center gap-2.5 mb-5 ${
              sampleFeedback.type === "success"
                ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20"
                : "bg-destructive/10 text-destructive border border-destructive/20"
            }`}
          >
            {sampleFeedback.type === "success" ? (
              <CheckCircle2 className="w-4 h-4 shrink-0" />
            ) : (
              <AlertTriangle className="w-4 h-4 shrink-0" />
            )}
            <span>{sampleFeedback.message}</span>
          </div>
        )}

        <div className="flex flex-wrap items-center gap-3 pt-2">
          <Button
            data-testid="load-sample-data-btn"
            onClick={handleLoadSampleData}
            disabled={sampleLoading || sampleClearing}
            className="bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-2"
          >
            {sampleLoading ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <FolderPlus className="w-4 h-4" />
            )}
            {sampleLoading ? "Loading sample data…" : "Load Sample Data"}
          </Button>

          <Button
            data-testid="remove-sample-data-btn"
            variant="outline"
            onClick={() => setConfirmClearOpen(true)}
            disabled={sampleLoading || sampleClearing}
            className="border-destructive/40 text-destructive hover:bg-destructive/10 flex items-center gap-2"
          >
            {sampleClearing ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <Trash2 className="w-4 h-4" />
            )}
            {sampleClearing ? "Removing sample data…" : "Remove Sample Data"}
          </Button>
        </div>
      </div>

      {/* Confirmation Modal for Clearing Sample Data */}
      <AlertDialog open={confirmClearOpen} onOpenChange={setConfirmClearOpen}>
        <AlertDialogContent data-testid="confirm-clear-dialog">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="w-5 h-5" /> Remove Sample Data
            </AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove all sample data? This will clear demo clients, projects, tasks, proposals, contracts, invoices, and timeline events from your workspace.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="cancel-clear-btn">Cancel</AlertDialogCancel>
            <AlertDialogAction
              data-testid="confirm-clear-btn"
              onClick={handleRemoveSampleData}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Remove Data
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
