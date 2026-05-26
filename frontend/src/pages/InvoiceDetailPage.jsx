import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Plus, Save, Trash2 } from "lucide-react";
import api from "../lib/api";
import InvoicePreview from "../components/invoices/InvoicePreview";
import {
  calculateInvoiceTotals,
  INVOICE_CURRENCY_OPTIONS,
  INVOICE_STATUS_OPTIONS,
  formatMoney,
} from "../lib/invoiceUtils";
const EMPTY_ITEM = { description: "", quantity: 1, rate: 0 };

export default function InvoiceDetailPage() {
  const { invoiceId } = useParams();
  const navigate = useNavigate();
  const [invoice, setInvoice] = useState(null);
  const [clients, setClients] = useState([]);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [form, setForm] = useState({
    invoice_number: "",
    client_id: "",
    project_id: "",
    issue_date: "",
    due_date: "",
    currency: "USD",
    status: "draft",
    line_items: [{ ...EMPTY_ITEM }],
    discount: 0,
    tax_fees: 0,
    amount_paid: 0,
    payment_method: "",
    notes: "",
  });

  const filteredProjects = useMemo(() => {
    if (!form.client_id) return projects;
    return projects.filter((p) => !p.client_id || p.client_id === form.client_id);
  }, [projects, form.client_id]);

  const computed = useMemo(() => {
    return calculateInvoiceTotals(form);
  }, [form]);

  const selectedClient = useMemo(
    () => clients.find((client) => client.id === form.client_id) || null,
    [clients, form.client_id]
  );

  const selectedProject = useMemo(
    () => projects.find((project) => project.id === form.project_id) || null,
    [projects, form.project_id]
  );

  const previewInvoice = useMemo(
    () => ({
      ...form,
      subtotal: computed.subtotal,
      discount: computed.discount,
      tax_fees: computed.taxFees,
      total: computed.total,
      amount_paid: computed.amountPaid,
      balance_due: computed.balanceDue,
    }),
    [computed, form]
  );

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    setSuccess("");
    try {
      const [{ data: inv }, { data: cl }, { data: pr }] = await Promise.all([
        api.get(`/invoices/${invoiceId}`),
        api.get("/clients"),
        api.get("/projects"),
      ]);
      setInvoice(inv);
      setClients(cl);
      setProjects(pr);
      setForm({
        invoice_number: inv.invoice_number || "",
        client_id: inv.client_id || "",
        project_id: inv.project_id || "",
        issue_date: inv.issue_date || "",
        due_date: inv.due_date || "",
        currency: inv.currency || "USD",
        status: inv.status || "draft",
        line_items: inv.line_items?.length ? inv.line_items : [{ ...EMPTY_ITEM }],
        discount: Number(inv.discount || 0),
        tax_fees: Number(inv.tax_fees || 0),
        amount_paid: Number(inv.amount_paid || 0),
        payment_method: inv.payment_method || "",
        notes: inv.notes || "",
      });
    } catch (e) {
      if (e?.response?.status !== 401) {
        console.error("Failed to load invoice:", e);
      }
      setError(e?.response?.data?.detail || "Unable to load invoice.");
    } finally {
      setLoading(false);
    }
  }, [invoiceId]);

  useEffect(() => {
    load();
  }, [load]);

  const updateLineItem = (index, field, value) => {
    setForm((prev) => ({
      ...prev,
      line_items: prev.line_items.map((item, i) =>
        i === index ? { ...item, [field]: value } : item
      ),
    }));
  };

  const addLineItem = () => {
    setForm((prev) => ({
      ...prev,
      line_items: [...prev.line_items, { ...EMPTY_ITEM }],
    }));
  };

  const removeLineItem = (index) => {
    setForm((prev) => ({
      ...prev,
      line_items:
        prev.line_items.length <= 1
          ? prev.line_items
          : prev.line_items.filter((_, i) => i !== index),
    }));
  };

  const save = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    setSuccess("");

    const hasValidLine = (form.line_items || []).some(
      (item) => item.description.trim() && Number(item.quantity || 0) > 0
    );
    if (!hasValidLine) {
      setSaving(false);
      setError("Add at least one line item with description and quantity.");
      return;
    }

    const payload = {
      invoice_number: form.invoice_number.trim(),
      client_id: form.client_id,
      project_id: form.project_id || null,
      issue_date: form.issue_date,
      due_date: form.due_date,
      currency: form.currency,
      status: form.status,
      line_items: form.line_items
        .filter((item) => item.description.trim())
        .map((item) => ({
          description: item.description.trim(),
          quantity: Number(item.quantity || 0),
          rate: Number(item.rate || 0),
        })),
      discount: Number(form.discount || 0),
      tax_fees: Number(form.tax_fees || 0),
      amount_paid: Number(form.amount_paid || 0),
      payment_method: form.payment_method || "",
      notes: form.notes || "",
    };

    try {
      const { data } = await api.patch(`/invoices/${invoiceId}`, payload);
      setInvoice(data);
      setSuccess("Invoice updated.");
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (e) {
      if (e?.response?.status !== 401) {
        console.error("Failed to update invoice:", e);
      }
      setError(e?.response?.data?.detail || "Failed to update invoice.");
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    if (!confirm("Delete this invoice? Related payments will also be removed.")) return;
    try {
      await api.delete(`/invoices/${invoiceId}`);
      navigate("/invoices");
    } catch (e) {
      if (e?.response?.status !== 401) {
        console.error("Failed to delete invoice:", e);
      }
      setError(e?.response?.data?.detail || "Failed to delete invoice.");
    }
  };

  if (loading) {
    return <div className="text-sm text-[#667C74]">Loading invoice...</div>;
  }

  if (!invoice && error) {
    return (
      <div className="space-y-3">
        <Link to="/invoices" className="text-sm text-[#2f6f5a] hover:underline inline-flex items-center gap-2">
          <ArrowLeft className="w-4 h-4" />
          Back to invoices
        </Link>
        <div className="text-sm text-red-700 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{error}</div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-up" data-testid="invoice-detail-page">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <Link to="/invoices" className="text-sm text-[#2f6f5a] hover:underline inline-flex items-center gap-2">
            <ArrowLeft className="w-4 h-4" />
            Back to invoices
          </Link>
          <h1 className="font-display text-3xl sm:text-4xl font-bold text-[#1C4B3E] dark:text-[#d7e6b6] mt-1">
            Invoice {invoice?.invoice_number}
          </h1>
          <p className="text-sm text-[#667C74]">Edit invoice details and balances safely.</p>
        </div>
        <button
          type="button"
          onClick={remove}
          className="h-10 px-4 rounded-lg border border-[#F0D9D9] text-[#9a3838] hover:bg-[#FFF6F6] text-sm inline-flex items-center gap-2"
        >
          <Trash2 className="w-4 h-4" />
          Delete Invoice
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="bg-white rounded-2xl border border-[#E5ECE8] p-4">
          <p className="text-xs uppercase tracking-wide text-[#8EA39B]">Subtotal</p>
          <p className="mt-1 text-lg font-semibold text-[#1D2A25]">{formatMoney(computed.subtotal, form.currency)}</p>
        </div>
        <div className="bg-white rounded-2xl border border-[#E5ECE8] p-4">
          <p className="text-xs uppercase tracking-wide text-[#8EA39B]">Total</p>
          <p className="mt-1 text-lg font-semibold text-[#1D2A25]">{formatMoney(computed.total, form.currency)}</p>
        </div>
        <div className="bg-white rounded-2xl border border-[#E5ECE8] p-4">
          <p className="text-xs uppercase tracking-wide text-[#8EA39B]">Balance Due</p>
          <p className="mt-1 text-lg font-semibold text-[#2f6f5a]">{formatMoney(computed.balanceDue, form.currency)}</p>
        </div>
      </div>

      <InvoicePreview
        invoice={previewInvoice}
        client={selectedClient}
        project={selectedProject}
        provider={{ name: "SerenOps" }}
      />

      <form onSubmit={save} className="bg-white rounded-2xl border border-[#E5ECE8] p-5 space-y-5">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <Field label="Invoice Number">
            <input
              value={form.invoice_number}
              onChange={(e) => setForm((prev) => ({ ...prev, invoice_number: e.target.value }))}
              required
              className="h-10 w-full px-3 rounded-lg border border-[#E5ECE8] text-sm focus:outline-none focus:ring-2 focus:ring-[#5FA38D]/25 focus:border-[#5FA38D]"
            />
          </Field>
          <Field label="Client">
            <select
              value={form.client_id}
              onChange={(e) => setForm((prev) => ({ ...prev, client_id: e.target.value, project_id: "" }))}
              required
              className="h-10 w-full px-3 rounded-lg border border-[#E5ECE8] text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#5FA38D]/25 focus:border-[#5FA38D]"
            >
              <option value="">Select client</option>
              {clients.map((client) => (
                <option key={client.id} value={client.id}>
                  {client.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Status">
            <select
              value={form.status}
              onChange={(e) => setForm((prev) => ({ ...prev, status: e.target.value }))}
              className="h-10 w-full px-3 rounded-lg border border-[#E5ECE8] text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#5FA38D]/25 focus:border-[#5FA38D]"
            >
              {INVOICE_STATUS_OPTIONS.map((status) => (
                <option key={status} value={status}>
                  {status.replace(/_/g, " ")}
                </option>
              ))}
            </select>
          </Field>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <Field label="Related Project">
            <select
              value={form.project_id}
              onChange={(e) => setForm((prev) => ({ ...prev, project_id: e.target.value }))}
              className="h-10 w-full px-3 rounded-lg border border-[#E5ECE8] text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#5FA38D]/25 focus:border-[#5FA38D]"
            >
              <option value="">No linked project</option>
              {filteredProjects.map((project) => (
                <option key={project.id} value={project.id}>
                  {project.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Currency">
            <select
              value={form.currency}
              onChange={(e) => setForm((prev) => ({ ...prev, currency: e.target.value }))}
              className="h-10 w-full px-3 rounded-lg border border-[#E5ECE8] text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#5FA38D]/25 focus:border-[#5FA38D]"
            >
              {INVOICE_CURRENCY_OPTIONS.map((currency) => (
                <option key={currency} value={currency}>
                  {currency}
                </option>
              ))}
            </select>
          </Field>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <Field label="Issue Date">
            <input
              type="date"
              value={form.issue_date}
              onChange={(e) => setForm((prev) => ({ ...prev, issue_date: e.target.value }))}
              required
              className="h-10 w-full px-3 rounded-lg border border-[#E5ECE8] text-sm focus:outline-none focus:ring-2 focus:ring-[#5FA38D]/25 focus:border-[#5FA38D]"
            />
          </Field>
          <Field label="Due Date">
            <input
              type="date"
              value={form.due_date}
              onChange={(e) => setForm((prev) => ({ ...prev, due_date: e.target.value }))}
              required
              className="h-10 w-full px-3 rounded-lg border border-[#E5ECE8] text-sm focus:outline-none focus:ring-2 focus:ring-[#5FA38D]/25 focus:border-[#5FA38D]"
            />
          </Field>
          <Field label="Payment Method">
            <input
              value={form.payment_method}
              onChange={(e) => setForm((prev) => ({ ...prev, payment_method: e.target.value }))}
              className="h-10 w-full px-3 rounded-lg border border-[#E5ECE8] text-sm focus:outline-none focus:ring-2 focus:ring-[#5FA38D]/25 focus:border-[#5FA38D]"
            />
          </Field>
          <Field label="Amount Paid">
            <input
              type="number"
              min="0"
              step="0.01"
              value={form.amount_paid}
              onChange={(e) => setForm((prev) => ({ ...prev, amount_paid: e.target.value }))}
              className="h-10 w-full px-3 rounded-lg border border-[#E5ECE8] text-sm focus:outline-none focus:ring-2 focus:ring-[#5FA38D]/25 focus:border-[#5FA38D]"
            />
          </Field>
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium text-[#1C4B3E] dark:text-[#d7e6b6]">Line Items</h3>
            <button
              type="button"
              onClick={addLineItem}
              className="h-8 px-3 rounded-lg border border-[#E5ECE8] text-xs text-[#42534d] hover:bg-[#F7FAF8] inline-flex items-center gap-1"
            >
              <Plus className="w-3.5 h-3.5" />
              Add Item
            </button>
          </div>

          <div className="space-y-2">
            {form.line_items.map((item, index) => (
              <div key={index} className="grid grid-cols-12 gap-2">
                <input
                  placeholder="Description"
                  value={item.description}
                  onChange={(e) => updateLineItem(index, "description", e.target.value)}
                  className="col-span-12 md:col-span-6 h-10 px-3 rounded-lg border border-[#E5ECE8] text-sm focus:outline-none focus:ring-2 focus:ring-[#5FA38D]/25 focus:border-[#5FA38D]"
                />
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="Qty"
                  value={item.quantity}
                  onChange={(e) => updateLineItem(index, "quantity", e.target.value)}
                  className="col-span-4 md:col-span-2 h-10 px-3 rounded-lg border border-[#E5ECE8] text-sm focus:outline-none focus:ring-2 focus:ring-[#5FA38D]/25 focus:border-[#5FA38D]"
                />
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="Rate"
                  value={item.rate}
                  onChange={(e) => updateLineItem(index, "rate", e.target.value)}
                  className="col-span-6 md:col-span-3 h-10 px-3 rounded-lg border border-[#E5ECE8] text-sm focus:outline-none focus:ring-2 focus:ring-[#5FA38D]/25 focus:border-[#5FA38D]"
                />
                <button
                  type="button"
                  onClick={() => removeLineItem(index)}
                  disabled={form.line_items.length <= 1}
                  className="col-span-2 md:col-span-1 h-10 rounded-lg border border-[#E5ECE8] text-[#8EA39B] hover:text-[#D97C7C] hover:border-[#D97C7C]/40 disabled:opacity-40"
                  title="Remove item"
                >
                  <Trash2 className="w-4 h-4 mx-auto" />
                </button>
              </div>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-medium text-[#667C74]">Notes</label>
            <textarea
              rows={4}
              value={form.notes}
              onChange={(e) => setForm((prev) => ({ ...prev, notes: e.target.value }))}
              className="mt-1 w-full px-3 py-2 rounded-lg border border-[#E5ECE8] text-sm resize-y focus:outline-none focus:ring-2 focus:ring-[#5FA38D]/25 focus:border-[#5FA38D]"
              placeholder="Optional notes for the client..."
            />
          </div>

          <div className="space-y-2 bg-[#F7FAF8] border border-[#E5ECE8] rounded-xl p-4">
            <div className="flex items-center justify-between text-sm">
              <span className="text-[#667C74]">Subtotal</span>
              <span className="font-medium text-[#1D2A25]">{formatMoney(computed.subtotal, form.currency)}</span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <input
                type="number"
                min="0"
                step="0.01"
                value={form.discount}
                onChange={(e) => setForm((prev) => ({ ...prev, discount: e.target.value }))}
                placeholder="Discount"
                className="h-9 px-3 rounded-lg border border-[#E5ECE8] text-sm focus:outline-none focus:ring-2 focus:ring-[#5FA38D]/25 focus:border-[#5FA38D]"
              />
              <input
                type="number"
                min="0"
                step="0.01"
                value={form.tax_fees}
                onChange={(e) => setForm((prev) => ({ ...prev, tax_fees: e.target.value }))}
                placeholder="Tax / Fees"
                className="h-9 px-3 rounded-lg border border-[#E5ECE8] text-sm focus:outline-none focus:ring-2 focus:ring-[#5FA38D]/25 focus:border-[#5FA38D]"
              />
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-[#667C74]">Total</span>
              <span className="font-semibold text-[#1D2A25]">{formatMoney(computed.total, form.currency)}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-[#667C74]">Balance Due</span>
              <span className="font-semibold text-[#2f6f5a]">{formatMoney(computed.balanceDue, form.currency)}</span>
            </div>
          </div>
        </div>

        {error && (
          <div className="text-sm text-red-700 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{error}</div>
        )}
        {success && (
          <div className="text-sm text-[#1f6a42] bg-[#EEF9F2] border border-[#D4EEDD] rounded-lg px-3 py-2">{success}</div>
        )}

        <div className="flex items-center justify-end gap-2">
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
