import { useEffect, useState } from "react";
import api from "../lib/api";

function money(v) {
  const n = Number(v || 0);
  return Number.isFinite(n) ? n.toFixed(2) : "0.00";
}

export default function InvoicesPage() {
  const [invoices, setInvoices] = useState([]);

  const load = async () => {
    try {
      const { data } = await api.get("/invoices");
      setInvoices(data);
    } catch (e) {
      if (e?.response?.status !== 401) console.error("Invoices load failed:", e);
    }
  };

  useEffect(() => { load(); }, []);

  return (
    <div className="space-y-5 animate-fade-up" data-testid="invoices-page">
      <div>
        <p className="text-sm text-gray-500">Track balances and payment status</p>
        <h1 className="font-display text-3xl sm:text-4xl font-bold text-gray-900">Invoices</h1>
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="text-xs uppercase tracking-wider text-gray-500 border-b border-gray-100">
            <tr>
              <th className="text-left px-5 py-3">Invoice</th>
              <th className="text-left px-3 py-3">Status</th>
              <th className="text-left px-3 py-3">Total</th>
              <th className="text-left px-3 py-3">Paid</th>
              <th className="text-left px-3 py-3">Balance</th>
              <th className="text-left px-3 py-3">Due</th>
            </tr>
          </thead>
          <tbody>
            {invoices.map((i) => (
              <tr key={i.id} className="border-b border-gray-50">
                <td className="px-5 py-3">
                  <div className="font-medium">{i.invoice_number}</div>
                  <div className="text-xs text-gray-500">{i.issue_date}</div>
                </td>
                <td className="px-3 py-3">{String(i.status || "").replace(/_/g, " ")}</td>
                <td className="px-3 py-3">{money(i.total)}</td>
                <td className="px-3 py-3">{money(i.amount_paid)}</td>
                <td className="px-3 py-3">{money(i.balance_due)}</td>
                <td className="px-3 py-3">{i.due_date}</td>
              </tr>
            ))}
            {invoices.length === 0 && (
              <tr><td colSpan={6} className="text-center text-gray-400 py-12 text-sm italic">No invoices yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
