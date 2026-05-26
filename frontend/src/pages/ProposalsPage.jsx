import { useEffect, useState } from "react";
import { Pencil } from "lucide-react";
import api from "../lib/api";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "../components/ui/dialog";
import { Input } from "../components/ui/input";
import { Textarea } from "../components/ui/textarea";
import { Button } from "../components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";

export default function ProposalsPage() {
  const [proposals, setProposals] = useState([]);
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState({
    project_title: "",
    scope_of_work: "",
    deliverables: "",
    timeline: "",
    pricing: "",
    payment_terms: "",
    revision_limits: "",
    optional_add_ons: "",
    terms_conditions: "",
    notes: "",
    status: "draft",
  });

  const load = async () => {
    try {
      const { data } = await api.get("/proposals");
      setProposals(data);
    } catch (e) {
      if (e?.response?.status !== 401) console.error("Proposals load failed:", e);
    }
  };

  useEffect(() => { load(); }, []);

  const startEdit = (proposal) => {
    setEditingId(proposal.id);
    setForm({
      project_title: proposal.project_title || "",
      scope_of_work: proposal.scope_of_work || "",
      deliverables: Array.isArray(proposal.deliverables) ? proposal.deliverables.join("\n") : (proposal.deliverables || ""),
      timeline: proposal.timeline || "",
      pricing: proposal.pricing || "",
      payment_terms: proposal.payment_terms || "",
      revision_limits: proposal.revision_limits || "",
      optional_add_ons: proposal.optional_add_ons || "",
      terms_conditions: proposal.terms_conditions || "",
      notes: proposal.notes || "",
      status: proposal.status || "draft",
    });
    setOpen(true);
  };

  const saveEdit = async () => {
    if (!editingId || !form.project_title.trim()) return;
    await api.patch(`/proposals/${editingId}`, {
      ...form,
      project_title: form.project_title.trim(),
      deliverables: form.deliverables
        .split("\n")
        .map((x) => x.trim())
        .filter(Boolean),
    });
    setOpen(false);
    setEditingId(null);
    await load();
  };

  return (
    <div className="space-y-5 animate-fade-up" data-testid="proposals-page">
      <div>
        <p className="text-sm text-gray-500">Track draft and sent proposals</p>
        <h1 className="font-display text-3xl sm:text-4xl font-bold text-[#1C4B3E] dark:text-[#d7e6b6]">Proposals</h1>
      </div>

      <div className="space-y-3">
        {proposals.map((p) => (
          <div key={p.id} className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="flex items-center justify-between gap-2">
              <h3 className="font-medium text-[#1C4B3E] dark:text-[#d7e6b6]">{p.project_title}</h3>
              <div className="flex items-center gap-2">
                <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">{String(p.status || "").replace(/_/g, " ")}</span>
                <button
                  type="button"
                  onClick={() => startEdit(p)}
                  className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded"
                  data-testid={`proposal-edit-${p.id}`}
                >
                  <Pencil className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
            <p className="text-sm text-gray-500 mt-1">{p.scope_of_work || "No scope details"}</p>
          </div>
        ))}
        {proposals.length === 0 && <div className="text-sm text-gray-400 italic text-center py-10">No proposals yet.</div>}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent data-testid="proposal-edit-dialog">
          <DialogHeader>
            <DialogTitle className="font-display">Edit proposal</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <Input
              placeholder="Project title"
              value={form.project_title}
              onChange={(e) => setForm({ ...form, project_title: e.target.value })}
            />
            <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {["draft", "sent", "approved", "rejected"].map((s) => (
                  <SelectItem key={s} value={s}>{String(s).replace("_", " ")}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Textarea
              rows={2}
              placeholder="Scope of work"
              value={form.scope_of_work}
              onChange={(e) => setForm({ ...form, scope_of_work: e.target.value })}
            />
            <Textarea
              rows={2}
              placeholder="Deliverables (one per line)"
              value={form.deliverables}
              onChange={(e) => setForm({ ...form, deliverables: e.target.value })}
            />
            <Input placeholder="Timeline" value={form.timeline} onChange={(e) => setForm({ ...form, timeline: e.target.value })} />
            <Input placeholder="Pricing" value={form.pricing} onChange={(e) => setForm({ ...form, pricing: e.target.value })} />
            <Input placeholder="Payment terms" value={form.payment_terms} onChange={(e) => setForm({ ...form, payment_terms: e.target.value })} />
            <Input placeholder="Revision limits" value={form.revision_limits} onChange={(e) => setForm({ ...form, revision_limits: e.target.value })} />
            <Input placeholder="Optional add-ons" value={form.optional_add_ons} onChange={(e) => setForm({ ...form, optional_add_ons: e.target.value })} />
            <Textarea
              rows={2}
              placeholder="Terms and conditions"
              value={form.terms_conditions}
              onChange={(e) => setForm({ ...form, terms_conditions: e.target.value })}
            />
            <Textarea
              rows={2}
              placeholder="Notes"
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={saveEdit} disabled={!form.project_title.trim()}>Save changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
