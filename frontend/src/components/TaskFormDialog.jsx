import { useEffect, useState } from "react";
import api from "../lib/api";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "../components/ui/dialog";
import { Input } from "../components/ui/input";
import { Textarea } from "../components/ui/textarea";
import { Button } from "../components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";

const STATUSES = [
  { value: "todo", label: "Todo" },
  { value: "in_progress", label: "In Progress" },
  { value: "waiting_for_client", label: "Waiting for Client" },
  { value: "for_review", label: "For Review" },
  { value: "done", label: "Done" },
  { value: "backlog", label: "Backlog" },
];
const PRIORITIES = [
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" },
  { value: "urgent", label: "Urgent" },
];

export default function TaskFormDialog({ open, onOpenChange, projects = [], users = [], clients = [], task = null, onSaved }) {
  const [form, setForm] = useState({
    title: "", description: "", status: "todo", priority: "medium",
    due_date: "", project_id: "", client_id: "", assignee_id: "",
  });
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (open) {
      setForm(task ? {
        title: task.title || "",
        description: task.description || "",
        status: task.status || "todo",
        priority: task.priority || "medium",
        due_date: task.due_date || "",
        project_id: task.project_id || "",
        client_id: task.client_id || "",
        assignee_id: task.assignee_id || "",
      } : {
        title: "", description: "", status: "todo", priority: "medium",
        due_date: "", project_id: "", client_id: "", assignee_id: "",
      });
    }
  }, [open, task]);

  const submit = async () => {
    if (!form.title.trim()) return;
    setBusy(true);
    try {
      const payload = {
        ...form,
        project_id: form.project_id || null,
        client_id: form.client_id || null,
        assignee_id: form.assignee_id || null,
        due_date: form.due_date || null,
      };
      if (task) await api.patch(`/tasks/${task.id}`, payload);
      else await api.post("/tasks", payload);
      onSaved?.();
      onOpenChange(false);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg" data-testid="task-form-dialog">
        <DialogHeader>
          <DialogTitle className="font-display">{task ? "Edit task" : "Create task"}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <label className="text-xs font-medium text-gray-600">Title</label>
            <Input
              data-testid="task-form-title"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="What needs to be done?"
              className="mt-1"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-600">Description</label>
            <Textarea
              data-testid="task-form-description"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              rows={3}
              className="mt-1"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-gray-600">Status</label>
              <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                <SelectTrigger data-testid="task-form-status" className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {STATUSES.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600">Priority</label>
              <Select value={form.priority} onValueChange={(v) => setForm({ ...form, priority: v })}>
                <SelectTrigger data-testid="task-form-priority" className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {PRIORITIES.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-gray-600">Due date</label>
              <Input
                data-testid="task-form-due"
                type="date"
                value={form.due_date}
                onChange={(e) => setForm({ ...form, due_date: e.target.value })}
                className="mt-1"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600">Project</label>
              <Select
                value={form.project_id || "none"}
                onValueChange={(v) => {
                  if (v === "none") {
                    setForm({ ...form, project_id: "" });
                    return;
                  }
                  const selectedProject = projects.find((p) => p.id === v);
                  setForm({
                    ...form,
                    project_id: v,
                    client_id: selectedProject?.client_id || form.client_id,
                  });
                }}
              >
                <SelectTrigger data-testid="task-form-project" className="mt-1"><SelectValue placeholder="Project" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No project</SelectItem>
                  {projects.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-gray-600">Client</label>
            <Select value={form.client_id || "none"} onValueChange={(v) => setForm({ ...form, client_id: v === "none" ? "" : v })}>
              <SelectTrigger className="mt-1"><SelectValue placeholder="Link to client..." /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No client</SelectItem>
                {clients.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-xs font-medium text-gray-600">Assignee</label>
            <Select value={form.assignee_id || "none"} onValueChange={(v) => setForm({ ...form, assignee_id: v === "none" ? "" : v })}>
              <SelectTrigger data-testid="task-form-assignee" className="mt-1"><SelectValue placeholder="Assign to…" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Unassigned</SelectItem>
                {users.map((u) => <SelectItem key={u.id} value={u.id}>{u.name} · {u.email}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} data-testid="task-form-cancel">Cancel</Button>
          <Button
            onClick={submit}
            disabled={busy || !form.title.trim()}
            className="bg-orange-600 hover:bg-orange-700 text-white"
            data-testid="task-form-save"
          >
            {busy ? "Saving…" : task ? "Save changes" : "Create task"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
