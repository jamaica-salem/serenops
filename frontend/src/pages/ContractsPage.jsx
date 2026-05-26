import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { FileSignature, RefreshCw, Sparkles } from "lucide-react";
import api from "../lib/api";
import {
  CONTRACT_STATUS_OPTIONS,
  contractStatusBadgeClass,
  contractStatusLabel,
} from "../lib/contractUtils";

const fieldBaseClass =
  "h-10 w-full px-3 rounded-lg border border-[#E5ECE8] bg-white text-sm text-[#1D2A25] focus:outline-none focus:ring-2 focus:ring-[#5FA38D]/25 focus:border-[#5FA38D]";

const fieldTextareaClass =
  "w-full px-3 py-2 rounded-lg border border-[#E5ECE8] bg-white text-sm text-[#1D2A25] resize-y focus:outline-none focus:ring-2 focus:ring-[#5FA38D]/25 focus:border-[#5FA38D]";

export default function ContractsPage() {
  const [contracts, setContracts] = useState([]);
  const [clients, setClients] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [selectedTemplateId, setSelectedTemplateId] = useState("");
  const [form, setForm] = useState({
    title: "",
    client_id: "",
    service_provider_details: "",
    scope_of_work: "",
    deliverables_text: "",
    timeline: "",
    payment_terms: "",
    revision_policy: "",
    cancellation_policy: "",
    late_payment_clause: "",
    ownership_rights: "",
    confidentiality_clause: "",
    signature_section: "",
    notes: "",
    status: "draft",
  });

  const load = async () => {
    setBusy(true);
    setError("");
    try {
      const [{ data: contractData }, { data: clientData }, { data: templateData }] = await Promise.all([
        api.get("/contracts"),
        api.get("/clients"),
        api.get("/templates"),
      ]);
      setContracts(contractData);
      setClients(clientData);
      setTemplates(templateData);
      setForm((prev) => ({
        ...prev,
        client_id: prev.client_id || clientData[0]?.id || "",
      }));
    } catch (e) {
      if (e?.response?.status !== 401) console.error("Contracts load failed:", e);
      setError(e?.response?.data?.detail || "Unable to load contracts.");
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const contractTemplates = useMemo(
    () => templates.filter((template) => template.template_type === "contract_template"),
    [templates]
  );

  const summary = useMemo(() => {
    const total = contracts.length;
    const sent = contracts.filter((c) => c.status === "sent").length;
    const signed = contracts.filter((c) => c.status === "signed").length;
    const draft = contracts.filter((c) => c.status === "draft").length;
    return { total, sent, signed, draft };
  }, [contracts]);

  const applyTemplate = () => {
    const template = contractTemplates.find((item) => item.id === selectedTemplateId);
    if (!template) return;
    setForm((prev) => ({
      ...prev,
      scope_of_work: prev.scope_of_work ? `${prev.scope_of_work}\n${template.content}` : template.content,
    }));
  };

  const createContract = async (event) => {
    event.preventDefault();
    setError("");

    if (!form.client_id || !form.title.trim()) {
      setError("Select a client and add a contract title.");
      return;
    }

    try {
      await api.post("/contracts", {
        client_id: form.client_id,
        title: form.title.trim(),
        service_provider_details: form.service_provider_details || "",
        scope_of_work: form.scope_of_work || "",
        deliverables: form.deliverables_text
          .split("\n")
          .map((item) => item.trim())
          .filter(Boolean),
        payment_terms: form.payment_terms || "",
        timeline: form.timeline || "",
        revision_policy: form.revision_policy || "",
        cancellation_policy: form.cancellation_policy || "",
        late_payment_clause: form.late_payment_clause || "",
        ownership_rights: form.ownership_rights || "",
        confidentiality_clause: form.confidentiality_clause || "",
        signature_section: form.signature_section || "",
        notes: form.notes || "",
        status: form.status,
      });

      setForm((prev) => ({
        ...prev,
        title: "",
        scope_of_work: "",
        deliverables_text: "",
        timeline: "",
        payment_terms: "",
        revision_policy: "",
        cancellation_policy: "",
        late_payment_clause: "",
        ownership_rights: "",
        confidentiality_clause: "",
        signature_section: "",
        notes: "",
        status: "draft",
      }));
      await load();
    } catch (e) {
      if (e?.response?.status !== 401) console.error("Contract create failed:", e);
      setError(e?.response?.data?.detail || "Failed to create contract.");
    }
  };

  return (
    <div className="space-y-6 animate-fade-up" data-testid="contracts-page">
      <div className="flex items-end justify-between flex-wrap gap-4">
        <div>
          <h1 className="font-display text-3xl sm:text-4xl font-bold text-[#1C4B3E] dark:text-[#d7e6b6]">Contracts</h1>
          <p className="text-sm text-[#667C74] mt-1">Generate and track client agreements</p>
        </div>
        <button
          type="button"
          onClick={load}
          className="h-9 px-3 rounded-lg border border-[#E5ECE8] text-sm text-[#42534d] hover:bg-[#F7FAF8] inline-flex items-center gap-2"
        >
          <RefreshCw className="w-4 h-4" /> Refresh
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
        <SummaryCard title="Total" value={summary.total} hint="All contracts" />
        <SummaryCard title="Drafts" value={summary.draft} hint="Needs review" />
        <SummaryCard title="Sent" value={summary.sent} hint="Awaiting signature" tone="warning" />
        <SummaryCard title="Signed" value={summary.signed} hint="Completed" tone="success" />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)] gap-5 items-start">
        <section className="bg-white rounded-2xl border border-[#E5ECE8] p-5">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div>
              <h2 className="font-display text-xl font-semibold text-[#1C4B3E] dark:text-[#d7e6b6]">Create contract</h2>
              <p className="text-sm text-[#667C74]">Start with a template or build from scratch.</p>
            </div>
            <div className="inline-flex items-center gap-2 text-xs text-[#667C74]">
              <Sparkles className="w-3.5 h-3.5" /> {contractTemplates.length} contract templates
            </div>
          </div>

          <form onSubmit={createContract} className="mt-5 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <Field label="Contract title">
                <input
                  value={form.title}
                  onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))}
                  className={fieldBaseClass}
                  placeholder="Website management agreement"
                />
              </Field>
              <Field label="Client">
                <select
                  value={form.client_id}
                  onChange={(e) => setForm((prev) => ({ ...prev, client_id: e.target.value }))}
                  className={fieldBaseClass}
                >
                  <option value="">Select client</option>
                  {clients.map((client) => (
                    <option key={client.id} value={client.id}>{client.name}</option>
                  ))}
                </select>
              </Field>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <Field label="Status">
                <select
                  value={form.status}
                  onChange={(e) => setForm((prev) => ({ ...prev, status: e.target.value }))}
                  className={fieldBaseClass}
                >
                  {CONTRACT_STATUS_OPTIONS.map((status) => (
                    <option key={status} value={status}>{contractStatusLabel(status)}</option>
                  ))}
                </select>
              </Field>
              <Field label="Template">
                <select
                  value={selectedTemplateId}
                  onChange={(e) => setSelectedTemplateId(e.target.value)}
                  className={fieldBaseClass}
                >
                  <option value="">Select template</option>
                  {contractTemplates.map((template) => (
                    <option key={template.id} value={template.id}>{template.name}</option>
                  ))}
                </select>
              </Field>
              <Field label="Apply template">
                <button
                  type="button"
                  onClick={applyTemplate}
                  disabled={!selectedTemplateId}
                  className="h-10 px-3 rounded-lg border border-[#E5ECE8] text-sm text-[#42534d] hover:bg-[#F7FAF8] disabled:opacity-60"
                >
                  Insert template
                </button>
              </Field>
            </div>

            <Field label="Service provider details">
              <textarea
                rows={3}
                value={form.service_provider_details}
                onChange={(e) => setForm((prev) => ({ ...prev, service_provider_details: e.target.value }))}
                className={fieldTextareaClass}
              />
            </Field>

            <Field label="Scope of work">
              <textarea
                rows={4}
                value={form.scope_of_work}
                onChange={(e) => setForm((prev) => ({ ...prev, scope_of_work: e.target.value }))}
                className={fieldTextareaClass}
              />
            </Field>

            <Field label="Deliverables (one per line)">
              <textarea
                rows={3}
                value={form.deliverables_text}
                onChange={(e) => setForm((prev) => ({ ...prev, deliverables_text: e.target.value }))}
                className={fieldTextareaClass}
              />
            </Field>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <Field label="Timeline">
                <input
                  value={form.timeline}
                  onChange={(e) => setForm((prev) => ({ ...prev, timeline: e.target.value }))}
                  className={fieldBaseClass}
                />
              </Field>
              <Field label="Payment terms">
                <input
                  value={form.payment_terms}
                  onChange={(e) => setForm((prev) => ({ ...prev, payment_terms: e.target.value }))}
                  className={fieldBaseClass}
                />
              </Field>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <Field label="Revision policy">
                <input
                  value={form.revision_policy}
                  onChange={(e) => setForm((prev) => ({ ...prev, revision_policy: e.target.value }))}
                  className={fieldBaseClass}
                />
              </Field>
              <Field label="Cancellation policy">
                <input
                  value={form.cancellation_policy}
                  onChange={(e) => setForm((prev) => ({ ...prev, cancellation_policy: e.target.value }))}
                  className={fieldBaseClass}
                />
              </Field>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <Field label="Late payment clause">
                <input
                  value={form.late_payment_clause}
                  onChange={(e) => setForm((prev) => ({ ...prev, late_payment_clause: e.target.value }))}
                  className={fieldBaseClass}
                />
              </Field>
              <Field label="Ownership rights">
                <input
                  value={form.ownership_rights}
                  onChange={(e) => setForm((prev) => ({ ...prev, ownership_rights: e.target.value }))}
                  className={fieldBaseClass}
                />
              </Field>
            </div>

            <Field label="Confidentiality clause">
              <input
                value={form.confidentiality_clause}
                onChange={(e) => setForm((prev) => ({ ...prev, confidentiality_clause: e.target.value }))}
                className={fieldBaseClass}
              />
            </Field>

            <Field label="Signature section">
              <textarea
                rows={2}
                value={form.signature_section}
                onChange={(e) => setForm((prev) => ({ ...prev, signature_section: e.target.value }))}
                className={fieldTextareaClass}
              />
            </Field>

            <Field label="Notes">
              <textarea
                rows={3}
                value={form.notes}
                onChange={(e) => setForm((prev) => ({ ...prev, notes: e.target.value }))}
                className={fieldTextareaClass}
              />
            </Field>

            {error && <div className="text-sm text-red-700 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{error}</div>}

            <div className="flex items-center justify-end">
              <button
                type="submit"
                className="h-10 px-4 rounded-lg bg-[#5FA38D] text-white text-sm font-medium hover:bg-[#4E8C79] transition-colors"
              >
                <FileSignature className="w-4 h-4" /> Create contract
              </button>
            </div>
          </form>
        </section>

        <section className="bg-white rounded-2xl border border-[#E5ECE8] p-5">
          <div className="flex items-center justify-between gap-3 flex-wrap mb-4">
            <div>
              <h2 className="font-display text-xl font-semibold text-[#1C4B3E] dark:text-[#d7e6b6]">Contracts list</h2>
              <p className="text-sm text-[#667C74]">Open a contract to edit or preview it.</p>
            </div>
            <div className="text-xs text-[#667C74]">{contracts.length} contracts</div>
          </div>

          <div className="space-y-3">
            {contracts.map((contract) => {
              const client = clients.find((item) => item.id === contract.client_id);
              return (
                <div key={contract.id} className="rounded-xl border border-[#E5ECE8] p-4">
                  <div className="flex items-start justify-between gap-3 flex-wrap">
                    <div>
                      <div className="font-medium text-[#1D2A25]">{contract.title}</div>
                      <div className="text-xs text-[#8EA39B]">{client?.name || "Unknown client"}</div>
                    </div>
                    <span className={`inline-flex items-center px-2 py-1 rounded-full border text-xs font-medium ${contractStatusBadgeClass(contract.status)}`}>
                      {contractStatusLabel(contract.status)}
                    </span>
                  </div>
                  <div className="mt-3 text-sm text-[#42534d] line-clamp-2">
                    {contract.scope_of_work || "No scope details"}
                  </div>
                  <div className="mt-3 flex items-center justify-between gap-3 flex-wrap text-xs text-[#8EA39B]">
                    <span>{contract.timeline || "No timeline"}</span>
                    <span>{contract.payment_terms || "No payment terms"}</span>
                    <Link to={`/contracts/${contract.id}`} className="text-[#2f6f5a] font-medium hover:underline">
                      View details
                    </Link>
                  </div>
                </div>
              );
            })}
            {contracts.length === 0 && (
              <div className="text-sm text-[#8EA39B] italic text-center py-10">No contracts yet.</div>
            )}
          </div>
        </section>
      </div>

      {busy && <div className="text-xs text-[#667C74]">Refreshing contracts...</div>}
    </div>
  );
}

function SummaryCard({ title, value, hint, tone = "default" }) {
  const toneClass =
    tone === "success"
      ? "text-[#1f6a42]"
      : tone === "warning"
      ? "text-[#8A5A2B]"
      : "text-[#1D2A25]";

  return (
    <div className="bg-white rounded-2xl border border-[#E5ECE8] p-4">
      <p className="text-xs uppercase tracking-wide text-[#8EA39B]">{title}</p>
      <p className={`mt-1 text-lg font-semibold ${toneClass}`}>{value}</p>
      <p className="text-xs text-[#667C74] mt-1">{hint}</p>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <label className="block">
      <span className="text-xs font-medium text-[#667C74]">{label}</span>
      <div className="mt-1">{children}</div>
    </label>
  );
}
