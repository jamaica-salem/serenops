import { useEffect, useMemo, useState } from "react";
import { Plus, Mail, Phone, Globe, RefreshCw } from "lucide-react";
import api from "../lib/api";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "../components/ui/dialog";
import { Input } from "../components/ui/input";
import { Textarea } from "../components/ui/textarea";
import { Button } from "../components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { Checkbox } from "../components/ui/checkbox";

const CLIENT_STATUSES = [
  "lead",
  "onboarding",
  "active",
  "waiting_for_client",
  "completed",
  "maintenance",
  "archived",
];

const CLIENT_SOURCES = ["referral", "facebook", "linkedin", "website", "upwork", "manual", "other"];

const WORKSPACE_TABS = [
  "overview",
  "onboarding",
  "proposals",
  "projects",
  "tasks",
  "revisions",
  "files-links",
  "invoices",
  "contracts",
  "payments",
  "timeline",
  "handover",
  "maintenance",
  "notes",
];

function prettyStatus(status) {
  return String(status || "").replace(/_/g, " ").replace(/\b\w/g, (m) => m.toUpperCase());
}

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

function money(v) {
  const n = Number(v || 0);
  return Number.isFinite(n) ? n.toFixed(2) : "0.00";
}

export default function ClientsPage() {
  const [clients, setClients] = useState([]);
  const [selectedId, setSelectedId] = useState("");
  const [summary, setSummary] = useState(null);
  const [onboardingItems, setOnboardingItems] = useState([]);
  const [clientProjects, setClientProjects] = useState([]);
  const [clientTasks, setClientTasks] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [proposals, setProposals] = useState([]);
  const [contracts, setContracts] = useState([]);
  const [fileLinks, setFileLinks] = useState([]);
  const [payments, setPayments] = useState([]);
  const [revisions, setRevisions] = useState([]);
  const [timelineEvents, setTimelineEvents] = useState([]);
  const [handoverItems, setHandoverItems] = useState([]);
  const [maintenancePlans, setMaintenancePlans] = useState([]);
  const [busy, setBusy] = useState(false);

  const [open, setOpen] = useState(false);
  const [addingOnboarding, setAddingOnboarding] = useState(false);
  const [newOnboardingTitle, setNewOnboardingTitle] = useState("");
  const [newOnboardingCategory, setNewOnboardingCategory] = useState("onboarding_checklist");

  const [newHandoverTitle, setNewHandoverTitle] = useState("");
  const [timelineForm, setTimelineForm] = useState({
    title: "",
    details: "",
    event_type: "manual",
    occurred_at: todayStr(),
  });

  const [invoiceForm, setInvoiceForm] = useState({
    invoice_number: `INV-${Date.now()}`,
    issue_date: todayStr(),
    due_date: todayStr(),
    description: "",
    quantity: 1,
    rate: 0,
    discount: 0,
    tax_fees: 0,
    payment_method: "",
    notes: "",
    status: "draft",
  });

  const [paymentForm, setPaymentForm] = useState({
    invoice_id: "",
    payment_date: todayStr(),
    amount: "",
    method: "",
    notes: "",
  });

  const [proposalForm, setProposalForm] = useState({
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

  const [fileLinkForm, setFileLinkForm] = useState({
    project_id: "none",
    label: "",
    link_type: "other",
    url: "",
    notes: "",
  });

  const [contractForm, setContractForm] = useState({
    title: "",
    service_provider_details: "",
    scope_of_work: "",
    deliverables: "",
    payment_terms: "",
    timeline: "",
    revision_policy: "",
    cancellation_policy: "",
    late_payment_clause: "",
    ownership_rights: "",
    confidentiality_clause: "",
    signature_section: "",
    notes: "",
    status: "draft",
  });

  const [revisionForm, setRevisionForm] = useState({
    project_id: "none",
    requested_by: "",
    request_title: "",
    description: "",
    affected_area: "",
    priority: "medium",
    status: "requested",
    date_requested: todayStr(),
    attachment_link: "",
    revision_count: 1,
  });

  const [maintenanceForm, setMaintenanceForm] = useState({
    project_id: "none",
    plan_name: "",
    monthly_fee: "",
    included_services: "",
    start_date: todayStr(),
    renewal_date: "",
    recurring_tasks: "",
    support_requests: "",
    status: "active",
    notes: "",
  });

  const [form, setForm] = useState({
    name: "",
    company_name: "",
    email: "",
    phone: "",
    website: "",
    client_type: "freelancer_client",
    status: "lead",
    source: "manual",
    notes: "",
  });

  const selectedClient = useMemo(
    () => clients.find((c) => c.id === selectedId) || null,
    [clients, selectedId]
  );

  const loadClients = async () => {
    try {
      const { data } = await api.get("/clients");
      setClients(data);
      if (!selectedId && data.length) {
        setSelectedId(data[0].id);
      } else if (selectedId && !data.find((c) => c.id === selectedId)) {
        setSelectedId(data[0]?.id || "");
      }
    } catch (e) {
      if (e?.response?.status !== 401) console.error("Clients load failed:", e);
    }
  };

  const loadWorkspace = async (clientId) => {
    if (!clientId) {
      setSummary(null);
      setOnboardingItems([]);
      setClientProjects([]);
      setClientTasks([]);
      setInvoices([]);
      setProposals([]);
      setContracts([]);
      setFileLinks([]);
      setPayments([]);
      setRevisions([]);
      setTimelineEvents([]);
      setHandoverItems([]);
      setMaintenancePlans([]);
      return;
    }

    setBusy(true);
    try {
      const [
        summaryRes,
        onboardingRes,
        projectRes,
        taskRes,
        invoiceRes,
        proposalRes,
        contractRes,
        fileLinksRes,
        paymentRes,
        revisionRes,
        timelineRes,
        handoverRes,
        maintenanceRes,
      ] = await Promise.all([
        api.get(`/clients/${clientId}/workspace-summary`),
        api.get(`/clients/${clientId}/onboarding`),
        api.get("/projects", { params: { client_id: clientId } }),
        api.get("/tasks", { params: { client_id: clientId } }),
        api.get("/invoices", { params: { client_id: clientId } }),
        api.get("/proposals", { params: { client_id: clientId } }),
        api.get("/contracts", { params: { client_id: clientId } }),
        api.get("/file-links", { params: { client_id: clientId } }),
        api.get("/payments", { params: { client_id: clientId } }),
        api.get("/revisions", { params: { client_id: clientId } }),
        api.get("/timeline-events", { params: { client_id: clientId } }),
        api.get(`/clients/${clientId}/handover`),
        api.get("/maintenance-plans", { params: { client_id: clientId } }),
      ]);

      setSummary(summaryRes.data);
      setOnboardingItems(onboardingRes.data);
      setClientProjects(projectRes.data);
      setClientTasks(taskRes.data);
      setInvoices(invoiceRes.data);
      setProposals(proposalRes.data);
      setContracts(contractRes.data);
      setFileLinks(fileLinksRes.data);
      setPayments(paymentRes.data);
      setRevisions(revisionRes.data);
      setTimelineEvents(timelineRes.data);
      setHandoverItems(handoverRes.data);
      setMaintenancePlans(maintenanceRes.data);
    } catch (e) {
      if (e?.response?.status !== 401) console.error("Client workspace load failed:", e);
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => {
    loadClients();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    loadWorkspace(selectedId);
  }, [selectedId]);

  const createClient = async () => {
    if (!form.name.trim()) return;
    await api.post("/clients", {
      ...form,
      email: form.email?.trim() ? form.email.trim() : null,
      phone: form.phone?.trim() || "",
      website: form.website?.trim() || "",
      notes: form.notes?.trim() || "",
    });
    setOpen(false);
    setForm({
      name: "",
      company_name: "",
      email: "",
      phone: "",
      website: "",
      client_type: "freelancer_client",
      status: "lead",
      source: "manual",
      notes: "",
    });
    await loadClients();
  };

  const updateClientStatus = async (status) => {
    if (!selectedClient) return;
    await api.patch(`/clients/${selectedClient.id}`, { status });
    await loadClients();
    await loadWorkspace(selectedClient.id);
  };

  const saveClientNotes = async (notes) => {
    if (!selectedClient) return;
    await api.patch(`/clients/${selectedClient.id}`, { notes });
    await loadClients();
  };

  const toggleOnboarding = async (item) => {
    if (!selectedClient) return;
    await api.patch(`/clients/${selectedClient.id}/onboarding/${item.id}`, {
      completed: !item.completed,
    });
    await loadWorkspace(selectedClient.id);
  };

  const addOnboardingItem = async () => {
    if (!selectedClient || !newOnboardingTitle.trim()) return;
    setAddingOnboarding(true);
    try {
      await api.post(`/clients/${selectedClient.id}/onboarding`, {
        title: newOnboardingTitle,
        category: newOnboardingCategory,
      });
      setNewOnboardingTitle("");
      setNewOnboardingCategory("onboarding_checklist");
      await loadWorkspace(selectedClient.id);
    } finally {
      setAddingOnboarding(false);
    }
  };

  const createInvoice = async () => {
    if (!selectedClient || !invoiceForm.invoice_number.trim()) return;
    await api.post("/invoices", {
      invoice_number: invoiceForm.invoice_number,
      client_id: selectedClient.id,
      issue_date: invoiceForm.issue_date,
      due_date: invoiceForm.due_date,
      line_items: [{
        description: invoiceForm.description || "Service",
        quantity: Number(invoiceForm.quantity || 0),
        rate: Number(invoiceForm.rate || 0),
      }],
      discount: Number(invoiceForm.discount || 0),
      tax_fees: Number(invoiceForm.tax_fees || 0),
      amount_paid: 0,
      payment_method: invoiceForm.payment_method,
      notes: invoiceForm.notes,
      status: invoiceForm.status,
    });
    setInvoiceForm({
      invoice_number: `INV-${Date.now()}`,
      issue_date: todayStr(),
      due_date: todayStr(),
      description: "",
      quantity: 1,
      rate: 0,
      discount: 0,
      tax_fees: 0,
      payment_method: "",
      notes: "",
      status: "draft",
    });
    await loadWorkspace(selectedClient.id);
  };

  const createProposal = async () => {
    if (!selectedClient || !proposalForm.project_title.trim()) return;
    await api.post("/proposals", {
      client_id: selectedClient.id,
      project_title: proposalForm.project_title,
      scope_of_work: proposalForm.scope_of_work,
      deliverables: proposalForm.deliverables
        .split("\n")
        .map((x) => x.trim())
        .filter(Boolean),
      timeline: proposalForm.timeline,
      pricing: proposalForm.pricing,
      payment_terms: proposalForm.payment_terms,
      revision_limits: proposalForm.revision_limits,
      optional_add_ons: proposalForm.optional_add_ons,
      terms_conditions: proposalForm.terms_conditions,
      notes: proposalForm.notes,
      status: proposalForm.status,
    });
    setProposalForm({
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
    await loadWorkspace(selectedClient.id);
  };

  const createPayment = async () => {
    if (!selectedClient || !paymentForm.invoice_id || !paymentForm.amount) return;
    await api.post("/payments", {
      client_id: selectedClient.id,
      invoice_id: paymentForm.invoice_id,
      payment_date: paymentForm.payment_date,
      amount: Number(paymentForm.amount || 0),
      method: paymentForm.method || "manual",
      notes: paymentForm.notes,
      status: "recorded",
    });
    setPaymentForm({
      invoice_id: "",
      payment_date: todayStr(),
      amount: "",
      method: "",
      notes: "",
    });
    await loadWorkspace(selectedClient.id);
  };

  const createFileLink = async () => {
    if (!selectedClient || !fileLinkForm.label.trim() || !fileLinkForm.url.trim()) return;
    await api.post("/file-links", {
      client_id: selectedClient.id,
      project_id: fileLinkForm.project_id === "none" ? null : fileLinkForm.project_id,
      label: fileLinkForm.label,
      link_type: fileLinkForm.link_type,
      url: fileLinkForm.url,
      notes: fileLinkForm.notes,
    });
    setFileLinkForm({
      project_id: "none",
      label: "",
      link_type: "other",
      url: "",
      notes: "",
    });
    await loadWorkspace(selectedClient.id);
  };

  const createContract = async () => {
    if (!selectedClient || !contractForm.title.trim()) return;
    await api.post("/contracts", {
      ...contractForm,
      client_id: selectedClient.id,
      deliverables: contractForm.deliverables
        .split("\n")
        .map((x) => x.trim())
        .filter(Boolean),
    });
    setContractForm({
      title: "",
      service_provider_details: "",
      scope_of_work: "",
      deliverables: "",
      payment_terms: "",
      timeline: "",
      revision_policy: "",
      cancellation_policy: "",
      late_payment_clause: "",
      ownership_rights: "",
      confidentiality_clause: "",
      signature_section: "",
      notes: "",
      status: "draft",
    });
    await loadWorkspace(selectedClient.id);
  };

  const createRevision = async () => {
    if (!selectedClient || !revisionForm.request_title.trim()) return;
    await api.post("/revisions", {
      client_id: selectedClient.id,
      project_id: revisionForm.project_id === "none" ? null : revisionForm.project_id,
      requested_by: revisionForm.requested_by,
      request_title: revisionForm.request_title,
      description: revisionForm.description,
      affected_area: revisionForm.affected_area,
      priority: revisionForm.priority,
      status: revisionForm.status,
      date_requested: revisionForm.date_requested,
      attachment_link: revisionForm.attachment_link,
      revision_count: Number(revisionForm.revision_count || 1),
    });
    setRevisionForm({
      project_id: "none",
      requested_by: "",
      request_title: "",
      description: "",
      affected_area: "",
      priority: "medium",
      status: "requested",
      date_requested: todayStr(),
      attachment_link: "",
      revision_count: 1,
    });
    await loadWorkspace(selectedClient.id);
  };

  const addTimelineEvent = async () => {
    if (!selectedClient || !timelineForm.title.trim()) return;
    await api.post("/timeline-events", {
      client_id: selectedClient.id,
      event_type: timelineForm.event_type,
      title: timelineForm.title,
      details: timelineForm.details,
      occurred_at: timelineForm.occurred_at,
    });
    setTimelineForm({ title: "", details: "", event_type: "manual", occurred_at: todayStr() });
    await loadWorkspace(selectedClient.id);
  };

  const toggleHandover = async (item) => {
    if (!selectedClient) return;
    await api.patch(`/clients/${selectedClient.id}/handover/${item.id}`, {
      completed: !item.completed,
    });
    await loadWorkspace(selectedClient.id);
  };

  const addHandoverItem = async () => {
    if (!selectedClient || !newHandoverTitle.trim()) return;
    await api.post(`/clients/${selectedClient.id}/handover`, {
      title: newHandoverTitle,
      notes: "",
      completed: false,
    });
    setNewHandoverTitle("");
    await loadWorkspace(selectedClient.id);
  };

  const createMaintenancePlan = async () => {
    if (!selectedClient || !maintenanceForm.plan_name.trim()) return;
    await api.post("/maintenance-plans", {
      client_id: selectedClient.id,
      project_id: maintenanceForm.project_id === "none" ? null : maintenanceForm.project_id,
      plan_name: maintenanceForm.plan_name,
      monthly_fee: Number(maintenanceForm.monthly_fee || 0),
      included_services: maintenanceForm.included_services
        .split("\n")
        .map((x) => x.trim())
        .filter(Boolean),
      start_date: maintenanceForm.start_date || null,
      renewal_date: maintenanceForm.renewal_date || null,
      recurring_tasks: maintenanceForm.recurring_tasks
        .split("\n")
        .map((x) => x.trim())
        .filter(Boolean),
      support_requests: maintenanceForm.support_requests,
      status: maintenanceForm.status,
      notes: maintenanceForm.notes,
    });
    setMaintenanceForm({
      project_id: "none",
      plan_name: "",
      monthly_fee: "",
      included_services: "",
      start_date: todayStr(),
      renewal_date: "",
      recurring_tasks: "",
      support_requests: "",
      status: "active",
      notes: "",
    });
    await loadWorkspace(selectedClient.id);
  };

  const updateMaintenanceStatus = async (plan, status) => {
    if (!selectedClient) return;
    await api.patch(`/maintenance-plans/${plan.id}`, { status });
    await loadWorkspace(selectedClient.id);
  };

  return (
    <div className="space-y-6 animate-fade-up" data-testid="clients-page">
      <div className="flex items-end justify-between flex-wrap gap-4">
        <div>
          <p className="text-sm text-gray-500">Track the full lifecycle of every client</p>
          <h1 className="font-display text-3xl sm:text-4xl font-bold text-gray-900">Clients</h1>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => loadWorkspace(selectedId)}
            className="inline-flex items-center gap-1 text-xs px-3 h-9 rounded-lg border border-gray-200 hover:bg-gray-100"
          >
            <RefreshCw className="w-3.5 h-3.5" /> Refresh
          </button>
          <button
            data-testid="clients-add-btn"
            onClick={() => setOpen(true)}
            className="bg-orange-600 hover:bg-orange-700 text-white text-sm px-4 h-9 rounded-lg inline-flex items-center gap-1"
          >
            <Plus className="w-4 h-4" /> New Client
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        <aside className="lg:col-span-4 bg-white rounded-2xl border border-gray-200 p-3 space-y-2">
          {clients.map((c) => (
            <button
              key={c.id}
              onClick={() => setSelectedId(c.id)}
              className={`w-full text-left rounded-xl border p-3 transition ${
                selectedId === c.id
                  ? "border-orange-300 bg-orange-50"
                  : "border-gray-100 hover:border-gray-300"
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <div className="font-medium text-sm text-gray-900 truncate">{c.name}</div>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">
                  {prettyStatus(c.status)}
                </span>
              </div>
              <div className="text-xs text-gray-500 mt-1 truncate">{c.company_name || "No company"}</div>
              <div className="text-[11px] text-gray-400 mt-1 truncate">{c.email || "No email"}</div>
            </button>
          ))}
          {clients.length === 0 && (
            <div className="text-sm text-gray-400 italic text-center py-8">No clients yet.</div>
          )}
        </aside>

        <section className="lg:col-span-8 bg-white rounded-2xl border border-gray-200 p-5">
          {!selectedClient ? (
            <div className="text-sm text-gray-400 italic py-20 text-center">Select a client to open its workspace.</div>
          ) : (
            <>
              <div className="flex flex-wrap gap-4 items-start justify-between mb-5">
                <div className="space-y-1">
                  <h2 className="font-display text-2xl font-bold text-gray-900">{selectedClient.name}</h2>
                  <div className="text-sm text-gray-500">
                    {selectedClient.company_name || "No company"} · {selectedClient.client_type}
                  </div>
                  <div className="flex flex-wrap items-center gap-4 text-xs text-gray-500">
                    <span className="inline-flex items-center gap-1"><Mail className="w-3 h-3" /> {selectedClient.email || "—"}</span>
                    <span className="inline-flex items-center gap-1"><Phone className="w-3 h-3" /> {selectedClient.phone || "—"}</span>
                    <span className="inline-flex items-center gap-1"><Globe className="w-3 h-3" /> {selectedClient.website || "—"}</span>
                  </div>
                </div>
                <div className="w-56">
                  <div className="text-[11px] text-gray-500 mb-1">Client status</div>
                  <Select value={selectedClient.status} onValueChange={updateClientStatus}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {CLIENT_STATUSES.map((s) => (
                        <SelectItem key={s} value={s}>{prettyStatus(s)}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <Tabs defaultValue="overview">
                <TabsList className="w-full flex-wrap h-auto">
                  {WORKSPACE_TABS.map((tab) => (
                    <TabsTrigger key={tab} value={tab} className="capitalize text-xs">
                      {tab.replace("-", " ")}
                    </TabsTrigger>
                  ))}
                </TabsList>

                <TabsContent value="overview" className="space-y-4 pt-3">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <MetricCard label="Projects" value={summary?.projects_count ?? 0} />
                    <MetricCard label="Open tasks" value={summary?.open_tasks_count ?? 0} />
                    <MetricCard label="Overdue tasks" value={summary?.overdue_tasks_count ?? 0} />
                    <MetricCard label="Revisions pending" value={summary?.revisions_pending ?? 0} />
                    <MetricCard label="Onboarding" value={`${summary?.onboarding_done ?? 0}/${summary?.onboarding_total ?? 0}`} />
                    <MetricCard label="Pending proposals" value={summary?.pending_proposals ?? 0} />
                    <MetricCard label="Pending invoices" value={summary?.pending_invoices ?? 0} />
                    <MetricCard label="Pending contracts" value={summary?.pending_contracts ?? 0} />
                    <MetricCard label="Handover" value={`${summary?.handover_done ?? 0}/${summary?.handover_total ?? 0}`} />
                    <MetricCard label="Maintenance" value={`${summary?.maintenance_active ?? 0}/${summary?.maintenance_total ?? 0}`} />
                  </div>
                  <div className="rounded-xl border border-gray-100 p-4">
                    <div className="text-sm font-medium mb-2">Notes</div>
                    <div className="text-sm text-gray-500 whitespace-pre-wrap min-h-12">
                      {selectedClient.notes || "No notes yet."}
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="onboarding" className="space-y-4 pt-3">
                  <div className="rounded-xl border border-gray-100 p-3 space-y-2">
                    {onboardingItems.map((item) => (
                      <label key={item.id} className="flex items-start gap-3 rounded-lg border border-gray-100 p-2">
                        <Checkbox checked={item.completed} onCheckedChange={() => toggleOnboarding(item)} />
                        <div className="flex-1">
                          <div className={`text-sm ${item.completed ? "line-through text-gray-400" : "text-gray-800"}`}>
                            {item.title}
                          </div>
                          <div className="text-xs text-gray-500 capitalize">{item.category.replace(/_/g, " ")}</div>
                        </div>
                      </label>
                    ))}
                    {onboardingItems.length === 0 && (
                      <div className="text-sm text-gray-400 italic py-4 text-center">No onboarding items yet.</div>
                    )}
                  </div>

                  <div className="rounded-xl border border-gray-100 p-3 grid grid-cols-1 md:grid-cols-3 gap-2">
                    <Input
                      value={newOnboardingTitle}
                      onChange={(e) => setNewOnboardingTitle(e.target.value)}
                      placeholder="Add onboarding checklist item"
                      className="md:col-span-2"
                    />
                    <Select value={newOnboardingCategory} onValueChange={setNewOnboardingCategory}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="onboarding_checklist">Onboarding checklist</SelectItem>
                        <SelectItem value="intake_questionnaire">Intake questionnaire</SelectItem>
                        <SelectItem value="required_access">Required access</SelectItem>
                        <SelectItem value="brand_assets">Brand assets</SelectItem>
                        <SelectItem value="project_goals">Project goals</SelectItem>
                        <SelectItem value="communication">Communication</SelectItem>
                        <SelectItem value="tools_accounts">Tools/accounts</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button onClick={addOnboardingItem} disabled={addingOnboarding || !newOnboardingTitle.trim()}>
                      {addingOnboarding ? "Adding..." : "Add item"}
                    </Button>
                  </div>
                </TabsContent>

                <TabsContent value="proposals" className="space-y-3 pt-3">
                  <div className="rounded-xl border border-gray-100 p-3 grid grid-cols-1 md:grid-cols-2 gap-2">
                    <Input placeholder="Project title" value={proposalForm.project_title} onChange={(e) => setProposalForm({ ...proposalForm, project_title: e.target.value })} />
                    <Select value={proposalForm.status} onValueChange={(v) => setProposalForm({ ...proposalForm, status: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {["draft", "sent", "approved", "rejected"].map((s) => <SelectItem key={s} value={s}>{prettyStatus(s)}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <Textarea rows={2} placeholder="Scope of work" value={proposalForm.scope_of_work} onChange={(e) => setProposalForm({ ...proposalForm, scope_of_work: e.target.value })} />
                    <Textarea rows={2} placeholder="Deliverables (one per line)" value={proposalForm.deliverables} onChange={(e) => setProposalForm({ ...proposalForm, deliverables: e.target.value })} />
                    <Input placeholder="Timeline" value={proposalForm.timeline} onChange={(e) => setProposalForm({ ...proposalForm, timeline: e.target.value })} />
                    <Input placeholder="Pricing" value={proposalForm.pricing} onChange={(e) => setProposalForm({ ...proposalForm, pricing: e.target.value })} />
                    <Input placeholder="Payment terms" value={proposalForm.payment_terms} onChange={(e) => setProposalForm({ ...proposalForm, payment_terms: e.target.value })} />
                    <Input placeholder="Revision limits" value={proposalForm.revision_limits} onChange={(e) => setProposalForm({ ...proposalForm, revision_limits: e.target.value })} />
                    <Input placeholder="Optional add-ons" value={proposalForm.optional_add_ons} onChange={(e) => setProposalForm({ ...proposalForm, optional_add_ons: e.target.value })} />
                    <Textarea rows={2} placeholder="Terms and conditions" value={proposalForm.terms_conditions} onChange={(e) => setProposalForm({ ...proposalForm, terms_conditions: e.target.value })} />
                    <Textarea rows={2} className="md:col-span-2" placeholder="Notes" value={proposalForm.notes} onChange={(e) => setProposalForm({ ...proposalForm, notes: e.target.value })} />
                    <Button onClick={createProposal}>Create proposal</Button>
                  </div>

                  <div className="rounded-xl border border-gray-100 overflow-hidden">
                    <table className="w-full text-sm">
                      <thead className="border-b border-gray-100 text-xs text-gray-500 uppercase">
                        <tr>
                          <th className="text-left px-3 py-2">Project</th>
                          <th className="text-left px-3 py-2">Status</th>
                          <th className="text-left px-3 py-2">Pricing</th>
                          <th className="text-left px-3 py-2">Timeline</th>
                        </tr>
                      </thead>
                      <tbody>
                        {proposals.map((p) => (
                          <tr key={p.id} className="border-b border-gray-100">
                            <td className="px-3 py-2">
                              <div className="font-medium">{p.project_title}</div>
                              <div className="text-xs text-gray-500">{p.scope_of_work || "No scope"}</div>
                            </td>
                            <td className="px-3 py-2">{prettyStatus(p.status)}</td>
                            <td className="px-3 py-2">{p.pricing || "—"}</td>
                            <td className="px-3 py-2">{p.timeline || "—"}</td>
                          </tr>
                        ))}
                        {proposals.length === 0 && <tr><td colSpan={4} className="text-center py-8 text-gray-400 italic">No proposals yet.</td></tr>}
                      </tbody>
                    </table>
                  </div>
                </TabsContent>

                <TabsContent value="projects" className="pt-3">
                  <div className="rounded-xl border border-gray-100 overflow-hidden">
                    <table className="w-full text-sm">
                      <thead className="border-b border-gray-100 text-xs text-gray-500 uppercase">
                        <tr>
                          <th className="text-left px-3 py-2">Project</th>
                          <th className="text-left px-3 py-2">Status</th>
                          <th className="text-left px-3 py-2">Priority</th>
                          <th className="text-left px-3 py-2">Due</th>
                        </tr>
                      </thead>
                      <tbody>
                        {clientProjects.map((p) => (
                          <tr key={p.id} className="border-b border-gray-100">
                            <td className="px-3 py-2">
                              <div className="font-medium">{p.name}</div>
                              <div className="text-xs text-gray-500">{p.description || "No description"}</div>
                            </td>
                            <td className="px-3 py-2 capitalize">{prettyStatus(p.status)}</td>
                            <td className="px-3 py-2 capitalize">{p.priority}</td>
                            <td className="px-3 py-2">{p.due_date || "—"}</td>
                          </tr>
                        ))}
                        {clientProjects.length === 0 && (
                          <tr><td colSpan={4} className="text-center py-8 text-gray-400 italic">No projects linked yet.</td></tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </TabsContent>

                <TabsContent value="tasks" className="pt-3">
                  <div className="rounded-xl border border-gray-100 space-y-2 p-3">
                    {clientTasks.map((t) => (
                      <div key={t.id} className="rounded-lg border border-gray-100 p-3 flex items-start justify-between gap-3">
                        <div>
                          <div className="font-medium text-sm">{t.title}</div>
                          <div className="text-xs text-gray-500">{t.description || "No description"}</div>
                        </div>
                        <div className="text-right text-xs text-gray-500">
                          <div className="capitalize">{prettyStatus(t.status)}</div>
                          <div>Due: {t.due_date || "—"}</div>
                        </div>
                      </div>
                    ))}
                    {clientTasks.length === 0 && (
                      <div className="text-sm text-gray-400 italic text-center py-5">No tasks linked yet.</div>
                    )}
                  </div>
                </TabsContent>

                <TabsContent value="invoices" className="space-y-3 pt-3">
                  <div className="rounded-xl border border-gray-100 p-3 grid grid-cols-1 md:grid-cols-4 gap-2">
                    <Input placeholder="Invoice #" value={invoiceForm.invoice_number} onChange={(e) => setInvoiceForm({ ...invoiceForm, invoice_number: e.target.value })} />
                    <Input type="date" value={invoiceForm.issue_date} onChange={(e) => setInvoiceForm({ ...invoiceForm, issue_date: e.target.value })} />
                    <Input type="date" value={invoiceForm.due_date} onChange={(e) => setInvoiceForm({ ...invoiceForm, due_date: e.target.value })} />
                    <Select value={invoiceForm.status} onValueChange={(v) => setInvoiceForm({ ...invoiceForm, status: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {[
                          "draft", "sent", "paid", "partially_paid", "overdue", "cancelled",
                        ].map((s) => <SelectItem key={s} value={s}>{prettyStatus(s)}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <Input className="md:col-span-2" placeholder="Line item description" value={invoiceForm.description} onChange={(e) => setInvoiceForm({ ...invoiceForm, description: e.target.value })} />
                    <Input type="number" placeholder="Qty" value={invoiceForm.quantity} onChange={(e) => setInvoiceForm({ ...invoiceForm, quantity: e.target.value })} />
                    <Input type="number" placeholder="Rate" value={invoiceForm.rate} onChange={(e) => setInvoiceForm({ ...invoiceForm, rate: e.target.value })} />
                    <Input type="number" placeholder="Discount" value={invoiceForm.discount} onChange={(e) => setInvoiceForm({ ...invoiceForm, discount: e.target.value })} />
                    <Input type="number" placeholder="Tax / fees" value={invoiceForm.tax_fees} onChange={(e) => setInvoiceForm({ ...invoiceForm, tax_fees: e.target.value })} />
                    <Input placeholder="Payment method" value={invoiceForm.payment_method} onChange={(e) => setInvoiceForm({ ...invoiceForm, payment_method: e.target.value })} />
                    <Textarea className="md:col-span-3" rows={2} placeholder="Notes" value={invoiceForm.notes} onChange={(e) => setInvoiceForm({ ...invoiceForm, notes: e.target.value })} />
                    <Button onClick={createInvoice}>Create invoice</Button>
                  </div>

                  <div className="rounded-xl border border-gray-100 overflow-hidden">
                    <table className="w-full text-sm">
                      <thead className="border-b border-gray-100 text-xs text-gray-500 uppercase">
                        <tr>
                          <th className="text-left px-3 py-2">Invoice</th>
                          <th className="text-left px-3 py-2">Status</th>
                          <th className="text-left px-3 py-2">Total</th>
                          <th className="text-left px-3 py-2">Paid</th>
                          <th className="text-left px-3 py-2">Balance</th>
                          <th className="text-left px-3 py-2">Due</th>
                        </tr>
                      </thead>
                      <tbody>
                        {invoices.map((inv) => (
                          <tr key={inv.id} className="border-b border-gray-100">
                            <td className="px-3 py-2">
                              <div className="font-medium">{inv.invoice_number}</div>
                              <div className="text-xs text-gray-500">{inv.issue_date}</div>
                            </td>
                            <td className="px-3 py-2">{prettyStatus(inv.status)}</td>
                            <td className="px-3 py-2">{money(inv.total)}</td>
                            <td className="px-3 py-2">{money(inv.amount_paid)}</td>
                            <td className="px-3 py-2">{money(inv.balance_due)}</td>
                            <td className="px-3 py-2">{inv.due_date}</td>
                          </tr>
                        ))}
                        {invoices.length === 0 && <tr><td colSpan={6} className="text-center py-8 text-gray-400 italic">No invoices yet.</td></tr>}
                      </tbody>
                    </table>
                  </div>
                </TabsContent>

                <TabsContent value="contracts" className="space-y-3 pt-3">
                  <div className="rounded-xl border border-gray-100 p-3 grid grid-cols-1 md:grid-cols-2 gap-2">
                    <Input placeholder="Contract title" value={contractForm.title} onChange={(e) => setContractForm({ ...contractForm, title: e.target.value })} />
                    <Select value={contractForm.status} onValueChange={(v) => setContractForm({ ...contractForm, status: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {["draft", "sent", "signed", "expired", "cancelled"].map((s) => <SelectItem key={s} value={s}>{prettyStatus(s)}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <Textarea rows={2} placeholder="Scope of work" value={contractForm.scope_of_work} onChange={(e) => setContractForm({ ...contractForm, scope_of_work: e.target.value })} />
                    <Textarea rows={2} placeholder="Deliverables (one per line)" value={contractForm.deliverables} onChange={(e) => setContractForm({ ...contractForm, deliverables: e.target.value })} />
                    <Input placeholder="Timeline" value={contractForm.timeline} onChange={(e) => setContractForm({ ...contractForm, timeline: e.target.value })} />
                    <Input placeholder="Payment terms" value={contractForm.payment_terms} onChange={(e) => setContractForm({ ...contractForm, payment_terms: e.target.value })} />
                    <Textarea rows={2} placeholder="Revision policy" value={contractForm.revision_policy} onChange={(e) => setContractForm({ ...contractForm, revision_policy: e.target.value })} />
                    <Textarea rows={2} placeholder="Cancellation policy" value={contractForm.cancellation_policy} onChange={(e) => setContractForm({ ...contractForm, cancellation_policy: e.target.value })} />
                    <Textarea rows={2} className="md:col-span-2" placeholder="Notes" value={contractForm.notes} onChange={(e) => setContractForm({ ...contractForm, notes: e.target.value })} />
                    <Button onClick={createContract}>Create contract</Button>
                  </div>

                  <div className="rounded-xl border border-gray-100 space-y-2 p-3">
                    {contracts.map((c) => (
                      <div key={c.id} className="rounded-lg border border-gray-100 p-3">
                        <div className="flex items-center justify-between gap-2">
                          <div className="font-medium">{c.title}</div>
                          <div className="text-xs">{prettyStatus(c.status)}</div>
                        </div>
                        <div className="text-xs text-gray-500 mt-1">{c.scope_of_work || "No scope yet"}</div>
                      </div>
                    ))}
                    {contracts.length === 0 && <div className="text-sm text-gray-400 italic text-center py-5">No contracts yet.</div>}
                  </div>
                </TabsContent>

                <TabsContent value="payments" className="space-y-3 pt-3">
                  <div className="rounded-xl border border-gray-100 p-3 grid grid-cols-1 md:grid-cols-4 gap-2">
                    <Select value={paymentForm.invoice_id || "none"} onValueChange={(v) => setPaymentForm({ ...paymentForm, invoice_id: v === "none" ? "" : v })}>
                      <SelectTrigger><SelectValue placeholder="Select invoice" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Select invoice</SelectItem>
                        {invoices.map((inv) => <SelectItem key={inv.id} value={inv.id}>{inv.invoice_number}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <Input type="date" value={paymentForm.payment_date} onChange={(e) => setPaymentForm({ ...paymentForm, payment_date: e.target.value })} />
                    <Input type="number" placeholder="Amount" value={paymentForm.amount} onChange={(e) => setPaymentForm({ ...paymentForm, amount: e.target.value })} />
                    <Input placeholder="Method" value={paymentForm.method} onChange={(e) => setPaymentForm({ ...paymentForm, method: e.target.value })} />
                    <Textarea className="md:col-span-3" rows={2} placeholder="Notes" value={paymentForm.notes} onChange={(e) => setPaymentForm({ ...paymentForm, notes: e.target.value })} />
                    <Button onClick={createPayment}>Record payment</Button>
                  </div>

                  <div className="rounded-xl border border-gray-100 overflow-hidden">
                    <table className="w-full text-sm">
                      <thead className="border-b border-gray-100 text-xs text-gray-500 uppercase">
                        <tr>
                          <th className="text-left px-3 py-2">Date</th>
                          <th className="text-left px-3 py-2">Invoice</th>
                          <th className="text-left px-3 py-2">Amount</th>
                          <th className="text-left px-3 py-2">Method</th>
                          <th className="text-left px-3 py-2">Remaining</th>
                        </tr>
                      </thead>
                      <tbody>
                        {payments.map((p) => {
                          const inv = invoices.find((x) => x.id === p.invoice_id);
                          return (
                            <tr key={p.id} className="border-b border-gray-100">
                              <td className="px-3 py-2">{p.payment_date}</td>
                              <td className="px-3 py-2">{inv?.invoice_number || p.invoice_id}</td>
                              <td className="px-3 py-2">{money(p.amount)}</td>
                              <td className="px-3 py-2">{p.method}</td>
                              <td className="px-3 py-2">{money(p.remaining_balance)}</td>
                            </tr>
                          );
                        })}
                        {payments.length === 0 && <tr><td colSpan={5} className="text-center py-8 text-gray-400 italic">No payments yet.</td></tr>}
                      </tbody>
                    </table>
                  </div>
                </TabsContent>

                <TabsContent value="revisions" className="space-y-3 pt-3">
                  <div className="rounded-xl border border-gray-100 p-3 grid grid-cols-1 md:grid-cols-3 gap-2">
                    <Input className="md:col-span-2" placeholder="Request title" value={revisionForm.request_title} onChange={(e) => setRevisionForm({ ...revisionForm, request_title: e.target.value })} />
                    <Select value={revisionForm.project_id} onValueChange={(v) => setRevisionForm({ ...revisionForm, project_id: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">No project</SelectItem>
                        {clientProjects.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <Textarea className="md:col-span-2" rows={2} placeholder="Description" value={revisionForm.description} onChange={(e) => setRevisionForm({ ...revisionForm, description: e.target.value })} />
                    <Input placeholder="Requested by" value={revisionForm.requested_by} onChange={(e) => setRevisionForm({ ...revisionForm, requested_by: e.target.value })} />
                    <Input placeholder="Affected area" value={revisionForm.affected_area} onChange={(e) => setRevisionForm({ ...revisionForm, affected_area: e.target.value })} />
                    <Select value={revisionForm.priority} onValueChange={(v) => setRevisionForm({ ...revisionForm, priority: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {["low", "medium", "high", "urgent"].map((s) => <SelectItem key={s} value={s}>{prettyStatus(s)}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <Select value={revisionForm.status} onValueChange={(v) => setRevisionForm({ ...revisionForm, status: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {["requested", "in_progress", "done", "approved", "rejected"].map((s) => <SelectItem key={s} value={s}>{prettyStatus(s)}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <Input type="date" value={revisionForm.date_requested} onChange={(e) => setRevisionForm({ ...revisionForm, date_requested: e.target.value })} />
                    <Input placeholder="Attachment link" value={revisionForm.attachment_link} onChange={(e) => setRevisionForm({ ...revisionForm, attachment_link: e.target.value })} />
                    <Button onClick={createRevision}>Create revision</Button>
                  </div>

                  <div className="rounded-xl border border-gray-100 space-y-2 p-3">
                    {revisions.map((r) => (
                      <div key={r.id} className="rounded-lg border border-gray-100 p-3">
                        <div className="flex items-center justify-between">
                          <div className="font-medium">{r.request_title}</div>
                          <div className="text-xs">{prettyStatus(r.status)}</div>
                        </div>
                        <div className="text-xs text-gray-500 mt-1">{r.description || "No details"}</div>
                      </div>
                    ))}
                    {revisions.length === 0 && <div className="text-sm text-gray-400 italic text-center py-5">No revisions yet.</div>}
                  </div>
                </TabsContent>

                <TabsContent value="timeline" className="space-y-3 pt-3">
                  <div className="rounded-xl border border-gray-100 p-3 grid grid-cols-1 md:grid-cols-3 gap-2">
                    <Input className="md:col-span-2" placeholder="Timeline title" value={timelineForm.title} onChange={(e) => setTimelineForm({ ...timelineForm, title: e.target.value })} />
                    <Select value={timelineForm.event_type} onValueChange={(v) => setTimelineForm({ ...timelineForm, event_type: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {["manual", "invoice_sent", "payment_received", "contract_signed", "revision_requested", "revision_completed", "project_handover", "maintenance_started"].map((s) => (
                          <SelectItem key={s} value={s}>{prettyStatus(s)}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Input type="date" value={timelineForm.occurred_at} onChange={(e) => setTimelineForm({ ...timelineForm, occurred_at: e.target.value })} />
                    <Textarea className="md:col-span-2" rows={2} placeholder="Details" value={timelineForm.details} onChange={(e) => setTimelineForm({ ...timelineForm, details: e.target.value })} />
                    <Button onClick={addTimelineEvent}>Add event</Button>
                  </div>

                  <div className="rounded-xl border border-gray-100 space-y-2 p-3">
                    {timelineEvents.map((ev) => (
                      <div key={ev.id} className="rounded-lg border border-gray-100 p-3">
                        <div className="flex items-center justify-between gap-2">
                          <div className="font-medium text-sm">{ev.title}</div>
                          <div className="text-xs text-gray-500">{ev.occurred_at?.slice(0, 10)}</div>
                        </div>
                        <div className="text-xs text-gray-500 mt-1">{prettyStatus(ev.event_type)} {ev.details ? `· ${ev.details}` : ""}</div>
                      </div>
                    ))}
                    {timelineEvents.length === 0 && <div className="text-sm text-gray-400 italic text-center py-5">No timeline events yet.</div>}
                  </div>
                </TabsContent>

                <TabsContent value="handover" className="space-y-3 pt-3">
                  <div className="rounded-xl border border-gray-100 p-3 space-y-2">
                    {handoverItems.map((item) => (
                      <label key={item.id} className="flex items-center gap-3 rounded-lg border border-gray-100 p-2">
                        <Checkbox checked={item.completed} onCheckedChange={() => toggleHandover(item)} />
                        <div className={`text-sm ${item.completed ? "line-through text-gray-400" : "text-gray-800"}`}>{item.title}</div>
                      </label>
                    ))}
                    {handoverItems.length === 0 && <div className="text-sm text-gray-400 italic text-center py-5">No handover items yet.</div>}
                  </div>
                  <div className="rounded-xl border border-gray-100 p-3 flex gap-2">
                    <Input placeholder="Add custom handover item" value={newHandoverTitle} onChange={(e) => setNewHandoverTitle(e.target.value)} />
                    <Button onClick={addHandoverItem}>Add</Button>
                  </div>
                </TabsContent>

                <TabsContent value="files-links" className="space-y-3 pt-3">
                  <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
                    Security warning: do not store plaintext passwords in this module. Save only URLs and non-sensitive notes unless an encrypted vault exists.
                  </div>
                  <div className="rounded-xl border border-gray-100 p-3 grid grid-cols-1 md:grid-cols-4 gap-2">
                    <Input className="md:col-span-2" placeholder="Label" value={fileLinkForm.label} onChange={(e) => setFileLinkForm({ ...fileLinkForm, label: e.target.value })} />
                    <Select value={fileLinkForm.link_type} onValueChange={(v) => setFileLinkForm({ ...fileLinkForm, link_type: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {["google_drive", "figma", "github_repo", "website", "staging", "production", "admin_login_url", "tutorial_video", "other"].map((s) => (
                          <SelectItem key={s} value={s}>{prettyStatus(s)}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Select value={fileLinkForm.project_id} onValueChange={(v) => setFileLinkForm({ ...fileLinkForm, project_id: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">No project</SelectItem>
                        {clientProjects.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <Input className="md:col-span-3" placeholder="URL" value={fileLinkForm.url} onChange={(e) => setFileLinkForm({ ...fileLinkForm, url: e.target.value })} />
                    <Textarea className="md:col-span-3" rows={2} placeholder="Notes" value={fileLinkForm.notes} onChange={(e) => setFileLinkForm({ ...fileLinkForm, notes: e.target.value })} />
                    <Button onClick={createFileLink}>Add link</Button>
                  </div>

                  <div className="rounded-xl border border-gray-100 overflow-hidden">
                    <table className="w-full text-sm">
                      <thead className="border-b border-gray-100 text-xs text-gray-500 uppercase">
                        <tr>
                          <th className="text-left px-3 py-2">Label</th>
                          <th className="text-left px-3 py-2">Type</th>
                          <th className="text-left px-3 py-2">Project</th>
                          <th className="text-left px-3 py-2">URL</th>
                        </tr>
                      </thead>
                      <tbody>
                        {fileLinks.map((f) => {
                          const p = clientProjects.find((x) => x.id === f.project_id);
                          return (
                            <tr key={f.id} className="border-b border-gray-100">
                              <td className="px-3 py-2">{f.label}</td>
                              <td className="px-3 py-2">{prettyStatus(f.link_type)}</td>
                              <td className="px-3 py-2">{p?.name || "—"}</td>
                              <td className="px-3 py-2">
                                <a href={f.url} target="_blank" rel="noreferrer" className="text-blue-600 underline break-all">{f.url}</a>
                              </td>
                            </tr>
                          );
                        })}
                        {fileLinks.length === 0 && <tr><td colSpan={4} className="text-center py-8 text-gray-400 italic">No links yet.</td></tr>}
                      </tbody>
                    </table>
                  </div>
                </TabsContent>
                <TabsContent value="maintenance" className="space-y-3 pt-3">
                  <div className="rounded-xl border border-gray-100 p-3 grid grid-cols-1 md:grid-cols-3 gap-2">
                    <Input
                      className="md:col-span-2"
                      placeholder="Maintenance plan name"
                      value={maintenanceForm.plan_name}
                      onChange={(e) => setMaintenanceForm({ ...maintenanceForm, plan_name: e.target.value })}
                    />
                    <Select value={maintenanceForm.status} onValueChange={(v) => setMaintenanceForm({ ...maintenanceForm, status: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {["active", "paused", "cancelled"].map((s) => <SelectItem key={s} value={s}>{prettyStatus(s)}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <Select value={maintenanceForm.project_id} onValueChange={(v) => setMaintenanceForm({ ...maintenanceForm, project_id: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">No project</SelectItem>
                        {clientProjects.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <Input
                      type="number"
                      placeholder="Monthly fee"
                      value={maintenanceForm.monthly_fee}
                      onChange={(e) => setMaintenanceForm({ ...maintenanceForm, monthly_fee: e.target.value })}
                    />
                    <Input
                      type="date"
                      placeholder="Start date"
                      value={maintenanceForm.start_date}
                      onChange={(e) => setMaintenanceForm({ ...maintenanceForm, start_date: e.target.value })}
                    />
                    <Input
                      type="date"
                      placeholder="Renewal date"
                      value={maintenanceForm.renewal_date}
                      onChange={(e) => setMaintenanceForm({ ...maintenanceForm, renewal_date: e.target.value })}
                    />
                    <Textarea
                      rows={2}
                      placeholder="Included services (one per line)"
                      value={maintenanceForm.included_services}
                      onChange={(e) => setMaintenanceForm({ ...maintenanceForm, included_services: e.target.value })}
                    />
                    <Textarea
                      rows={2}
                      placeholder="Recurring tasks (one per line)"
                      value={maintenanceForm.recurring_tasks}
                      onChange={(e) => setMaintenanceForm({ ...maintenanceForm, recurring_tasks: e.target.value })}
                    />
                    <Textarea
                      rows={2}
                      placeholder="Support requests / notes from client"
                      value={maintenanceForm.support_requests}
                      onChange={(e) => setMaintenanceForm({ ...maintenanceForm, support_requests: e.target.value })}
                    />
                    <Textarea
                      className="md:col-span-2"
                      rows={2}
                      placeholder="Internal notes"
                      value={maintenanceForm.notes}
                      onChange={(e) => setMaintenanceForm({ ...maintenanceForm, notes: e.target.value })}
                    />
                    <Button onClick={createMaintenancePlan}>Create maintenance plan</Button>
                  </div>

                  <div className="rounded-xl border border-gray-100 space-y-2 p-3">
                    {maintenancePlans.map((plan) => {
                      const project = clientProjects.find((p) => p.id === plan.project_id);
                      return (
                        <div key={plan.id} className="rounded-lg border border-gray-100 p-3 space-y-2">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <div>
                              <div className="font-medium">{plan.plan_name}</div>
                              <div className="text-xs text-gray-500">
                                {project?.name || "No project"} · ${money(plan.monthly_fee)}/mo
                              </div>
                            </div>
                            <div className="w-44">
                              <Select value={plan.status} onValueChange={(v) => updateMaintenanceStatus(plan, v)}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                  {["active", "paused", "cancelled"].map((s) => <SelectItem key={s} value={s}>{prettyStatus(s)}</SelectItem>)}
                                </SelectContent>
                              </Select>
                            </div>
                          </div>
                          <div className="text-xs text-gray-500">
                            Start: {plan.start_date || "—"} · Renewal: {plan.renewal_date || "—"}
                          </div>
                          {plan.included_services?.length > 0 && (
                            <div className="text-xs text-gray-500">
                              Services: {plan.included_services.join(", ")}
                            </div>
                          )}
                          {plan.support_requests && (
                            <div className="text-xs text-gray-500">
                              Support requests: {plan.support_requests}
                            </div>
                          )}
                        </div>
                      );
                    })}
                    {maintenancePlans.length === 0 && (
                      <div className="text-sm text-gray-400 italic text-center py-5">
                        No maintenance plans yet.
                      </div>
                    )}
                  </div>
                </TabsContent>
                <TabsContent value="notes" className="pt-3 space-y-3">
                  <Textarea
                    rows={6}
                    value={selectedClient.notes || ""}
                    onChange={(e) => setClients((prev) => prev.map((c) => c.id === selectedClient.id ? { ...c, notes: e.target.value } : c))}
                    placeholder="Client notes"
                  />
                  <Button onClick={() => saveClientNotes((clients.find((c) => c.id === selectedClient.id) || {}).notes || "")}>Save notes</Button>
                </TabsContent>
              </Tabs>

              {busy && <div className="text-xs text-gray-500 mt-3">Updating workspace data...</div>}
            </>
          )}
        </section>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-display">Create client</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <Input
              placeholder="Client name"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
            <Input
              placeholder="Company/brand"
              value={form.company_name}
              onChange={(e) => setForm({ ...form, company_name: e.target.value })}
            />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              <Input
                placeholder="Email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
              <Input
                placeholder="Phone"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
              />
            </div>
            <Input
              placeholder="Website"
              value={form.website}
              onChange={(e) => setForm({ ...form, website: e.target.value })}
            />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                <SelectTrigger><SelectValue placeholder="Status" /></SelectTrigger>
                <SelectContent>
                  {CLIENT_STATUSES.map((s) => (
                    <SelectItem key={s} value={s}>{prettyStatus(s)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={form.source} onValueChange={(v) => setForm({ ...form, source: v })}>
                <SelectTrigger><SelectValue placeholder="Source" /></SelectTrigger>
                <SelectContent>
                  {CLIENT_SOURCES.map((s) => (
                    <SelectItem key={s} value={s}>{prettyStatus(s)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Textarea
              rows={3}
              placeholder="Notes"
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={createClient} disabled={!form.name.trim()}>Create client</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function MetricCard({ label, value }) {
  return (
    <div className="rounded-xl border border-gray-100 p-3">
      <div className="text-xs text-gray-500">{label}</div>
      <div className="text-xl font-semibold mt-1">{value}</div>
    </div>
  );
}
