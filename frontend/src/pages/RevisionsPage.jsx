import { useEffect, useState } from "react";
import { Pencil } from "lucide-react";
import api from "../lib/api";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "../components/ui/dialog";
import { Input } from "../components/ui/input";
import { Textarea } from "../components/ui/textarea";
import { Button } from "../components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";

export default function RevisionsPage() {
  const [revisions, setRevisions] = useState([]);
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState({
    request_title: "",
    description: "",
    affected_area: "",
    requested_by: "",
    attachment_link: "",
    status: "requested",
    priority: "medium",
  });

  const load = async () => {
    try {
      const { data } = await api.get("/revisions");
      setRevisions(data);
    } catch (e) {
      if (e?.response?.status !== 401) console.error("Revisions load failed:", e);
    }
  };

  useEffect(() => { load(); }, []);

  const startEdit = (revision) => {
    setEditingId(revision.id);
    setForm({
      request_title: revision.request_title || "",
      description: revision.description || "",
      affected_area: revision.affected_area || "",
      requested_by: revision.requested_by || "",
      attachment_link: revision.attachment_link || "",
      status: revision.status || "requested",
      priority: revision.priority || "medium",
    });
    setOpen(true);
  };

  const saveEdit = async () => {
    if (!editingId || !form.request_title.trim()) return;
    await api.patch(`/revisions/${editingId}`, {
      ...form,
      request_title: form.request_title.trim(),
    });
    setOpen(false);
    setEditingId(null);
    await load();
  };

  return (
    <div className="space-y-5 animate-fade-up" data-testid="revisions-page">
      <div>
        <h1 className="font-display text-3xl sm:text-4xl font-bold text-foreground">Revisions</h1>
        <p className="text-sm text-muted-foreground mt-1">Track client revision requests and approvals</p>
      </div>

      <div className="space-y-3">
        {revisions.map((r) => (
          <div key={r.id} className="bg-card rounded-xl border border-border p-4">
            <div className="flex items-center justify-between gap-2">
              <h3 className="font-medium text-foreground">{r.request_title}</h3>
              <div className="flex items-center gap-2">
                <span className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground">{String(r.status || "").replace(/_/g, " ")}</span>
                <button
                  type="button"
                  onClick={() => startEdit(r)}
                  className="p-1.5 text-muted-foreground/80 hover:text-foreground hover:bg-muted rounded"
                  data-testid={`revision-edit-${r.id}`}
                >
                  <Pencil className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
            <p className="text-sm text-muted-foreground mt-1">{r.description || "No description"}</p>
          </div>
        ))}
        {revisions.length === 0 && <div className="text-sm text-muted-foreground/80 italic text-center py-10">No revisions yet.</div>}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent data-testid="revision-edit-dialog">
          <DialogHeader>
            <DialogTitle className="font-display">Edit revision</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <Input
              placeholder="Request title"
              value={form.request_title}
              onChange={(e) => setForm({ ...form, request_title: e.target.value })}
            />
            <Textarea
              rows={2}
              placeholder="Description"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
            <Input
              placeholder="Affected area"
              value={form.affected_area}
              onChange={(e) => setForm({ ...form, affected_area: e.target.value })}
            />
            <Input
              placeholder="Requested by"
              value={form.requested_by}
              onChange={(e) => setForm({ ...form, requested_by: e.target.value })}
            />
            <Input
              placeholder="Attachment link"
              value={form.attachment_link}
              onChange={(e) => setForm({ ...form, attachment_link: e.target.value })}
            />
            <div className="grid grid-cols-2 gap-2">
              <Select value={form.priority} onValueChange={(v) => setForm({ ...form, priority: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {["low", "medium", "high", "urgent"].map((s) => (
                    <SelectItem key={s} value={s}>{String(s).replace("_", " ")}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {["requested", "in_progress", "done", "approved", "rejected"].map((s) => (
                    <SelectItem key={s} value={s}>{String(s).replace("_", " ")}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={saveEdit} disabled={!form.request_title.trim()}>Save changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
