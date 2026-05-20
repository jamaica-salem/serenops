import { useEffect, useMemo, useState } from "react";
import { Download, Plus, Trash2 } from "lucide-react";
import api from "../lib/api";
import { downloadInvoicePdf } from "../lib/invoicePdf";

function money(v) {
  const n = Number(v || 0);
  return Number.isFinite(n) ? n.toFixed(2) : "0.00";
}

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function nextWeekISO() {
  return new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10);
}

function nextInvoiceNumber() {
  const stamp = Date.now().toString().slice(-6);
  return `INV-${stamp}`;
}

function formatMoney(value, currency = "USD") {
  const amount = Number(value || 0);
  if (!Number.isFinite(amount)) return "0.00";
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency || "USD",
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    return `$${money(amount)}`;
  }
}

function statusLabel(status) {
  return String(status || "draft").replace(/_/g, " ");
}

function statusBadgeClass(status) {
  const val = String(status || "draft");
  if (val === "paid") return "bg-[#6FCF97]/20 text-[#1f6a42] border-[#6FCF97]/30";
  if (val === "partially_paid") return "bg-[#D4A373]/18 text-[#8A5A2B] border-[#D4A373]/35";
  if (val === "overdue") return "bg-[#D97C7C]/15 text-[#9a3838] border-[#D97C7C]/30";
  if (val === "cancelled") return "bg-[#E5ECE8] text-[#667C74] border-[#D7E0DB]";
  if (val === "sent") return "bg-[#5FA38D]/16 text-[#2f6f5a] border-[#5FA38D]/30";
  return "bg-[#E8F3EE] text-[#2F6F5A] border-[#D3E7DE]";
}

function summarizeAmountsByCurrency(invoices, field) {
  const sums = invoices.reduce((acc, invoice) => {
    const code = invoice?.currency || "USD";
    const amount = Number(invoice?.[field] || 0);
    if (!Number.isFinite(amount)) return acc;
    acc[code] = (acc[code] || 0) + amount;
    return acc;
  }, {});

  const entries = Object.entries(sums);
  if (!entries.length) return "-";
  return entries
    .map(([code, value]) => `${code} ${money(value)}`)
    .join(" | ");
}

const STATUS_OPTIONS = [
  "draft",
  "sent",
  "paid",
  "partially_paid",
  "overdue",
  "cancelled",
];

const CURRENCY_OPTIONS = ["USD", "EUR", "GBP", "AUD", "CAD", "JPY", "PHP", "SGD", "NZD", "OTHER"];

const EMPTY_ITEM = { description: "", quantity: 1, rate: 0 };

export default function InvoicesPage() {
  const [invoices, setInvoices] = useState([]);
  const [clients, setClients] = useState([]);
  const [projects, setProjects] = useState([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    invoice_number: nextInvoiceNumber(),
    client_id: "",
    project_id: "",
    issue_date: todayISO(),
    due_date: nextWeekISO(),
    currency: "USD",
    line_items: [{ ...EMPTY_ITEM }],
    discount: 0,
    tax_fees: 0,
    amount_paid: 0,
    payment_method: "Bank Transfer",
    notes: "",
    status: "draft",
    provider_name: "SerenOps",
    provider_email: "",
    provider_phone: "",
  });

  const selectedClient = useMemo(
    () => clients.find((c) => c.id === form.client_id) || null,
    [clients, form.client_id]
  );

  const filteredProjects = useMemo(() => {
    if (!form.client_id) return projects;
    return projects.filter((p) => !p.client_id || p.client_id === form.client_id);
  }, [projects, form.client_id]);

  const computed = useMemo(() => {
    const subtotal = (form.line_items || []).reduce((sum, item) => {
      const qty = Number(item.quantity || 0);
      const rate = Number(item.rate || 0);
      return sum + qty * rate;
    }, 0);
    const discount = Number(form.discount || 0);
    const tax = Number(form.tax_fees || 0);
    const amountPaid = Number(form.amount_paid || 0);
    const total = Math.max(0, subtotal - discount + tax);
    const balance = Math.max(0, total - amountPaid);
    return { subtotal, total, balance };
  }, [form]);

  const load = async () => {
    try {
      const [{ data: inv }, { data: cl }, { data: pr }] = await Promise.all([
        api.get("/invoices"),
        api.get("/clients"),
        api.get("/projects"),
      ]);
      setInvoices(inv);
      setClients(cl);
      setProjects(pr);
      setForm((prev) => ({
        ...prev,
        client_id: prev.client_id || cl?.[0]?.id || "",
      }));
    } catch (e) {
      if (e?.response?.status !== 401) {
        console.error("Invoices load failed:", e);
      }
    }
  };

  useEffect(() => {
    load();
  }, []);

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

  const resetInvoiceFields = () => {
    setForm((prev) => ({
      ...prev,
      invoice_number: nextInvoiceNumber(),
      project_id: "",
      issue_date: todayISO(),
      due_date: nextWeekISO(),
      currency: prev.currency || "USD",
      line_items: [{ ...EMPTY_ITEM }],
      discount: 0,
      tax_fees: 0,
      amount_paid: 0,
      payment_method: "Bank Transfer",
      notes: "",
      status: "draft",
    }));
  };

  const generateInvoice = async (e) => {
    e.preventDefault();
    setError("");

    const hasValidLine = (form.line_items || []).some(
      (item) => item.description.trim() && Number(item.quantity || 0) > 0
    );

    if (!form.client_id) {
      setError("Please select a client.");
      return;
    }
    if (!hasValidLine) {
      setError("Add at least one line item with description and quantity.");
      return;
    }

    const payload = {
      invoice_number: form.invoice_number.trim(),
      client_id: form.client_id,
      project_id: form.project_id || null,
      issue_date: form.issue_date,
      due_date: form.due_date,
      currency: form.currency || "USD",
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
      status: form.status,
    };

    setBusy(true);
    try {
      const { data: created } = await api.post("/invoices", payload);
      downloadInvoicePdf({
        invoice: created,
        client: selectedClient,
        provider: {
          name: form.provider_name,
          email: form.provider_email,
          phone: form.provider_phone,
        },
      });
      await load();
      resetInvoiceFields();
    } catch (err) {
      if (err?.response?.status !== 401) {
        console.error("Invoice create failed:", err);
      }
      setError(err?.response?.data?.detail || "Failed to generate invoice PDF.");
    } finally {
      setBusy(false);
    }
  };

  const downloadExisting = (invoice) => {
    const client = clients.find((c) => c.id === invoice.client_id) || null;
    const project = projects.find((p) => p.id === invoice.project_id) || null;
    downloadInvoicePdf({
      invoice: {
        ...invoice,
        notes: invoice.notes || (project?.name ? `Project: ${project.name}` : ""),
      },
      client,
      provider: {
        name: form.provider_name || "SerenOps",
        email: form.provider_email,
        phone: form.provider_phone,
      },
    });
  };

  const removeInvoice = async (invoiceId) => {
    if (!confirm("Delete this invoice? Related payment records will also be removed.")) return;
    try {
      await api.delete(`/invoices/${invoiceId}`);
      await load();
    } catch (err) {
      if (err?.response?.status !== 401) {
        console.error("Invoice delete failed:", err);
      }
      setError(err?.response?.data?.detail || "Failed to delete invoice.");
    }
  };

  const summary = useMemo(() => {
    const overdue = invoices.filter((i) => i.status === "overdue");
    const unpaid = invoices.filter((i) => (Number(i.balance_due || 0) > 0) && i.status !== "cancelled");
    const paid = invoices.filter((i) => i.status === "paid");
    return {
      totalCount: invoices.length,
      overdueCount: overdue.length,
      paidCount: paid.length,
      unpaidCount: unpaid.length,
      outstandingByCurrency: summarizeAmountsByCurrency(unpaid, "balance_due"),
      collectedByCurrency: summarizeAmountsByCurrency(invoices, "amount_paid"),
    };
  }, [invoices]);

  return (
    <div className="space-y-6 animate-fade-up" data-testid="invoices-page">
      <div>
        <p className="text-sm text-[#667C74]">Track balances and payment status</p>
        <h1 className="font-display text-3xl sm:text-4xl font-bold text-[#1D2A25]">Invoices</h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
        <SummaryCard title="Invoices" value={String(summary.totalCount)} hint={`${summary.paidCount} paid, ${summary.unpaidCount} open`} />
        <SummaryCard title="Overdue" value={String(summary.overdueCount)} hint="Needs follow-up" tone="warning" />
        <SummaryCard title="Outstanding" value={summary.outstandingByCurrency} hint="Open balances" />
        <SummaryCard title="Collected" value={summary.collectedByCurrency} hint="Payments received" tone="success" />
      </div>

      <form
        onSubmit={generateInvoice}
        className="bg-white rounded-2xl border border-[#E5ECE8] p-5 space-y-5"
        data-testid="invoice-generator-form"
      >
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h2 className="font-display text-xl font-semibold text-[#1D2A25]">Invoice Generator</h2>
            <p className="text-sm text-[#667C74]">
              Fill the form once, then export a formatted PDF automatically.
            </p>
          </div>
          <button
            type="submit"
            disabled={busy}
            className="h-10 px-4 rounded-lg bg-[#5FA38D] text-white text-sm font-medium hover:bg-[#4E8C79] transition-colors disabled:opacity-60 inline-flex items-center gap-2"
            data-testid="generate-invoice-pdf-btn"
          >
            <Download className="w-4 h-4" />
            {busy ? "Generating..." : "Generate PDF"}
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <Field label="Invoice Number">
            <input
              value={form.invoice_number}
              onChange={(e) => setForm((prev) => ({ ...prev, invoice_number: e.target.value }))}
              required
              className="h-10 w-full px-3 rounded-lg border border-[#E5ECE8] text-sm focus:outline-none focus:ring-2 focus:ring-[#5FA38D]/25 focus:border-[#5FA38D]"
              data-testid="invoice-number-input"
            />
          </Field>
          <Field label="Client">
            <select
              value={form.client_id}
              onChange={(e) => setForm((prev) => ({ ...prev, client_id: e.target.value }))}
              required
              className="h-10 w-full px-3 rounded-lg border border-[#E5ECE8] text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#5FA38D]/25 focus:border-[#5FA38D]"
              data-testid="invoice-client-select"
            >
              <option value="">Select client</option>
              {clients.map((client) => (
                <option key={client.id} value={client.id}>
                  {client.name}
                  {client.company_name ? ` (${client.company_name})` : ""}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Status">
            <select
              value={form.status}
              onChange={(e) => setForm((prev) => ({ ...prev, status: e.target.value }))}
              className="h-10 w-full px-3 rounded-lg border border-[#E5ECE8] text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#5FA38D]/25 focus:border-[#5FA38D]"
              data-testid="invoice-status-select"
            >
              {STATUS_OPTIONS.map((status) => (
                <option key={status} value={status}>
                  {statusLabel(status)}
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
              data-testid="invoice-project-select"
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
              data-testid="invoice-currency-select"
            >
              {CURRENCY_OPTIONS.map((currency) => (
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

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <Field label="Your Business Name (PDF)">
            <input
              value={form.provider_name}
              onChange={(e) => setForm((prev) => ({ ...prev, provider_name: e.target.value }))}
              className="h-10 w-full px-3 rounded-lg border border-[#E5ECE8] text-sm focus:outline-none focus:ring-2 focus:ring-[#5FA38D]/25 focus:border-[#5FA38D]"
            />
          </Field>
          <Field label="Your Email (PDF)">
            <input
              value={form.provider_email}
              onChange={(e) => setForm((prev) => ({ ...prev, provider_email: e.target.value }))}
              className="h-10 w-full px-3 rounded-lg border border-[#E5ECE8] text-sm focus:outline-none focus:ring-2 focus:ring-[#5FA38D]/25 focus:border-[#5FA38D]"
            />
          </Field>
          <Field label="Your Phone (PDF)">
            <input
              value={form.provider_phone}
              onChange={(e) => setForm((prev) => ({ ...prev, provider_phone: e.target.value }))}
              className="h-10 w-full px-3 rounded-lg border border-[#E5ECE8] text-sm focus:outline-none focus:ring-2 focus:ring-[#5FA38D]/25 focus:border-[#5FA38D]"
            />
          </Field>
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium text-[#1D2A25]">Line Items</h3>
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
              <span className="font-semibold text-[#2f6f5a]">{formatMoney(computed.balance, form.currency)}</span>
            </div>
          </div>
        </div>

        {error && (
          <div className="text-sm text-red-700 bg-red-50 border border-red-100 rounded-lg px-3 py-2" data-testid="invoice-form-error">
            {error}
          </div>
        )}
      </form>

      <div className="bg-white rounded-2xl border border-[#E5ECE8] overflow-hidden">
        <table className="w-full text-sm">
          <thead className="text-xs uppercase tracking-wider text-[#667C74] border-b border-[#E5ECE8] bg-[#F7FAF8]">
            <tr>
              <th className="text-left px-5 py-3">Invoice</th>
              <th className="text-left px-3 py-3">Status</th>
              <th className="text-left px-3 py-3">Project</th>
              <th className="text-left px-3 py-3">Total</th>
              <th className="text-left px-3 py-3">Paid</th>
              <th className="text-left px-3 py-3">Balance</th>
              <th className="text-left px-3 py-3">Due</th>
              <th className="text-left px-3 py-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {invoices.map((i) => (
              <tr
                key={i.id}
                className={`border-b border-[#F1F5F3] ${i.status === "overdue" ? "bg-[#FFF6F6]" : ""}`}
              >
                <td className="px-5 py-3">
                  <div className="font-medium text-[#1D2A25]">{i.invoice_number}</div>
                  <div className="text-xs text-[#8EA39B]">{i.issue_date}</div>
                </td>
                <td className="px-3 py-3">
                  <span className={`inline-flex items-center px-2 py-1 rounded-full border text-xs font-medium ${statusBadgeClass(i.status)}`}>
                    {statusLabel(i.status)}
                  </span>
                </td>
                <td className="px-3 py-3 text-[#42534d] text-xs">
                  {projects.find((p) => p.id === i.project_id)?.name || "-"}
                </td>
                <td className="px-3 py-3 text-[#1D2A25]">{formatMoney(i.total, i.currency)}</td>
                <td className="px-3 py-3 text-[#1D2A25]">{formatMoney(i.amount_paid, i.currency)}</td>
                <td className="px-3 py-3 text-[#2f6f5a]">{formatMoney(i.balance_due, i.currency)}</td>
                <td className={`px-3 py-3 ${i.status === "overdue" ? "text-[#9a3838] font-medium" : "text-[#42534d]"}`}>{i.due_date}</td>
                <td className="px-3 py-3">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => downloadExisting(i)}
                      className="h-8 px-2.5 rounded-md border border-[#E5ECE8] text-[#42534d] hover:bg-[#F7FAF8] inline-flex items-center gap-1 text-xs"
                      data-testid={`invoice-download-${i.id}`}
                    >
                      <Download className="w-3.5 h-3.5" />
                      PDF
                    </button>
                    <button
                      onClick={() => removeInvoice(i.id)}
                      className="h-8 px-2.5 rounded-md border border-[#F0D9D9] text-[#9a3838] hover:bg-[#FFF6F6] inline-flex items-center gap-1 text-xs"
                      data-testid={`invoice-delete-${i.id}`}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {invoices.length === 0 && (
              <tr>
                <td colSpan={8} className="text-center text-[#8EA39B] py-12 text-sm italic">
                  No invoices yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function SummaryCard({ title, value, hint, tone = "default" }) {
  const toneClass =
    tone === "warning"
      ? "text-[#8A5A2B]"
      : tone === "success"
      ? "text-[#1f6a42]"
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

