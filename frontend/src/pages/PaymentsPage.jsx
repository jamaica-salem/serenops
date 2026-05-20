import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { AlertTriangle, CircleDollarSign, Filter, Landmark, RefreshCw } from "lucide-react";
import api from "../lib/api";
import { formatMoney, summarizeAmountsByCurrency } from "../lib/invoiceUtils";
import {
  PAYMENT_STATUS_OPTIONS,
  paymentStatusBadgeClass,
  paymentStatusLabel,
} from "../lib/paymentUtils";

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function monthStartISO() {
  return new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0, 10);
}

const fieldBaseClass =
  "h-10 w-full px-3 rounded-lg border border-[#E5ECE8] bg-white text-sm text-[#1D2A25] focus:outline-none focus:ring-2 focus:ring-[#5FA38D]/25 focus:border-[#5FA38D]";

const fieldTextareaClass =
  "w-full px-3 py-2 rounded-lg border border-[#E5ECE8] bg-white text-sm text-[#1D2A25] resize-y focus:outline-none focus:ring-2 focus:ring-[#5FA38D]/25 focus:border-[#5FA38D]";

export default function PaymentsPage() {
  const [payments, setPayments] = useState([]);
  const [clients, setClients] = useState([]);
  const [projects, setProjects] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [selectedClientId, setSelectedClientId] = useState("all");
  const [selectedStatus, setSelectedStatus] = useState("all");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    client_id: "",
    invoice_id: "",
    project_id: "",
    payment_date: todayISO(),
    amount: "",
    method: "Bank Transfer",
    reference_number: "",
    notes: "",
    status: "recorded",
  });

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const [{ data: paymentData }, { data: clientData }, { data: projectData }, { data: invoiceData }] = await Promise.all([
        api.get("/payments"),
        api.get("/clients"),
        api.get("/projects"),
        api.get("/invoices"),
      ]);
      setPayments(paymentData);
      setClients(clientData);
      setProjects(projectData);
      setInvoices(invoiceData);

      setForm((prev) => {
        const nextClient = prev.client_id || clientData[0]?.id || "";
        const nextInvoices = invoiceData.filter((invoice) => !nextClient || invoice.client_id === nextClient);
        return {
          ...prev,
          client_id: nextClient,
          invoice_id: prev.invoice_id || nextInvoices[0]?.id || "",
          project_id: prev.project_id || nextInvoices[0]?.project_id || "",
        };
      });
    } catch (e) {
      if (e?.response?.status !== 401) console.error("Payments load failed:", e);
      setError(e?.response?.data?.detail || "Unable to load payments.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const clientInvoices = useMemo(() => {
    if (!form.client_id) return invoices;
    return invoices.filter((invoice) => invoice.client_id === form.client_id);
  }, [invoices, form.client_id]);

  const clientProjects = useMemo(() => {
    if (!form.client_id) return projects;
    return projects.filter((project) => !project.client_id || project.client_id === form.client_id);
  }, [projects, form.client_id]);

  const filteredPayments = useMemo(() => {
    return payments.filter((payment) => {
      const clientMatch = selectedClientId === "all" || payment.client_id === selectedClientId;
      const statusMatch = selectedStatus === "all" || payment.status === selectedStatus;
      return clientMatch && statusMatch;
    });
  }, [payments, selectedClientId, selectedStatus]);

  const summary = useMemo(() => {
    const activeInvoices = invoices.filter((invoice) => invoice.status !== "cancelled");
    const overdueBalance = activeInvoices.filter((invoice) => invoice.status === "overdue").reduce((sum, invoice) => sum + Number(invoice.balance_due || 0), 0);
    const openBalance = activeInvoices.reduce((sum, invoice) => sum + Number(invoice.balance_due || 0), 0);
    const collected = payments.reduce((sum, payment) => sum + Number(payment.amount || 0), 0);
    const thisMonth = payments.filter((payment) => String(payment.payment_date || "").slice(0, 7) === todayISO().slice(0, 7)).reduce((sum, payment) => sum + Number(payment.amount || 0), 0);

    return {
      totalPayments: payments.length,
      collected,
      thisMonth,
      openBalance,
      overdueBalance,
      collectedByCurrency: summarizeAmountsByCurrency(payments, "amount"),
    };
  }, [invoices, payments]);

  const selectedClient = useMemo(
    () => clients.find((client) => client.id === form.client_id) || null,
    [clients, form.client_id]
  );

  const selectedInvoice = useMemo(
    () => invoices.find((invoice) => invoice.id === form.invoice_id) || null,
    [invoices, form.invoice_id]
  );

  const handleClientChange = (clientId) => {
    const nextInvoices = invoices.filter((invoice) => invoice.client_id === clientId);
    setForm((prev) => ({
      ...prev,
      client_id: clientId,
      invoice_id: nextInvoices[0]?.id || "",
      project_id: nextInvoices[0]?.project_id || "",
    }));
  };

  const handleInvoiceChange = (invoiceId) => {
    const invoice = invoices.find((item) => item.id === invoiceId) || null;
    setForm((prev) => ({
      ...prev,
      invoice_id: invoiceId,
      project_id: invoice?.project_id || prev.project_id,
      client_id: invoice?.client_id || prev.client_id,
    }));
  };

  const createPayment = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError("");

    if (!form.client_id || !form.invoice_id) {
      setSaving(false);
      setError("Select a client and invoice before recording the payment.");
      return;
    }

    try {
      await api.post("/payments", {
        client_id: form.client_id,
        invoice_id: form.invoice_id,
        project_id: form.project_id || null,
        payment_date: form.payment_date,
        amount: Number(form.amount || 0),
        method: form.method,
        reference_number: form.reference_number,
        notes: form.notes,
        status: form.status,
      });

      setForm((prev) => ({
        ...prev,
        amount: "",
        reference_number: "",
        notes: "",
        status: "recorded",
        payment_date: todayISO(),
      }));
      await load();
    } catch (e) {
      if (e?.response?.status !== 401) console.error("Payment create failed:", e);
      setError(e?.response?.data?.detail || "Failed to record payment.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="text-sm text-[#667C74]">Loading payments...</div>;
  }

  return (
    <div className="space-y-6 animate-fade-up" data-testid="payments-page">
      <div className="flex items-end justify-between flex-wrap gap-4">
        <div>
          <p className="text-sm text-[#667C74]">Track collections, history, and unpaid balances</p>
          <h1 className="font-display text-3xl sm:text-4xl font-bold text-[#1D2A25]">Payments</h1>
        </div>
        <div className="inline-flex items-center gap-2 text-xs px-3 h-9 rounded-lg border border-[#E5ECE8] bg-white text-[#42534d]">
          <CircleDollarSign className="w-3.5 h-3.5 text-[#5FA38D]" />
          {summary.totalPayments} recorded payments
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
        <SummaryCard title="Collected" value={summary.collectedByCurrency} hint="All recorded payments" />
        <SummaryCard title="This Month" value={formatMoney(summary.thisMonth)} hint="Payments collected so far" tone="success" />
        <SummaryCard title="Open Balance" value={formatMoney(summary.openBalance)} hint="All outstanding invoice balances" tone="warning" />
        <SummaryCard title="Overdue Balance" value={formatMoney(summary.overdueBalance)} hint="Invoices past due" tone="danger" />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)] gap-5 items-start">
        <div className="space-y-4">
          <section className="bg-white rounded-2xl border border-[#E5ECE8] p-5">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div>
                <h2 className="font-display text-xl font-semibold text-[#1D2A25]">Record payment</h2>
                <p className="text-sm text-[#667C74]">Apply payments to invoices and keep balances in sync.</p>
              </div>
              <button type="button" onClick={load} className="h-9 px-3 rounded-lg border border-[#E5ECE8] text-sm text-[#42534d] hover:bg-[#F7FAF8] inline-flex items-center gap-2">
                <RefreshCw className="w-4 h-4" /> Refresh data
              </button>
            </div>

            <form onSubmit={createPayment} className="mt-5 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <Field label="Client">
                  <select value={form.client_id} onChange={(e) => handleClientChange(e.target.value)} className={fieldBaseClass}>
                    <option value="">Select client</option>
                    {clients.map((client) => (
                      <option key={client.id} value={client.id}>{client.name}</option>
                    ))}
                  </select>
                </Field>
                <Field label="Invoice">
                  <select value={form.invoice_id} onChange={(e) => handleInvoiceChange(e.target.value)} className={fieldBaseClass}>
                    <option value="">Select invoice</option>
                    {clientInvoices.map((invoice) => (
                      <option key={invoice.id} value={invoice.id}>
                        {invoice.invoice_number} · {formatMoney(invoice.balance_due, invoice.currency)} due
                      </option>
                    ))}
                  </select>
                </Field>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                <Field label="Project">
                  <select value={form.project_id} onChange={(e) => setForm((prev) => ({ ...prev, project_id: e.target.value }))} className={fieldBaseClass}>
                    <option value="">No project</option>
                    {clientProjects.map((project) => (
                      <option key={project.id} value={project.id}>{project.name}</option>
                    ))}
                  </select>
                </Field>
                <Field label="Payment Date">
                  <input type="date" value={form.payment_date} onChange={(e) => setForm((prev) => ({ ...prev, payment_date: e.target.value }))} className={fieldBaseClass} />
                </Field>
                <Field label="Amount">
                  <input type="number" min="0" step="0.01" value={form.amount} onChange={(e) => setForm((prev) => ({ ...prev, amount: e.target.value }))} className={fieldBaseClass} />
                </Field>
                <Field label="Status">
                  <select value={form.status} onChange={(e) => setForm((prev) => ({ ...prev, status: e.target.value }))} className={fieldBaseClass}>
                    {PAYMENT_STATUS_OPTIONS.map((status) => (
                      <option key={status} value={status}>{paymentStatusLabel(status)}</option>
                    ))}
                  </select>
                </Field>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <Field label="Method">
                  <input value={form.method} onChange={(e) => setForm((prev) => ({ ...prev, method: e.target.value }))} className={fieldBaseClass} />
                </Field>
                <Field label="Reference Number">
                  <input value={form.reference_number} onChange={(e) => setForm((prev) => ({ ...prev, reference_number: e.target.value }))} className={fieldBaseClass} placeholder="Optional bank / transfer reference" />
                </Field>
              </div>

              <Field label="Notes">
                <textarea rows={3} value={form.notes} onChange={(e) => setForm((prev) => ({ ...prev, notes: e.target.value }))} className={fieldTextareaClass} placeholder="Optional payment notes" />
              </Field>

              {selectedClient && selectedInvoice && (
                <div className="rounded-xl border border-[#E5ECE8] bg-[#F7FAF8] p-4 text-sm text-[#42534d] space-y-1">
                  <div className="flex items-center justify-between gap-3"><span>Selected client</span><span className="font-medium text-[#1D2A25]">{selectedClient.name}</span></div>
                  <div className="flex items-center justify-between gap-3"><span>Selected invoice</span><span className="font-medium text-[#1D2A25]">{selectedInvoice.invoice_number}</span></div>
                  <div className="flex items-center justify-between gap-3"><span>Invoice balance</span><span className="font-semibold text-[#2f6f5a]">{formatMoney(selectedInvoice.balance_due, selectedInvoice.currency)}</span></div>
                </div>
              )}

              {error && <div className="text-sm text-red-700 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{error}</div>}

              <div className="flex items-center justify-end">
                <button type="submit" disabled={saving} className="h-10 px-4 rounded-lg bg-[#5FA38D] text-white text-sm font-medium hover:bg-[#4E8C79] transition-colors disabled:opacity-60 inline-flex items-center gap-2">
                  <Landmark className="w-4 h-4" />
                  {saving ? "Recording..." : "Record payment"}
                </button>
              </div>
            </form>
          </section>

          <section className="bg-white rounded-2xl border border-[#E5ECE8] p-5">
            <div className="flex items-center justify-between gap-3 flex-wrap mb-4">
              <div>
                <h2 className="font-display text-xl font-semibold text-[#1D2A25]">Payment history</h2>
                <p className="text-sm text-[#667C74]">Filter by client and status to review collections.</p>
              </div>
              <div className="flex items-center gap-2 text-xs text-[#667C74]">
                <Filter className="w-3.5 h-3.5" />
                {filteredPayments.length} results
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
              <Field label="Filter by client">
                <select value={selectedClientId} onChange={(e) => setSelectedClientId(e.target.value)} className={fieldBaseClass}>
                  <option value="all">All clients</option>
                  {clients.map((client) => (
                    <option key={client.id} value={client.id}>{client.name}</option>
                  ))}
                </select>
              </Field>
              <Field label="Filter by status">
                <select value={selectedStatus} onChange={(e) => setSelectedStatus(e.target.value)} className={fieldBaseClass}>
                  <option value="all">All statuses</option>
                  {PAYMENT_STATUS_OPTIONS.map((status) => (
                    <option key={status} value={status}>{paymentStatusLabel(status)}</option>
                  ))}
                </select>
              </Field>
            </div>

            <div className="overflow-hidden rounded-xl border border-[#E5ECE8]">
              <table className="w-full text-sm">
                <thead className="bg-[#F7FAF8] text-xs uppercase tracking-wider text-[#8EA39B] border-b border-[#E5ECE8]">
                  <tr>
                    <th className="text-left px-4 py-3 font-medium">Date</th>
                    <th className="text-left px-3 py-3 font-medium">Client</th>
                    <th className="text-left px-3 py-3 font-medium">Invoice</th>
                    <th className="text-left px-3 py-3 font-medium">Amount</th>
                    <th className="text-left px-3 py-3 font-medium">Status</th>
                    <th className="text-left px-3 py-3 font-medium">Remaining</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredPayments.map((payment) => {
                    const client = clients.find((item) => item.id === payment.client_id);
                    const invoice = invoices.find((item) => item.id === payment.invoice_id);
                    const project = projects.find((item) => item.id === payment.project_id);
                    return (
                      <tr key={payment.id} className="border-b border-[#F1F5F3] last:border-b-0">
                        <td className="px-4 py-3 text-[#42534d]">{payment.payment_date}</td>
                        <td className="px-3 py-3">
                          <div className="font-medium text-[#1D2A25]">{client?.name || "Unknown client"}</div>
                          <div className="text-xs text-[#8EA39B]">{project?.name || "No project"}</div>
                        </td>
                        <td className="px-3 py-3">
                          <Link to={invoice ? `/invoices/${invoice.id}` : "/invoices"} className="font-medium text-[#2f6f5a] hover:underline">
                            {invoice?.invoice_number || payment.invoice_id}
                          </Link>
                          <div className="text-xs text-[#8EA39B]">{payment.reference_number || "No reference"}</div>
                        </td>
                        <td className="px-3 py-3 font-medium text-[#1D2A25]">{formatMoney(payment.amount, invoice?.currency || "USD")}</td>
                        <td className="px-3 py-3">
                          <span className={`inline-flex items-center px-2 py-1 rounded-full border text-xs font-medium ${paymentStatusBadgeClass(payment.status)}`}>
                            {paymentStatusLabel(payment.status)}
                          </span>
                        </td>
                        <td className="px-3 py-3 text-[#2f6f5a]">{formatMoney(payment.remaining_balance, invoice?.currency || "USD")}</td>
                      </tr>
                    );
                  })}
                  {filteredPayments.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-4 py-12 text-center text-[#8EA39B] italic">No payments match the current filters.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </div>

        <aside className="space-y-4">
          <section className="bg-white rounded-2xl border border-[#E5ECE8] p-5">
            <h2 className="font-display text-lg font-semibold text-[#1D2A25]">Client balance snapshot</h2>
            <div className="mt-3 space-y-3">
              {clients.slice(0, 8).map((client) => {
                const clientInvoices = invoices.filter((invoice) => invoice.client_id === client.id && invoice.status !== "cancelled");
                const clientPayments = payments.filter((payment) => payment.client_id === client.id);
                const balance = clientInvoices.reduce((sum, invoice) => sum + Number(invoice.balance_due || 0), 0);
                return (
                  <button key={client.id} type="button" onClick={() => setSelectedClientId(client.id)} className={`w-full text-left rounded-xl border px-3 py-3 transition ${selectedClientId === client.id ? "border-[#5FA38D] bg-[#F0F8F4]" : "border-[#E5ECE8] hover:bg-[#F7FAF8]"}`}>
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <div className="font-medium text-[#1D2A25]">{client.name}</div>
                        <div className="text-xs text-[#8EA39B]">{clientPayments.length} payments</div>
                      </div>
                      <div className={`font-semibold ${balance > 0 ? "text-[#9a3838]" : "text-[#1f6a42]"}`}>{formatMoney(balance, clientInvoices[0]?.currency || "USD")}</div>
                    </div>
                  </button>
                );
              })}
              {clients.length === 0 && <div className="text-sm text-[#8EA39B] italic text-center py-6">No clients available.</div>}
            </div>
          </section>

          <section className="rounded-2xl border border-[#E5ECE8] bg-[#FFF9F3] p-5 text-sm text-[#8A5A2B]">
            <div className="flex items-center gap-2 font-medium text-[#8A5A2B]">
              <AlertTriangle className="w-4 h-4" />
              Operational note
            </div>
            <p className="mt-2 text-[#8A5A2B]/90">
              Payments automatically reduce invoice balances and can mark an invoice as paid when the balance reaches zero.
            </p>
          </section>
        </aside>
      </div>
    </div>
  );
}

function SummaryCard({ title, value, hint, tone = "default" }) {
  const toneClass =
    tone === "success"
      ? "text-[#1f6a42]"
      : tone === "warning"
      ? "text-[#8A5A2B]"
      : tone === "danger"
      ? "text-[#9a3838]"
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
