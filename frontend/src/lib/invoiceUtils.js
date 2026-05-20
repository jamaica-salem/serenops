const FALLBACK_CURRENCY = "USD";

export const INVOICE_STATUS_OPTIONS = [
  "draft",
  "sent",
  "paid",
  "partially_paid",
  "overdue",
  "cancelled",
];

export const INVOICE_CURRENCY_OPTIONS = ["USD", "EUR", "GBP", "AUD", "CAD", "JPY", "PHP", "SGD", "NZD", "OTHER"];

export function formatMoney(value, currency = FALLBACK_CURRENCY) {
  const amount = Number(value || 0);
  if (!Number.isFinite(amount)) return "0.00";

  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency || FALLBACK_CURRENCY,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    return `$${amount.toFixed(2)}`;
  }
}

export function formatDate(value) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString();
}

export function invoiceStatusLabel(status) {
  return String(status || "draft").replace(/_/g, " ");
}

export function invoiceStatusBadgeClass(status) {
  const value = String(status || "draft");
  if (value === "paid") return "bg-[#6FCF97]/20 text-[#1f6a42] border-[#6FCF97]/30";
  if (value === "partially_paid") return "bg-[#D4A373]/18 text-[#8A5A2B] border-[#D4A373]/35";
  if (value === "overdue") return "bg-[#D97C7C]/15 text-[#9a3838] border-[#D97C7C]/30";
  if (value === "cancelled") return "bg-[#E5ECE8] text-[#667C74] border-[#D7E0DB]";
  if (value === "sent") return "bg-[#5FA38D]/16 text-[#2f6f5a] border-[#5FA38D]/30";
  return "bg-[#E8F3EE] text-[#2F6F5A] border-[#D3E7DE]";
}

export function calculateInvoiceTotals(invoice) {
  const lineItems = invoice?.line_items || [];
  const subtotal = lineItems.reduce((sum, item) => {
    const quantity = Number(item.quantity || 0);
    const rate = Number(item.rate || 0);
    return sum + quantity * rate;
  }, 0);
  const discount = Number(invoice?.discount || 0);
  const taxFees = Number(invoice?.tax_fees || 0);
  const amountPaid = Number(invoice?.amount_paid || 0);
  const total = Math.max(0, subtotal - discount + taxFees);
  const balanceDue = Math.max(0, total - amountPaid);

  return {
    subtotal,
    discount,
    taxFees,
    total,
    amountPaid,
    balanceDue,
  };
}

export function summarizeAmountsByCurrency(items, field) {
  const sums = items.reduce((acc, item) => {
    const code = item?.currency || FALLBACK_CURRENCY;
    const amount = Number(item?.[field] || 0);
    if (!Number.isFinite(amount)) return acc;
    acc[code] = (acc[code] || 0) + amount;
    return acc;
  }, {});

  const entries = Object.entries(sums);
  if (!entries.length) return "-";
  return entries.map(([code, amount]) => `${code} ${amount.toFixed(2)}`).join(" | ");
}