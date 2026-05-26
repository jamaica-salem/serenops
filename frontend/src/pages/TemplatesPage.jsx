import { useEffect, useMemo, useState } from "react";
import { RefreshCw, Plus } from "lucide-react";
import api from "../lib/api";
import { Input } from "../components/ui/input";
import { Textarea } from "../components/ui/textarea";
import { Button } from "../components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";

const TEMPLATE_TYPES = [
  "onboarding_checklist",
  "website_project_checklist",
  "va_client_checklist",
  "proposal_template",
  "contract_template",
  "invoice_template",
  "handover_checklist",
  "maintenance_checklist",
  "other",
];

function pretty(v) {
  return String(v || "").replace(/_/g, " ").replace(/\b\w/g, (m) => m.toUpperCase());
}

export default function TemplatesPage() {
  const [templates, setTemplates] = useState([]);
  const [busy, setBusy] = useState(false);
  const [filter, setFilter] = useState("all");
  const [form, setForm] = useState({
    name: "",
    template_type: "other",
    content: "",
    is_default: false,
  });

  const filtered = useMemo(() => {
    if (filter === "all") return templates;
    return templates.filter((t) => t.template_type === filter);
  }, [templates, filter]);

  const loadTemplates = async () => {
    setBusy(true);
    try {
      const { data } = await api.get("/templates");
      setTemplates(data);
    } catch (e) {
      if (e?.response?.status !== 401) console.error("Templates load failed:", e);
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => {
    loadTemplates();
  }, []);

  const createTemplate = async () => {
    if (!form.name.trim()) return;
    await api.post("/templates", {
      ...form,
      name: form.name.trim(),
      content: form.content || "",
    });
    setForm({
      name: "",
      template_type: "other",
      content: "",
      is_default: false,
    });
    await loadTemplates();
  };

  const deleteTemplate = async (id) => {
    await api.delete(`/templates/${id}`);
    await loadTemplates();
  };

  return (
    <div className="space-y-5 animate-fade-up" data-testid="templates-page">
      <div className="flex items-end justify-between gap-3 flex-wrap">
        <div>
          <p className="text-sm text-gray-500">Reusable client operations templates</p>
          <h1 className="font-display text-3xl sm:text-4xl font-bold text-[#1C4B3E] dark:text-[#d7e6b6]">Templates</h1>
        </div>
        <button
          onClick={loadTemplates}
          className="inline-flex items-center gap-1 text-xs px-3 h-9 rounded-lg border border-gray-200 hover:bg-gray-100"
        >
          <RefreshCw className="w-3.5 h-3.5" /> Refresh
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 p-4 grid grid-cols-1 md:grid-cols-3 gap-2">
        <Input
          placeholder="Template name"
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
        />
        <Select value={form.template_type} onValueChange={(v) => setForm({ ...form, template_type: v })}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            {TEMPLATE_TYPES.map((t) => (
              <SelectItem key={t} value={t}>{pretty(t)}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button onClick={createTemplate} disabled={!form.name.trim()}>
          <Plus className="w-4 h-4 mr-1" /> Add template
        </Button>
        <Textarea
          rows={5}
          className="md:col-span-3"
          placeholder="Template content (editable plain text)"
          value={form.content}
          onChange={(e) => setForm({ ...form, content: e.target.value })}
        />
      </div>

      <div className="flex items-center gap-2">
        <div className="text-xs text-gray-500">Filter:</div>
        <Select value={filter} onValueChange={setFilter}>
          <SelectTrigger className="w-72"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All template types</SelectItem>
            {TEMPLATE_TYPES.map((t) => (
              <SelectItem key={t} value={t}>{pretty(t)}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-3">
        {filtered.map((t) => (
          <div key={t.id} className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="flex items-center justify-between gap-2">
              <div>
                <h3 className="font-medium text-[#1C4B3E] dark:text-[#d7e6b6]">{t.name}</h3>
                <div className="text-xs text-gray-500">{pretty(t.template_type)}{t.is_default ? " · Default" : ""}</div>
              </div>
              <button
                onClick={() => deleteTemplate(t.id)}
                className="text-xs px-3 h-8 rounded-md border border-gray-200 hover:bg-gray-100"
              >
                Delete
              </button>
            </div>
            <pre className="text-xs text-gray-600 mt-3 whitespace-pre-wrap font-sans bg-gray-50 rounded-lg p-3 border border-gray-100">
              {t.content || "No content"}
            </pre>
          </div>
        ))}
        {filtered.length === 0 && (
          <div className="text-sm text-gray-400 italic text-center py-10">
            {busy ? "Loading templates..." : "No templates found for this filter."}
          </div>
        )}
      </div>
    </div>
  );
}
