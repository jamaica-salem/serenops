import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Plus, Trash2, Folder, Pencil } from "lucide-react";
import api from "../lib/api";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "../components/ui/dialog";
import { Input } from "../components/ui/input";
import { Textarea } from "../components/ui/textarea";
import { Button } from "../components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";

const COLOR_CHOICES = ["#EA580C", "#3B82F6", "#10B981", "#8B5CF6", "#EC4899", "#F59E0B"];

export default function ProjectsPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const [projects, setProjects] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [clients, setClients] = useState([]);
  const [open, setOpen] = useState(false);
  const [editingProjectId, setEditingProjectId] = useState(null);
  const [form, setForm] = useState({ name: "", description: "", color: COLOR_CHOICES[0], client_id: "none" });

  const load = async () => {
    try {
      const [p, t, c] = await Promise.all([api.get("/projects"), api.get("/tasks"), api.get("/clients")]);
      setProjects(p.data);
      setTasks(t.data);
      setClients(c.data);
    } catch (e) {
      if (e?.response?.status !== 401) console.error("Projects load failed:", e);
    }
  };
  useEffect(() => { load(); }, []);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get("new") === "1") {
      setEditingProjectId(null);
      setForm({ name: "", description: "", color: COLOR_CHOICES[0], client_id: "none" });
      setOpen(true);
      navigate("/projects", { replace: true });
    }
  }, [location.search, navigate]);

  const upsert = async () => {
    if (!form.name.trim()) return;
    const payload = { ...form, client_id: form.client_id === "none" ? null : form.client_id };
    if (editingProjectId) {
      await api.patch(`/projects/${editingProjectId}`, payload);
    } else {
      await api.post("/projects", payload);
    }
    setForm({ name: "", description: "", color: COLOR_CHOICES[0], client_id: "none" });
    setEditingProjectId(null);
    setOpen(false);
    load();
  };

  const startCreate = () => {
    setEditingProjectId(null);
    setForm({ name: "", description: "", color: COLOR_CHOICES[0], client_id: "none" });
    setOpen(true);
  };

  const startEdit = (project) => {
    setEditingProjectId(project.id);
    setForm({
      name: project.name || "",
      description: project.description || "",
      color: project.color || COLOR_CHOICES[0],
      client_id: project.client_id || "none",
    });
    setOpen(true);
  };

  const remove = async (id) => {
    if (!confirm("Delete this project? Tasks will remain unassigned.")) return;
    await api.delete(`/projects/${id}`);
    load();
  };

  return (
    <div className="space-y-6 animate-fade-up" data-testid="projects-page">
      <div className="flex items-end justify-between flex-wrap gap-4">
        <div>
          <p className="text-sm text-gray-500">Group tasks by initiative</p>
          <h1 className="font-display text-3xl sm:text-4xl font-bold text-[#1C4B3E] dark:text-[#d7e6b6]">Projects</h1>
        </div>
        <button
          data-testid="projects-add-btn"
          onClick={startCreate}
          className="bg-orange-600 hover:bg-orange-700 text-white text-sm px-4 h-9 rounded-lg inline-flex items-center gap-1"
        >
          <Plus className="w-4 h-4" /> New Project
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {projects.map((p) => {
          const projTasks = tasks.filter((t) => t.project_id === p.id);
          const done = projTasks.filter((t) => t.status === "done").length;
          const pct = projTasks.length ? Math.round((done / projTasks.length) * 100) : 0;
          const client = clients.find((c) => c.id === p.client_id);
          return (
            <div
              key={p.id}
              data-testid={`project-card-${p.id}`}
              className="bg-white rounded-2xl border border-gray-200 p-5 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: p.color + "20" }}>
                  <Folder className="w-5 h-5" style={{ color: p.color }} />
                </div>
                <div className="flex items-center gap-1">
                  <button
                    data-testid={`project-edit-${p.id}`}
                    onClick={() => startEdit(p)}
                    className="p-1.5 text-gray-300 hover:text-gray-700 hover:bg-gray-100 rounded"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                  <button
                    data-testid={`project-delete-${p.id}`}
                    onClick={() => remove(p.id)}
                    className="p-1.5 text-gray-300 hover:text-red-600 hover:bg-red-50 rounded"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
              <h3 className="font-display font-semibold text-[#1C4B3E] dark:text-[#d7e6b6] mb-1">{p.name}</h3>
              <p className="text-xs text-gray-500 mb-1">
                Client: {client?.name || "Unlinked"}
              </p>
              <p className="text-sm text-gray-500 line-clamp-2 mb-4 min-h-[40px]">{p.description || "No description"}</p>
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-gray-500">{projTasks.length} task{projTasks.length !== 1 ? "s" : ""}</span>
                  <span className="font-medium text-gray-900">{pct}%</span>
                </div>
                <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                  <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: p.color }} />
                </div>
              </div>
            </div>
          );
        })}
        {projects.length === 0 && (
          <div className="col-span-full text-sm text-gray-400 italic py-12 text-center">No projects yet. Create your first one.</div>
        )}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent data-testid="project-form-dialog">
          <DialogHeader>
            <DialogTitle className="font-display">{editingProjectId ? "Edit project" : "Create project"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Input
              data-testid="project-form-name"
              placeholder="Project name"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
            <Textarea
              data-testid="project-form-description"
              placeholder="Description"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              rows={3}
            />
            <div>
              <div className="text-xs font-medium text-gray-600 mb-2">Client</div>
              <Select value={form.client_id || "none"} onValueChange={(v) => setForm({ ...form, client_id: v })}>
                <SelectTrigger>
                  <SelectValue placeholder="Link client" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Unlinked</SelectItem>
                  {clients.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <div className="text-xs font-medium text-gray-600 mb-2">Color</div>
              <div className="flex gap-2">
                {COLOR_CHOICES.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setForm({ ...form, color: c })}
                    className={`w-7 h-7 rounded-full border-2 transition-all ${form.color === c ? "border-gray-900 scale-110" : "border-transparent"}`}
                    style={{ backgroundColor: c }}
                    aria-label={c}
                  />
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={upsert} className="bg-orange-600 hover:bg-orange-700 text-white" data-testid="project-form-save">
              {editingProjectId ? "Save changes" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
