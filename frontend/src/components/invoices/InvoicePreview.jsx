import { Banknote, CalendarRange, FileText, ReceiptText } from "lucide-react";
import {
  calculateInvoiceTotals,
  formatDate,
  formatMoney,
  invoiceStatusBadgeClass,
  invoiceStatusLabel,
} from "../../lib/invoiceUtils";

export default function InvoicePreview({ invoice, client, project, provider }) {
  const totals = calculateInvoiceTotals(invoice);
  const lineItems = invoice?.line_items || [];

  return (
    <section className="bg-card rounded-2xl border border-border shadow-[0_8px_24px_rgba(29,42,37,0.04)] overflow-hidden">
      <div className="bg-gradient-to-r from-primary to-primary/80 px-5 py-4 text-white">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.22em] text-primary-foreground/70">Invoice preview</p>
            <h3 className="mt-1 text-xl font-display font-semibold text-foreground">{invoice?.invoice_number || "Invoice"}</h3>
            <p className="text-sm text-primary-foreground/80 mt-1">Export-ready summary for client-facing review.</p>
          </div>
          <span className={`inline-flex items-center px-2.5 py-1 rounded-full border text-xs font-medium ${invoiceStatusBadgeClass(invoice?.status)}`}>
            {invoiceStatusLabel(invoice?.status)}
          </span>
        </div>
      </div>

      <div className="p-5 space-y-5">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <InfoBlock
            icon={ReceiptText}
            label="Bill to"
            value={client?.name || "No client selected"}
            secondary={client?.company_name || client?.email || "Add a client to complete the preview."}
          />
          <InfoBlock
            icon={CalendarRange}
            label="Dates"
            value={`${formatDate(invoice?.issue_date)} to ${formatDate(invoice?.due_date)}`}
            secondary={project?.name ? `Project: ${project.name}` : "No linked project"}
          />
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Metric label="Subtotal" value={formatMoney(totals.subtotal, invoice?.currency)} />
          <Metric label="Discount" value={formatMoney(totals.discount, invoice?.currency)} tone="warning" />
          <Metric label="Paid" value={formatMoney(totals.amountPaid, invoice?.currency)} tone="success" />
          <Metric label="Balance" value={formatMoney(totals.balanceDue, invoice?.currency)} tone={totals.balanceDue > 0 ? "danger" : "success"} />
        </div>

        <div className="overflow-hidden rounded-xl border border-border">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-xs uppercase tracking-wider text-muted-foreground border-b border-border">
              <tr>
                <th className="text-left px-4 py-3 font-medium">Description</th>
                <th className="text-right px-3 py-3 font-medium">Qty</th>
                <th className="text-right px-3 py-3 font-medium">Rate</th>
                <th className="text-right px-4 py-3 font-medium">Amount</th>
              </tr>
            </thead>
            <tbody>
              {lineItems.map((item, index) => {
                const quantity = Number(item.quantity || 0);
                const rate = Number(item.rate || 0);
                return (
                  <tr key={`${item.description || "item"}-${index}`} className="border-b border-border/60 last:border-b-0">
                    <td className="px-4 py-3 text-foreground">{item.description || "-"}</td>
                    <td className="px-3 py-3 text-right text-muted-foreground">{quantity}</td>
                    <td className="px-3 py-3 text-right text-muted-foreground">{formatMoney(rate, invoice?.currency)}</td>
                    <td className="px-4 py-3 text-right text-foreground font-medium">{formatMoney(quantity * rate, invoice?.currency)}</td>
                  </tr>
                );
              })}
              {lineItems.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-4 py-10 text-center text-muted-foreground italic">
                    No line items added yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="rounded-xl border border-border bg-muted/40 p-4">
            <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-muted-foreground">
              <Banknote className="w-3.5 h-3.5" />
              Payment details
            </div>
            <div className="mt-3 space-y-2 text-sm text-muted-foreground">
              <div className="flex items-center justify-between gap-3">
                <span>Payment method</span>
                <span className="font-medium text-foreground">{invoice?.payment_method || "—"}</span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span>Amount paid</span>
                <span className="font-medium text-foreground">{formatMoney(totals.amountPaid, invoice?.currency)}</span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span>Balance due</span>
                <span className={`font-semibold ${totals.balanceDue > 0 ? "text-destructive" : "text-emerald-700 dark:text-emerald-400"}`}>
                  {formatMoney(totals.balanceDue, invoice?.currency)}
                </span>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-border p-4">
            <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-muted-foreground">
              <FileText className="w-3.5 h-3.5" />
              Notes
            </div>
            <p className="mt-3 text-sm text-muted-foreground whitespace-pre-wrap min-h-20">
              {invoice?.notes || "No notes added yet."}
            </p>
            {provider?.name && (
              <p className="mt-4 text-xs text-muted-foreground">
                Prepared by {provider.name}
                {provider.email ? ` · ${provider.email}` : ""}
              </p>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

function Metric({ label, value, tone = "default" }) {
  const toneClass =
    tone === "warning"
      ? "text-amber-700 dark:text-amber-400"
      : tone === "success"
      ? "text-emerald-700 dark:text-emerald-400"
      : tone === "danger"
      ? "text-destructive"
      : "text-foreground";

  return (
    <div className="rounded-xl border border-border bg-muted/40 p-3">
      <div className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className={`mt-1 text-base font-semibold ${toneClass}`}>{value}</div>
    </div>
  );
}

function InfoBlock({ icon: Icon, label, value, secondary }) {
  return (
    <div className="rounded-xl border border-border p-4">
      <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-muted-foreground">
        <Icon className="w-3.5 h-3.5" />
        {label}
      </div>
      <div className="mt-2 font-semibold text-foreground">{value}</div>
      <div className="mt-1 text-sm text-muted-foreground">{secondary}</div>
    </div>
  );
}
