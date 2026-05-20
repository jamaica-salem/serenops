import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

function money(v) {
  const n = Number(v || 0);
  return Number.isFinite(n) ? n.toFixed(2) : "0.00";
}

function formatDate(value) {
  if (!value) return "-";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString();
}

export function downloadInvoicePdf({ invoice, client, provider }) {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 48;

  doc.setFillColor(15, 43, 36);
  doc.rect(0, 0, pageWidth, 92, "F");

  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(24);
  doc.text("INVOICE", margin, 56);

  doc.setFontSize(11);
  doc.setFont("helvetica", "normal");
  doc.text(provider?.name || "SerenOps", pageWidth - margin, 44, { align: "right" });
  if (provider?.email) doc.text(provider.email, pageWidth - margin, 58, { align: "right" });
  if (provider?.phone) doc.text(provider.phone, pageWidth - margin, 72, { align: "right" });

  let y = 126;
  doc.setTextColor(29, 42, 37);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text("BILL TO", margin, y);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  y += 16;
  doc.text(client?.name || "-", margin, y);
  if (client?.company_name) {
    y += 14;
    doc.text(client.company_name, margin, y);
  }
  if (client?.email) {
    y += 14;
    doc.text(client.email, margin, y);
  }

  let metaY = 126;
  const metaX = pageWidth - margin - 180;
  doc.setFont("helvetica", "bold");
  doc.text("Invoice #", metaX, metaY);
  doc.text("Issue Date", metaX, metaY + 18);
  doc.text("Due Date", metaX, metaY + 36);
  doc.text("Status", metaX, metaY + 54);

  doc.setFont("helvetica", "normal");
  doc.text(invoice.invoice_number || "-", metaX + 78, metaY);
  doc.text(formatDate(invoice.issue_date), metaX + 78, metaY + 18);
  doc.text(formatDate(invoice.due_date), metaX + 78, metaY + 36);
  doc.text(String(invoice.status || "draft").replace(/_/g, " "), metaX + 78, metaY + 54);

  autoTable(doc, {
    startY: 220,
    theme: "grid",
    styles: {
      fontSize: 10,
      textColor: [29, 42, 37],
      lineColor: [229, 236, 232],
      lineWidth: 1,
      cellPadding: 8,
    },
    headStyles: {
      fillColor: [239, 246, 242],
      textColor: [29, 42, 37],
      fontStyle: "bold",
    },
    head: [["Description", "Qty", "Rate", "Amount"]],
    body: (invoice.line_items || []).map((item) => {
      const qty = Number(item.quantity || 0);
      const rate = Number(item.rate || 0);
      return [
        item.description || "-",
        String(qty),
        `$${money(rate)}`,
        `$${money(qty * rate)}`,
      ];
    }),
    columnStyles: {
      1: { halign: "right", cellWidth: 60 },
      2: { halign: "right", cellWidth: 90 },
      3: { halign: "right", cellWidth: 100 },
    },
    margin: { left: margin, right: margin },
  });

  const finalY = doc.lastAutoTable?.finalY || 260;
  const rightX = pageWidth - margin - 220;
  let totalsY = finalY + 28;

  const totals = [
    ["Subtotal", `$${money(invoice.subtotal)}`],
    ["Discount", `-$${money(invoice.discount)}`],
    ["Tax / Fees", `$${money(invoice.tax_fees)}`],
    ["Total", `$${money(invoice.total)}`],
    ["Amount Paid", `$${money(invoice.amount_paid)}`],
    ["Balance Due", `$${money(invoice.balance_due)}`],
  ];

  totals.forEach(([label, value], idx) => {
    const isTotal = label === "Total" || label === "Balance Due";
    doc.setFont("helvetica", isTotal ? "bold" : "normal");
    doc.setFontSize(isTotal ? 11 : 10);
    doc.text(label, rightX, totalsY + idx * 18);
    doc.text(value, pageWidth - margin, totalsY + idx * 18, { align: "right" });
  });

  const notesY = totalsY + totals.length * 18 + 24;
  if (invoice.payment_method || invoice.notes) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.text("Payment Details", margin, notesY);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    if (invoice.payment_method) {
      doc.text(`Method: ${invoice.payment_method}`, margin, notesY + 16);
    }
    if (invoice.notes) {
      const split = doc.splitTextToSize(`Notes: ${invoice.notes}`, pageWidth - margin * 2);
      doc.text(split, margin, notesY + (invoice.payment_method ? 32 : 16));
    }
  }

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(102, 124, 116);
  doc.text("Thank you for your business.", margin, doc.internal.pageSize.getHeight() - 28);

  const safeNumber = (invoice.invoice_number || "invoice").replace(/[^\w-]/g, "_");
  doc.save(`${safeNumber}.pdf`);
}

