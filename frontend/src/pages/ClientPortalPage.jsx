import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import {
  BadgeCheck,
  Building2,
  CheckCircle2,
  Clock3,
  Landmark,
  Mail,
  MessageCircle,
  Rocket,
  ShieldCheck,
} from "lucide-react";
import api from "../lib/api";
import { formatMoney } from "../lib/invoiceUtils";
import { contractStatusBadgeClass, contractStatusLabel } from "../lib/contractUtils";

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

export default function ClientPortalPage() {
  const { token } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionError, setActionError] = useState("");
  const [actionSuccess, setActionSuccess] = useState("");
  const [signatures, setSignatures] = useState({});
  const [payments, setPayments] = useState({});
  const [feedback, setFeedback] = useState({ message: "", rating: "" });
  const [proposalNotes, setProposalNotes] = useState({});
  const [busy, setBusy] = useState({});

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const { data: portalData } = await api.get(`/portal/${token}`);
      setData(portalData);
      setPayments((prev) => {
        const next = { ...prev };
        portalData?.invoices?.forEach((invoice) => {
          if (!next[invoice.id]) {
            next[invoice.id] = {
              amount: invoice.balance_due || 0,
              method: "Bank Transfer",
              payment_date: todayIso(),
              reference_number: "",
              notes: "",
            };
          }
        });
        return next;
      });
    } catch (e) {
      setError(e?.response?.data?.detail || "This portal link is unavailable.");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    load();
  }, [load]);

  const summary = useMemo(() => {
    const proposals = data?.proposals || [];
    const contracts = data?.contracts || [];
    const invoices = data?.invoices || [];
    const tasks = data?.tasks || [];
    return {
      pendingProposals: proposals.filter((p) => ["draft", "sent"].includes(p.status)).length,
      pendingContracts: contracts.filter((c) => ["draft", "sent"].includes(c.status)).length,
      unpaidInvoices: invoices.filter((i) => Number(i.balance_due || 0) > 0 && i.status !== "cancelled").length,
      openTasks: tasks.filter((t) => t.status !== "done").length,
      activeProjects: (data?.projects || []).filter((p) => p.status !== "completed").length,
    };
  }, [data]);

  const handleSignatureChange = (contractId, field, value) => {
    setSignatures((prev) => ({
      ...prev,
      [contractId]: { ...prev[contractId], [field]: value },
    }));
  };

  const handleSignatureFile = (contractId, file) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      handleSignatureChange(contractId, "signature_type", "uploaded");
      handleSignatureChange(contractId, "signature_value", String(reader.result || ""));
    };
    reader.readAsDataURL(file);
  };

  const signContract = async (contractId) => {
    const payload = signatures[contractId] || {};
    if (!payload.signer_name) {
      setActionError("Add the signer name before submitting the contract.");
      return;
    }
    setBusy((prev) => ({ ...prev, [contractId]: true }));
    setActionError("");
    setActionSuccess("");
    try {
      await api.post(`/portal/${token}/contracts/${contractId}/sign`, {
        signer_name: payload.signer_name,
        signature_type: payload.signature_type || "typed",
        signature_value: payload.signature_value || payload.signer_name,
      });
      setActionSuccess("Contract signed. Thank you!");
      await load();
    } catch (e) {
      setActionError(e?.response?.data?.detail || "Unable to sign the contract.");
    } finally {
      setBusy((prev) => ({ ...prev, [contractId]: false }));
    }
  };

  const decideProposal = async (proposalId, status) => {
    setBusy((prev) => ({ ...prev, [proposalId]: true }));
    setActionError("");
    setActionSuccess("");
    try {
      await api.post(`/portal/${token}/proposals/${proposalId}/decision`, {
        status,
        notes: proposalNotes[proposalId] || "",
      });
      setActionSuccess(`Proposal ${status}.`);
      setProposalNotes((prev) => ({ ...prev, [proposalId]: "" }));
      await load();
    } catch (e) {
      setActionError(e?.response?.data?.detail || "Unable to update proposal.");
    } finally {
      setBusy((prev) => ({ ...prev, [proposalId]: false }));
    }
  };

  const recordPayment = async (invoiceId) => {
    const payload = payments[invoiceId];
    if (!payload || Number(payload.amount || 0) <= 0) {
      setActionError("Enter a valid payment amount.");
      return;
    }
    setBusy((prev) => ({ ...prev, [invoiceId]: true }));
    setActionError("");
    setActionSuccess("");
    try {
      await api.post(`/portal/${token}/invoices/${invoiceId}/pay`, {
        amount: Number(payload.amount || 0),
        method: payload.method,
        payment_date: payload.payment_date,
        reference_number: payload.reference_number,
        notes: payload.notes,
      });
      setActionSuccess("Payment recorded. We will confirm shortly.");
      await load();
    } catch (e) {
      setActionError(e?.response?.data?.detail || "Unable to record payment.");
    } finally {
      setBusy((prev) => ({ ...prev, [invoiceId]: false }));
    }
  };

  const formatDate = (value) => {
    if (!value) return "N/A";
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? value : d.toLocaleDateString();
  };

  const submitFeedback = async () => {
    if (!feedback.message.trim()) {
      setActionError("Add your feedback before submitting.");
      return;
    }
    setBusy((prev) => ({ ...prev, feedback: true }));
    setActionError("");
    setActionSuccess("");
    try {
      await api.post(`/portal/${token}/feedback`, {
        message: feedback.message.trim(),
        rating: feedback.rating ? Number(feedback.rating) : undefined,
      });
      setFeedback({ message: "", rating: "" });
      setActionSuccess("Feedback received. Thank you!");
      await load();
    } catch (e) {
      setActionError(e?.response?.data?.detail || "Unable to send feedback.");
    } finally {
      setBusy((prev) => ({ ...prev, feedback: false }));
    }
  };

  if (loading) {
    return <div className="p-6 text-sm text-[#667C74]">Loading client portal...</div>;
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F7FAF8] p-6">
        <div className="max-w-md w-full bg-white border border-[#E5ECE8] rounded-2xl p-6 text-center">
          <h1 className="font-display text-2xl font-bold text-[#1D2A25]">Portal unavailable</h1>
          <p className="text-sm text-[#667C74] mt-2">{error}</p>
        </div>
      </div>
    );
  }

  const client = data?.client || {};

  return (
    <div className="min-h-screen bg-[#F6FAF8] text-[#1D2A25]">
      <div className="bg-gradient-to-r from-[#0F2B24] via-[#123C31] to-[#1C4B3E] text-white">
        <div className="max-w-6xl mx-auto px-6 py-10">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <div className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.25em] text-[#C5D7D0]">
                <ShieldCheck className="w-4 h-4" /> SerenOps Client Portal
              </div>
              <h1 className="mt-3 font-display text-3xl sm:text-4xl font-bold">{client.name}</h1>
              <div className="mt-2 text-sm text-[#D5E2DC] flex flex-wrap gap-3">
                <span className="inline-flex items-center gap-2"><Building2 className="w-4 h-4" /> {client.company_name || "Independent"}</span>
                {client.email && <span className="inline-flex items-center gap-2"><Mail className="w-4 h-4" /> {client.email}</span>}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <SummaryCard label="Pending approvals" value={summary.pendingProposals + summary.pendingContracts} />
              <SummaryCard label="Unpaid invoices" value={summary.unpaidInvoices} />
              <SummaryCard label="Open tasks" value={summary.openTasks} />
              <SummaryCard label="Active projects" value={summary.activeProjects} />
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-8 space-y-6">
        {actionError && <Alert tone="error" text={actionError} />}
        {actionSuccess && <Alert tone="success" text={actionSuccess} />}

        <div className="grid grid-cols-1 lg:grid-cols-[1.1fr_0.9fr] gap-6">
          <section className="bg-white rounded-2xl border border-[#E5ECE8] p-5 space-y-4">
            <header className="flex items-center justify-between">
              <div>
                <h2 className="font-display text-xl font-semibold">Approvals</h2>
                <p className="text-sm text-[#667C74]">Review proposals and sign contracts.</p>
              </div>
              <Badge icon={BadgeCheck} label="Action required" />
            </header>

            <div className="space-y-4">
              {(data?.proposals || []).map((proposal) => (
                <div key={proposal.id} className="rounded-xl border border-[#E5ECE8] p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-sm text-[#667C74]">Proposal</div>
                      <div className="font-medium">{proposal.project_title}</div>
                      <div className="text-xs text-[#8EA39B] mt-1">Status: {proposal.status}</div>
                    </div>
                    <div className="flex gap-2">
                      {["approved", "rejected"].includes(proposal.status) && (
                        <span className="inline-flex items-center px-2.5 h-9 rounded-lg bg-[#F4F8F6] text-[#51645D] text-xs">
                          Finalized
                        </span>
                      )}
                      <button
                        type="button"
                        onClick={() => decideProposal(proposal.id, "approved")}
                        disabled={busy[proposal.id] || ["approved", "rejected"].includes(proposal.status)}
                        className="h-9 px-3 rounded-lg bg-[#5FA38D] text-white text-xs font-medium hover:bg-[#4E8C79] disabled:opacity-60"
                      >
                        Approve
                      </button>
                      <button
                        type="button"
                        onClick={() => decideProposal(proposal.id, "rejected")}
                        disabled={busy[proposal.id] || ["approved", "rejected"].includes(proposal.status)}
                        className="h-9 px-3 rounded-lg border border-[#F0D9D9] text-[#9A3838] text-xs font-medium hover:bg-[#FFF6F6] disabled:opacity-60"
                      >
                        Reject
                      </button>
                    </div>
                  </div>
                  {!["approved", "rejected"].includes(proposal.status) && (
                    <textarea
                      rows={2}
                      value={proposalNotes[proposal.id] || ""}
                      onChange={(e) => setProposalNotes((prev) => ({ ...prev, [proposal.id]: e.target.value }))}
                      className="mt-3 w-full px-3 py-2 rounded-lg border border-[#E5ECE8] text-sm"
                      placeholder="Optional note for your decision"
                    />
                  )}
                  {proposal.scope_of_work && (
                    <p className="text-sm text-[#42534d] mt-3 whitespace-pre-wrap">{proposal.scope_of_work}</p>
                  )}
                </div>
              ))}
              {(data?.proposals || []).length === 0 && (data?.contracts || []).length === 0 && (
                <div className="rounded-xl border border-dashed border-[#D6E4DE] p-5 text-sm text-[#667C74]">
                  No approvals pending right now.
                </div>
              )}

              {(data?.contracts || []).map((contract) => {
                const signature = signatures[contract.id] || {};
                const isSigned = contract.status === "signed";
                return (
                  <div key={contract.id} className="rounded-xl border border-[#E5ECE8] p-4 space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="text-sm text-[#667C74]">Contract</div>
                        <div className="font-medium">{contract.title}</div>
                        <span className={`mt-2 inline-flex items-center px-2.5 py-1 rounded-full border text-xs font-medium ${contractStatusBadgeClass(contract.status)}`}>
                          {contractStatusLabel(contract.status)}
                        </span>
                      </div>
                      {isSigned && (
                        <span className="inline-flex items-center gap-2 text-xs text-[#1f6a42]">
                          <CheckCircle2 className="w-4 h-4" /> Signed
                        </span>
                      )}
                    </div>

                    {!isSigned && (
                      <div className="grid grid-cols-1 md:grid-cols-[1fr_auto] gap-3">
                        <div>
                          <label className="text-xs font-medium text-[#667C74]">Signer name</label>
                          <input
                            value={signature.signer_name || ""}
                            onChange={(e) => handleSignatureChange(contract.id, "signer_name", e.target.value)}
                            className="mt-1 w-full h-10 px-3 rounded-lg border border-[#E5ECE8] text-sm"
                            placeholder="Full name"
                          />
                        </div>
                        <button
                          type="button"
                          onClick={() => signContract(contract.id)}
                          disabled={busy[contract.id]}
                          className="h-10 px-4 rounded-lg bg-[#1C4B3E] text-white text-sm font-medium hover:bg-[#163A30] disabled:opacity-60"
                        >
                          {busy[contract.id] ? "Submitting..." : "Sign contract"}
                        </button>
                      </div>
                    )}

                    {!isSigned && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div>
                          <label className="text-xs font-medium text-[#667C74]">Typed signature</label>
                          <input
                            value={signature.signature_type === "uploaded" ? "" : (signature.signature_value || "")}
                            onChange={(e) => {
                              handleSignatureChange(contract.id, "signature_type", "typed");
                              handleSignatureChange(contract.id, "signature_value", e.target.value);
                            }}
                            className="mt-1 w-full h-10 px-3 rounded-lg border border-[#E5ECE8] text-sm"
                            placeholder="Type your signature"
                          />
                        </div>
                        <div>
                          <label className="text-xs font-medium text-[#667C74]">Upload signature</label>
                          <input
                            type="file"
                            accept="image/*"
                            onChange={(e) => handleSignatureFile(contract.id, e.target.files?.[0])}
                            className="mt-1 w-full h-10 px-3 py-2 rounded-lg border border-[#E5ECE8] text-xs"
                          />
                        </div>
                      </div>
                    )}

                    {signature.signature_type === "uploaded" && signature.signature_value && (
                      <div className="rounded-lg border border-dashed border-[#CFE0D9] p-3 bg-[#F7FAF8]">
                        <div className="text-xs text-[#667C74]">Signature preview</div>
                        <img src={signature.signature_value} alt="Signature preview" className="mt-2 max-h-24" />
                      </div>
                    )}

                    {contract.signed_by && contract.signed_at && (
                      <div className="text-xs text-[#667C74]">Signed by {contract.signed_by} on {new Date(contract.signed_at).toLocaleDateString()}.</div>
                    )}
                  </div>
                );
              })}
            </div>
          </section>

          <section className="space-y-6">
            <div className="bg-white rounded-2xl border border-[#E5ECE8] p-5 space-y-3">
              <div>
                <h2 className="font-display text-xl font-semibold">Invoices & Payments</h2>
                <p className="text-sm text-[#667C74]">Record payments and see outstanding balances.</p>
              </div>

              {(data?.invoices || []).map((invoice) => (
                <div key={invoice.id} className="rounded-xl border border-[#E5ECE8] p-4 space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-sm text-[#667C74]">Invoice {invoice.invoice_number}</div>
                      <div className="text-xs text-[#8EA39B]">Due {invoice.due_date}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-semibold">{formatMoney(invoice.balance_due, invoice.currency)}</div>
                      <div className="text-xs text-[#8EA39B]">Status: {invoice.status}</div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={payments[invoice.id]?.amount ?? ""}
                      onChange={(e) => setPayments((prev) => ({
                        ...prev,
                        [invoice.id]: { ...prev[invoice.id], amount: e.target.value },
                      }))}
                      className="h-10 px-3 rounded-lg border border-[#E5ECE8] text-sm"
                      placeholder="Payment amount"
                    />
                    <input
                      value={payments[invoice.id]?.method ?? ""}
                      onChange={(e) => setPayments((prev) => ({
                        ...prev,
                        [invoice.id]: { ...prev[invoice.id], method: e.target.value },
                      }))}
                      className="h-10 px-3 rounded-lg border border-[#E5ECE8] text-sm"
                      placeholder="Payment method"
                    />
                    <input
                      type="date"
                      value={payments[invoice.id]?.payment_date ?? ""}
                      onChange={(e) => setPayments((prev) => ({
                        ...prev,
                        [invoice.id]: { ...prev[invoice.id], payment_date: e.target.value },
                      }))}
                      className="h-10 px-3 rounded-lg border border-[#E5ECE8] text-sm"
                    />
                    <input
                      value={payments[invoice.id]?.reference_number ?? ""}
                      onChange={(e) => setPayments((prev) => ({
                        ...prev,
                        [invoice.id]: { ...prev[invoice.id], reference_number: e.target.value },
                      }))}
                      className="h-10 px-3 rounded-lg border border-[#E5ECE8] text-sm"
                      placeholder="Reference"
                    />
                  </div>
                  <textarea
                    rows={2}
                    value={payments[invoice.id]?.notes ?? ""}
                    onChange={(e) => setPayments((prev) => ({
                      ...prev,
                      [invoice.id]: { ...prev[invoice.id], notes: e.target.value },
                    }))}
                    className="w-full px-3 py-2 rounded-lg border border-[#E5ECE8] text-sm"
                    placeholder="Payment notes"
                  />

                  <button
                    type="button"
                    onClick={() => recordPayment(invoice.id)}
                    disabled={busy[invoice.id] || Number(invoice.balance_due || 0) <= 0 || invoice.status === "cancelled"}
                    className="h-10 px-4 rounded-lg bg-[#5FA38D] text-white text-sm font-medium hover:bg-[#4E8C79] disabled:opacity-60 inline-flex items-center gap-2"
                  >
                    <Landmark className="w-4 h-4" /> {busy[invoice.id] ? "Submitting..." : "Record payment"}
                  </button>
                </div>
              ))}
              {(data?.invoices || []).length === 0 && (
                <div className="rounded-xl border border-dashed border-[#D6E4DE] p-5 text-sm text-[#667C74]">
                  No invoices shared in this portal.
                </div>
              )}
            </div>

            <div className="bg-white rounded-2xl border border-[#E5ECE8] p-5 space-y-3">
              <div>
                <h2 className="font-display text-xl font-semibold">Progress snapshot</h2>
                <p className="text-sm text-[#667C74]">Recent tasks and activity for this engagement.</p>
              </div>
              <div className="space-y-2">
                {(data?.tasks || []).slice(0, 6).map((task) => (
                  <div key={task.id} className="flex items-center justify-between text-sm border-b border-[#EEF3F0] pb-2">
                    <span>{task.title}</span>
                    <span className="text-xs text-[#8EA39B]">{task.status}</span>
                  </div>
                ))}
                {(!data?.tasks || data.tasks.length === 0) && (
                  <div className="text-sm text-[#8EA39B]">No tasks available yet.</div>
                )}
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-[#E5ECE8] p-5 space-y-3">
              <div>
                <h2 className="font-display text-xl font-semibold">Projects</h2>
                <p className="text-sm text-[#667C74]">Delivery status across your active workstreams.</p>
              </div>
              <div className="space-y-3">
                {(data?.projects || []).slice(0, 6).map((project) => (
                  <div key={project.id} className="rounded-xl border border-[#E5ECE8] p-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="font-medium">{project.name}</div>
                        <div className="text-xs text-[#8EA39B] mt-1">
                          {project.start_date ? `Started ${formatDate(project.start_date)}` : "Start date pending"}
                        </div>
                      </div>
                      <span className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full bg-[#EEF5F1] text-[#476158]">
                        <Rocket className="w-3.5 h-3.5" /> {project.status || "active"}
                      </span>
                    </div>
                  </div>
                ))}
                {(!data?.projects || data.projects.length === 0) && (
                  <div className="text-sm text-[#8EA39B]">No projects published yet.</div>
                )}
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-[#E5ECE8] p-5 space-y-3">
              <div>
                <h2 className="font-display text-xl font-semibold">Recent activity</h2>
                <p className="text-sm text-[#667C74]">A timeline of updates shared with you.</p>
              </div>
              <div className="space-y-3">
                {(data?.timeline_events || []).slice(0, 6).map((evt) => (
                  <div key={evt.id} className="rounded-xl border border-[#E5ECE8] p-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="font-medium">{evt.title}</div>
                        {evt.details && <div className="text-sm text-[#536660] mt-1 whitespace-pre-wrap">{evt.details}</div>}
                      </div>
                      <div className="text-xs text-[#8EA39B] inline-flex items-center gap-1.5">
                        <Clock3 className="w-3.5 h-3.5" /> {formatDate(evt.occurred_at)}
                      </div>
                    </div>
                  </div>
                ))}
                {(!data?.timeline_events || data.timeline_events.length === 0) && (
                  <div className="text-sm text-[#8EA39B]">No activity posted yet.</div>
                )}
              </div>
            </div>

            {data?.portal?.allow_feedback ? (
              <div className="bg-white rounded-2xl border border-[#E5ECE8] p-5 space-y-3">
              <div>
                <h2 className="font-display text-xl font-semibold">Leave feedback</h2>
                <p className="text-sm text-[#667C74]">Share notes or questions with the delivery team.</p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <input
                  type="number"
                  min="1"
                  max="5"
                  value={feedback.rating}
                  onChange={(e) => setFeedback((prev) => ({ ...prev, rating: e.target.value }))}
                  className="h-10 px-3 rounded-lg border border-[#E5ECE8] text-sm"
                  placeholder="Rating (1-5)"
                />
                <input
                  value={client.email || ""}
                  disabled
                  className="h-10 px-3 rounded-lg border border-[#E5ECE8] text-sm bg-[#F7FAF8]"
                />
              </div>
              <textarea
                rows={3}
                value={feedback.message}
                onChange={(e) => setFeedback((prev) => ({ ...prev, message: e.target.value }))}
                className="w-full px-3 py-2 rounded-lg border border-[#E5ECE8] text-sm"
                placeholder="Let us know what you think."
              />
              <button
                type="button"
                onClick={submitFeedback}
                disabled={busy.feedback}
                className="h-10 px-4 rounded-lg bg-[#1C4B3E] text-white text-sm font-medium hover:bg-[#163A30] disabled:opacity-60 inline-flex items-center gap-2"
              >
                <MessageCircle className="w-4 h-4" /> {busy.feedback ? "Sending..." : "Send feedback"}
              </button>
              </div>
            ) : (
              <div className="bg-white rounded-2xl border border-[#E5ECE8] p-5 text-sm text-[#667C74]">
                Feedback is currently disabled for this portal link.
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}

function SummaryCard({ label, value }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/10 px-4 py-3">
      <div className="text-xs uppercase tracking-[0.2em] text-[#CDE0D8]">{label}</div>
      <div className="mt-2 text-2xl font-display font-semibold text-white">{value}</div>
    </div>
  );
}

function Badge({ icon: Icon, label }) {
  return (
    <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium bg-[#EAF4EF] text-[#2f6f5a]">
      <Icon className="w-3.5 h-3.5" /> {label}
    </span>
  );
}

function Alert({ tone, text }) {
  const styles =
    tone === "error"
      ? "border-[#F0D9D9] bg-[#FFF6F6] text-[#9A3838]"
      : "border-[#D4EEDD] bg-[#EEF9F2] text-[#1f6a42]";
  return (
    <div className={`rounded-lg border px-3 py-2 text-sm ${styles}`}>{text}</div>
  );
}
