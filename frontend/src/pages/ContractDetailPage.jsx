import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Save, Trash2 } from "lucide-react";
import api from "../lib/api";
import ContractPreview from "../components/contracts/ContractPreview";
import {
  CONTRACT_STATUS_OPTIONS,
  contractStatusLabel,
} from "../lib/contractUtils";

const fieldBaseClass =
  "h-10 w-full px-3 rounded-lg border border-[#E5ECE8] bg-white text-sm text-[#1D2A25] focus:outline-none focus:ring-2 focus:ring-[#5FA38D]/25 focus:border-[#5FA38D]";

const fieldTextareaClass =
  "w-full px-3 py-2 rounded-lg border border-[#E5ECE8] bg-white text-sm text-[#1D2A25] resize-y focus:outline-none focus:ring-2 focus:ring-[#5FA38D]/25 focus:border-[#5FA38D]";

export default function ContractDetailPage() {
  const { contractId } = useParams();
  const navigate = useNavigate();
  const [contract, setContract] = useState(null);
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
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

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    setSuccess("");
    try {
      const [{ data: contractData }, { data: clientData }] = await Promise.all([
        api.get(`/contracts/${contractId}`),
        api.get("/clients"),
      ]);
      setContract(contractData);
      setClients(clientData);
      setForm({
        title: contractData.title || "",
        client_id: contractData.client_id || "",
        service_provider_details: contractData.service_provider_details || "",
        scope_of_work: contractData.scope_of_work || "",
        deliverables_text: (contractData.deliverables || []).join("\n"),
        timeline: contractData.timeline || "",
        payment_terms: contractData.payment_terms || "",
        revision_policy: contractData.revision_policy || "",
        cancellation_policy: contractData.cancellation_policy || "",
        late_payment_clause: contractData.late_payment_clause || "",
        ownership_rights: contractData.ownership_rights || "",
        confidentiality_clause: contractData.confidentiality_clause || "",
        signature_section: contractData.signature_section || "",
        notes: contractData.notes || "",
        status: contractData.status || "draft",
      });
    } catch (e) {
      if (e?.response?.status !== 401) console.error("Contract load failed:", e);
      setError(e?.response?.data?.detail || "Unable to load contract.");
    } finally {
      setLoading(false);
    }
  }, [contractId]);

  useEffect(() => {
    load();
  }, [load]);

  const selectedClient = useMemo(
    () => clients.find((client) => client.id === form.client_id) || null,
    [clients, form.client_id]
  );

  const previewContract = useMemo(
    () => ({
      ...form,
      deliverables: form.deliverables_text
        .split("\n")
        .map((item) => item.trim())
        .filter(Boolean),
    }),
    [form]
  );

  const save = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError("");
    setSuccess("");

    try {
      const payload = {
        title: form.title.trim(),
        client_id: form.client_id,
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
      };
      const { data } = await api.patch(`/contracts/${contractId}`, payload);
      setContract(data);
      setSuccess("Contract updated.");
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (e) {
      if (e?.response?.status !== 401) console.error("Contract update failed:", e);
      setError(e?.response?.data?.detail || "Failed to update contract.");
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    if (!confirm("Delete this contract?")) return;
    try {
      await api.delete(`/contracts/${contractId}`);
      navigate("/contracts");
    } catch (e) {
      if (e?.response?.status !== 401) console.error("Contract delete failed:", e);
      setError(e?.response?.data?.detail || "Failed to delete contract.");
    }
  };

  if (loading) {
    return <div className="text-sm text-[#667C74]">Loading contract...</div>;
  }

  if (!contract && error) {
    return (
      <div className="space-y-3">
        <Link to="/contracts" className="text-sm text-[#2f6f5a] hover:underline inline-flex items-center gap-2">
          <ArrowLeft className="w-4 h-4" />
          Back to contracts
        </Link>
        <div className="text-sm text-red-700 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{error}</div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-up" data-testid="contract-detail-page">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <Link to="/contracts" className="text-sm text-[#2f6f5a] hover:underline inline-flex items-center gap-2">
            <ArrowLeft className="w-4 h-4" />
            Back to contracts
          </Link>
          <h1 className="font-display text-3xl sm:text-4xl font-bold text-[#1C4B3E] dark:text-[#d7e6b6] mt-1">
            {contract?.title || "Contract"}
          </h1>
          <p className="text-sm text-[#667C74]">Edit contract details and keep the preview updated.</p>
        </div>
        <button
          type="button"
          onClick={remove}
          className="h-10 px-4 rounded-lg border border-[#F0D9D9] text-[#9a3838] hover:bg-[#FFF6F6] text-sm inline-flex items-center gap-2"
        >
          <Trash2 className="w-4 h-4" /> Delete Contract
        </button>
      </div>

      <ContractPreview contract={previewContract} client={selectedClient} />

      <form onSubmit={save} className="bg-white rounded-2xl border border-[#E5ECE8] p-5 space-y-5">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <Field label="Contract title">
            <input
              value={form.title}
              onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))}
              className={fieldBaseClass}
              required
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

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
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
          <Field label="Timeline">
            <input
              value={form.timeline}
              onChange={(e) => setForm((prev) => ({ ...prev, timeline: e.target.value }))}
              className={fieldBaseClass}
            />
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
          <Field label="Payment terms">
            <input
              value={form.payment_terms}
              onChange={(e) => setForm((prev) => ({ ...prev, payment_terms: e.target.value }))}
              className={fieldBaseClass}
            />
          </Field>
          <Field label="Revision policy">
            <input
              value={form.revision_policy}
              onChange={(e) => setForm((prev) => ({ ...prev, revision_policy: e.target.value }))}
              className={fieldBaseClass}
            />
          </Field>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <Field label="Cancellation policy">
            <input
              value={form.cancellation_policy}
              onChange={(e) => setForm((prev) => ({ ...prev, cancellation_policy: e.target.value }))}
              className={fieldBaseClass}
            />
          </Field>
          <Field label="Late payment clause">
            <input
              value={form.late_payment_clause}
              onChange={(e) => setForm((prev) => ({ ...prev, late_payment_clause: e.target.value }))}
              className={fieldBaseClass}
            />
          </Field>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <Field label="Ownership rights">
            <input
              value={form.ownership_rights}
              onChange={(e) => setForm((prev) => ({ ...prev, ownership_rights: e.target.value }))}
              className={fieldBaseClass}
            />
          </Field>
          <Field label="Confidentiality clause">
            <input
              value={form.confidentiality_clause}
              onChange={(e) => setForm((prev) => ({ ...prev, confidentiality_clause: e.target.value }))}
              className={fieldBaseClass}
            />
          </Field>
        </div>

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
        {success && <div className="text-sm text-[#1f6a42] bg-[#EEF9F2] border border-[#D4EEDD] rounded-lg px-3 py-2">{success}</div>}

        <div className="flex items-center justify-end">
          <button
            type="submit"
            disabled={saving}
            className="h-10 px-4 rounded-lg bg-[#5FA38D] text-white text-sm font-medium hover:bg-[#4E8C79] transition-colors disabled:opacity-60 inline-flex items-center gap-2"
          >
            <Save className="w-4 h-4" />
            {saving ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </form>
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