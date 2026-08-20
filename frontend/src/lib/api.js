import axios from "axios";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
export const API = `${BACKEND_URL}/api`;
const AUTH_BYPASS = process.env.REACT_APP_BYPASS_AUTH === "true";

const DEV_USER = {
  id: "dev-guest",
  email: "guest@local.dev",
  name: "Guest Viewer",
  role: "admin",
  avatar_url: null,
};

const LS_KEY = "serenops.localdb.v1";

const COLLECTION_MAP = {
  "file-links": "file_links",
  "timeline-events": "timeline_events",
  "maintenance-plans": "maintenance_plans",
};

function nowIso() {
  return new Date().toISOString();
}

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function parseDateSafe(s) {
  if (!s) return null;
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? null : d;
}

function rid() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `id-${Math.random().toString(36).slice(2)}-${Date.now().toString(36)}`;
}

function normalizePath(url = "") {
  const [raw] = String(url).split("?");
  return raw.startsWith("/") ? raw : `/${raw}`;
}

function toCollection(segment) {
  return COLLECTION_MAP[segment] || String(segment || "").replace(/-/g, "_");
}

function clone(data) {
  return JSON.parse(JSON.stringify(data));
}

function defaultTemplates(ownerId) {
  const stamp = nowIso();
  const rows = [
    ["Onboarding Checklist Template", "onboarding_checklist", "Confirm project goals\nCollect access\nConfirm communication"],
    ["Website Project Checklist", "website_project_checklist", "Wireframe approved\nCore pages drafted\nQA complete"],
    ["Proposal Template", "proposal_template", "Project title:\nScope of work:\nTimeline:\nPricing:"],
    ["Contract Template", "contract_template", "Scope of work:\nDeliverables:\nPayment terms:\nTimeline:"],
    ["Invoice Template", "invoice_template", "Line item:\nQuantity:\nRate:\nDiscount:\nTax/fees:"],
  ];
  return rows.map(([name, template_type, content]) => ({
    id: rid(),
    name,
    template_type,
    content,
    is_default: true,
    created_at: stamp,
    updated_at: stamp,
    owner_id: ownerId,
  }));
}

function defaultDb() {
  const stamp = nowIso();
  return {
    users: [clone(DEV_USER)],
    clients: [],
    projects: [],
    tasks: [],
    invoices: [],
    payments: [],
    proposals: [],
    contracts: [],
    file_links: [],
    revisions: [],
    timeline_events: [],
    maintenance_plans: [],
    templates: defaultTemplates(DEV_USER.id),
    onboarding_items: [],
    handover_items: [],
    notifications: [
      {
        id: rid(),
        type: "due_soon",
        title: "Local Mode Enabled",
        message: "Bypass auth is active. Changes are saved to local storage.",
        read: false,
        created_at: stamp,
      },
    ],
    meetings: [],
    llm_config: {
      provider: "openai",
      model: "gpt-5.1",
      base_url: "",
      has_custom_key: false,
      api_key: "",
    },
  };
}

function readDb() {
  if (typeof window === "undefined") return defaultDb();
  const raw = window.localStorage.getItem(LS_KEY);
  if (!raw) return defaultDb();
  try {
    const parsed = JSON.parse(raw);
    return { ...defaultDb(), ...parsed };
  } catch {
    return defaultDb();
  }
}

function writeDb(db) {
  if (typeof window !== "undefined") {
    window.localStorage.setItem(LS_KEY, JSON.stringify(db));
  }
}

function response(data, status = 200) {
  return Promise.resolve({ data: clone(data), status, statusText: "OK", headers: {}, config: {} });
}

function reject(detail, status = 400) {
  const err = new Error(typeof detail === "string" ? detail : "Request failed");
  err.response = { status, data: { detail } };
  return Promise.reject(err);
}

function ensureClientArtifacts(db, clientId) {
  const hasOnboarding = db.onboarding_items.some((x) => x.client_id === clientId);
  const hasHandover = db.handover_items.some((x) => x.client_id === clientId);
  const stamp = nowIso();
  if (!hasOnboarding) {
    [
      "Define project goals",
      "Collect required access",
      "Confirm communication cadence",
      "Finalize onboarding checklist",
    ].forEach((title) => {
      db.onboarding_items.push({
        id: rid(),
        client_id: clientId,
        title,
        category: "onboarding_checklist",
        notes: "",
        completed: false,
        created_at: stamp,
        updated_at: stamp,
      });
    });
  }
  if (!hasHandover) {
    [
      "Final files delivered",
      "Documentation sent",
      "Client approval received",
      "Maintenance offered",
    ].forEach((title) => {
      db.handover_items.push({
        id: rid(),
        client_id: clientId,
        title,
        notes: "",
        completed: false,
        created_at: stamp,
        updated_at: stamp,
      });
    });
  }
}

function computeInvoiceFields(doc) {
  const lineItems = doc.line_items || [];
  const subtotal = Number(
    lineItems.reduce((sum, i) => sum + Number(i.quantity || 0) * Number(i.rate || 0), 0).toFixed(2)
  );
  const discount = Number(Number(doc.discount || 0).toFixed(2));
  const taxFees = Number(Number(doc.tax_fees || 0).toFixed(2));
  const amountPaid = Number(Number(doc.amount_paid || 0).toFixed(2));
  const total = Number(Math.max(0, subtotal - discount + taxFees).toFixed(2));
  const balanceDue = Number(Math.max(0, total - amountPaid).toFixed(2));

  let status = doc.status || "draft";
  const due = parseDateSafe(doc.due_date);
  const now = new Date();
  if (status !== "cancelled") {
    if (balanceDue <= 0 && total > 0) status = "paid";
    else if (amountPaid > 0 && balanceDue > 0) status = "partially_paid";
    else if (due && due < now && ["draft", "sent", "overdue"].includes(status)) status = "overdue";
  }

  doc.subtotal = subtotal;
  doc.discount = discount;
  doc.tax_fees = taxFees;
  doc.total = total;
  doc.amount_paid = amountPaid;
  doc.balance_due = balanceDue;
  doc.status = status;
}

function byClient(list, clientId) {
  if (!clientId) return list;
  return list.filter((x) => x.client_id === clientId);
}

function workspaceSummary(db, clientId) {
  const tasks = db.tasks.filter((t) => t.client_id === clientId);
  const projects = db.projects.filter((p) => p.client_id === clientId);
  const revisions = db.revisions.filter((r) => r.client_id === clientId);
  const proposals = db.proposals.filter((p) => p.client_id === clientId);
  const invoices = db.invoices.filter((i) => i.client_id === clientId);
  const contracts = db.contracts.filter((c) => c.client_id === clientId);
  const onboarding = db.onboarding_items.filter((i) => i.client_id === clientId);
  const handover = db.handover_items.filter((i) => i.client_id === clientId);
  const maintenance = db.maintenance_plans.filter((m) => m.client_id === clientId);

  const today = new Date(todayIso());
  const overdueTasks = tasks.filter((t) => {
    const due = parseDateSafe(t.due_date);
    return due && due < today && t.status !== "done";
  }).length;

  return {
    projects_count: projects.length,
    open_tasks_count: tasks.filter((t) => t.status !== "done").length,
    overdue_tasks_count: overdueTasks,
    revisions_pending: revisions.filter((r) => ["requested", "in_progress"].includes(r.status)).length,
    onboarding_done: onboarding.filter((x) => x.completed).length,
    onboarding_total: onboarding.length,
    pending_proposals: proposals.filter((p) => ["draft", "sent"].includes(p.status)).length,
    pending_invoices: invoices.filter((i) => Number(i.balance_due || 0) > 0 && i.status !== "cancelled").length,
    pending_contracts: contracts.filter((c) => ["draft", "sent"].includes(c.status)).length,
    handover_done: handover.filter((x) => x.completed).length,
    handover_total: handover.length,
    maintenance_active: maintenance.filter((m) => m.status === "active").length,
    maintenance_total: maintenance.length,
  };
}

function dashboardSummary(db) {
  const today = new Date(todayIso());
  const nextWeek = new Date(today);
  nextWeek.setDate(nextWeek.getDate() + 7);

  const upcomingDeadlines = db.tasks.filter((t) => {
    const due = parseDateSafe(t.due_date);
    return due && due >= today && due <= nextWeek && t.status !== "done";
  }).length;

  return {
    total_clients: db.clients.length,
    active_clients: db.clients.filter((c) => c.status === "active").length,
    leads: db.clients.filter((c) => c.status === "lead").length,
    pending_proposals: db.proposals.filter((p) => ["draft", "sent"].includes(p.status)).length,
    pending_invoices: db.invoices.filter((i) => Number(i.balance_due || 0) > 0 && i.status !== "cancelled").length,
    pending_contracts: db.contracts.filter((c) => ["draft", "sent"].includes(c.status)).length,
    revisions_pending: db.revisions.filter((r) => ["requested", "in_progress"].includes(r.status)).length,
    payments_due: db.invoices.filter((i) => Number(i.balance_due || 0) > 0 && i.status !== "cancelled").length,
    upcoming_deadlines: upcomingDeadlines,
    clients_needing_follow_up: db.clients.filter((c) => ["lead", "waiting_for_client"].includes(c.status)).length,
    projects_in_progress: db.projects.filter((p) => p.status === "in_progress").length,
    ai_insights: [],
  };
}

function populateSampleDb(db) {
  const stamp = nowIso();
  const today = todayIso();
  const ownerId = DEV_USER.id;

  const c1 = rid(), c2 = rid(), c3 = rid(), c4 = rid();
  const p1 = rid(), p2 = rid(), p3 = rid(), p4 = rid();
  const inv1 = rid(), inv2 = rid(), inv3 = rid();

  const clients = [
    { id: c1, name: "Acme Studios", company_name: "Acme Media Group", email: "contact@acmestudios.com", phone: "+1 (555) 234-5678", status: "active", source: "referral", notes: "Key branding & website client", owner_id: ownerId, created_at: stamp, updated_at: stamp },
    { id: c2, name: "Apex Digital", company_name: "Apex Solutions Inc", email: "hello@apexdigital.co", phone: "+1 (555) 876-5432", status: "active", source: "website", notes: "Mobile app companion project", owner_id: ownerId, created_at: stamp, updated_at: stamp },
    { id: c3, name: "Nova Health", company_name: "Nova Wellness Ltd", email: "info@novahealth.org", phone: "+1 (555) 345-6789", status: "lead", source: "inbound", notes: "In discussion for internal analytics portal", owner_id: ownerId, created_at: stamp, updated_at: stamp },
    { id: c4, name: "Pinnacle Tech", company_name: "Pinnacle Systems", email: "partners@pinnacle.io", phone: "+1 (555) 901-2345", status: "completed", source: "linkedin", notes: "DevOps & GitHub Sync project completed", owner_id: ownerId, created_at: stamp, updated_at: stamp },
  ];

  const projects = [
    { id: p1, name: "BrightBridge Website", description: "Marketing site refresh & CMS migration", color: "#EA580C", status: "in_progress", client_id: c1, owner_id: ownerId, created_at: stamp, updated_at: stamp },
    { id: p2, name: "9TDesign Mobile App", description: "iOS & Android companion prototype", color: "#3B82F6", status: "in_progress", client_id: c2, owner_id: ownerId, created_at: stamp, updated_at: stamp },
    { id: p3, name: "Horizon Dashboard", description: "Internal analytics & telemetry dashboard", color: "#10B981", status: "planning", client_id: c3, owner_id: ownerId, created_at: stamp, updated_at: stamp },
    { id: p4, name: "GitHub Sync Pipeline", description: "Dev assets sync & automation", color: "#8B5CF6", status: "completed", client_id: c4, owner_id: ownerId, created_at: stamp, updated_at: stamp },
  ];

  const tasks = [
    { id: rid(), title: "Design framer website with modern templates", description: "BrightBridge marketing landing page design", status: "in_progress", priority: "high", due_date: today, project_id: p1, client_id: c1, assignee_id: ownerId, creator_id: ownerId, created_at: stamp, updated_at: stamp },
    { id: rid(), title: "Fix navbar overflow on mobile screens", description: "Critical UI bug on small viewport sizes", status: "in_progress", priority: "urgent", due_date: today, project_id: p1, client_id: c1, assignee_id: ownerId, creator_id: ownerId, created_at: stamp, updated_at: stamp },
    { id: rid(), title: "Mobile App Prototype ready for testing", description: "Prepare Figma prototype for user testing", status: "todo", priority: "high", due_date: today, project_id: p2, client_id: c2, assignee_id: ownerId, creator_id: ownerId, created_at: stamp, updated_at: stamp },
    { id: rid(), title: "Dashboard Design layout review", description: "Finalize card grid and chart components", status: "todo", priority: "medium", due_date: today, project_id: p3, client_id: c3, assignee_id: ownerId, creator_id: ownerId, created_at: stamp, updated_at: stamp },
    { id: rid(), title: "API contract for tasks endpoint", description: "Document OpenAPI schema & REST routes", status: "done", priority: "medium", due_date: today, project_id: p3, client_id: c3, assignee_id: ownerId, creator_id: ownerId, created_at: stamp, updated_at: stamp },
    { id: rid(), title: "Launch checklist QA verification", description: "Pre-launch cross browser check", status: "done", priority: "low", due_date: today, project_id: p4, client_id: c4, assignee_id: ownerId, creator_id: ownerId, created_at: stamp, updated_at: stamp },
  ];

  const proposals = [
    { id: rid(), client_id: c1, project_title: "BrightBridge Website Redesign & Brand Refresh", scope_of_work: "Complete UI/UX overhaul, responsive template development, CMS setup.", deliverables: "Figma design system, React landing pages.", pricing: "$12,500 USD", status: "accepted", sent_date: today, valid_until: today, notes: "Accepted by client.", created_at: stamp, updated_at: stamp, owner_id: ownerId },
    { id: rid(), client_id: c2, project_title: "Apex Companion Mobile App MVP", scope_of_work: "Cross-platform mobile application prototype.", deliverables: "iOS/Android app bundle, API specs.", pricing: "$18,000 USD", status: "sent", sent_date: today, valid_until: today, notes: "Sent to client team.", created_at: stamp, updated_at: stamp, owner_id: ownerId },
  ];

  const contracts = [
    { id: rid(), client_id: c1, title: "Master Services Agreement - Acme Studios", scope_of_work: "Design & development services for BrightBridge Website Refresh.", payment_terms: "50% upfront deposit ($6,250), 50% upon project completion ($6,250).", status: "signed", effective_date: today, created_at: stamp, updated_at: stamp, owner_id: ownerId }
  ];

  const i1 = { id: inv1, invoice_number: "INV-2026-001", client_id: c1, project_id: p1, issue_date: today, due_date: today, currency: "USD", line_items: [{ description: "50% Upfront Deposit - Website Redesign", quantity: 1, rate: 6250.0 }], subtotal: 6250.0, discount: 0, tax_fees: 0, total: 6250.0, amount_paid: 6250.0, balance_due: 0, status: "paid", notes: "Thank you for your business!", created_at: stamp, updated_at: stamp, owner_id: ownerId };
  const i2 = { id: inv2, invoice_number: "INV-2026-002", client_id: c1, project_id: p1, issue_date: today, due_date: today, currency: "USD", line_items: [{ description: "Final Milestone Payment - Website Delivery", quantity: 1, rate: 6250.0 }], subtotal: 6250.0, discount: 0, tax_fees: 0, total: 6250.0, amount_paid: 0, balance_due: 6250.0, status: "sent", notes: "Due upon final launch.", created_at: stamp, updated_at: stamp, owner_id: ownerId };
  const i3 = { id: inv3, invoice_number: "INV-2026-003", client_id: c2, project_id: p2, issue_date: today, due_date: today, currency: "USD", line_items: [{ description: "Mobile App Prototype & Wireframes", quantity: 1, rate: 4500.0 }], subtotal: 4500.0, discount: 0, tax_fees: 0, total: 4500.0, amount_paid: 0, balance_due: 4500.0, status: "overdue", notes: "Please process payment as soon as possible.", created_at: stamp, updated_at: stamp, owner_id: ownerId };
  const invoices = [i1, i2, i3];

  const payments = [
    { id: rid(), client_id: c1, invoice_id: inv1, project_id: p1, payment_date: today, amount: 6250.0, method: "stripe", reference_number: "ch_3N1xYZ2eZvKYlo2C", notes: "Stripe online payment received", status: "recorded", remaining_balance: 0.0, created_at: stamp, owner_id: ownerId }
  ];

  const revisions = [
    { id: rid(), client_id: c1, project_id: p1, request_title: "Hero CTA alignment & font weight update", description: "Increase primary button size and adjust hero banner typography.", status: "in_progress", date_requested: today, created_at: stamp, updated_at: stamp, owner_id: ownerId },
    { id: rid(), client_id: c2, project_id: p2, request_title: "Color scheme adjustments for dark mode on mobile", description: "Ensure high contrast on dark mode background cards.", status: "requested", date_requested: today, created_at: stamp, updated_at: stamp, owner_id: ownerId }
  ];

  const maintenance_plans = [
    { id: rid(), client_id: c4, project_id: p4, plan_name: "Standard Maintenance & Security SLA", monthly_fee: 450.0, start_date: today, status: "active", notes: "Includes monthly server patch & backup verification.", created_at: stamp, updated_at: stamp, owner_id: ownerId }
  ];

  const timeline_events = [
    { id: rid(), client_id: c1, event_type: "client_created", title: "Client onboarded: Acme Studios", details: "Acme Media Group", occurred_at: today, created_at: stamp, owner_id: ownerId },
    { id: rid(), client_id: c1, event_type: "contract_signed", title: "Contract signed: Master Services Agreement", details: "50% upfront deposit", occurred_at: today, created_at: stamp, owner_id: ownerId },
    { id: rid(), client_id: c1, event_type: "payment_received", title: "Payment received for INV-2026-001", details: "$6,250.00 via Stripe", occurred_at: today, created_at: stamp, owner_id: ownerId }
  ];

  const meetings = [
    { id: rid(), title: "BrightBridge Design Sync", platform: "Google Meet", starts_at: stamp, project_id: p1 },
    { id: rid(), title: "Apex Mobile App Demo", platform: "Zoom", starts_at: stamp, project_id: p2 }
  ];

  const nextDb = { ...db, clients, projects, tasks, proposals, contracts, invoices, payments, revisions, maintenance_plans, timeline_events, meetings };
  clients.forEach((c) => ensureClientArtifacts(nextDb, c.id));
  return nextDb;
}

function clearSampleDb(db) {
  return {
    ...db,
    clients: [],
    projects: [],
    tasks: [],
    invoices: [],
    payments: [],
    proposals: [],
    contracts: [],
    file_links: [],
    revisions: [],
    timeline_events: [],
    maintenance_plans: [],
    onboarding_items: [],
    handover_items: [],
    meetings: [],
  };
}

function localRequest(method, url, payload = null, config = {}) {
  const db = readDb();
  const path = normalizePath(url);
  const parts = path.replace(/^\//, "").split("/").filter(Boolean);
  const params = config?.params || {};
  const stamp = nowIso();

  if (parts[0] === "sample-data") {
    if (parts[1] === "load" && method === "post") {
      const sample = populateSampleDb(db);
      writeDb(sample);
      return response({ ok: true, message: "Sample data loaded successfully." });
    }
    if (parts[1] === "clear" && method === "delete") {
      const cleared = clearSampleDb(db);
      writeDb(cleared);
      return response({ ok: true, message: "Sample data removed successfully." });
    }
  }

  if (parts[0] === "auth") {
    if (method === "get" && parts[1] === "me") return response(DEV_USER);
    if (method === "post" && ["login", "register", "logout"].includes(parts[1])) return response(DEV_USER);
  }

  if (parts[0] === "chat" && method === "post") {
    return response({
      session_id: payload?.session_id || rid(),
      source: "local-bypass",
      reply: "Bypass mode is enabled. Chat responses are local placeholders only.",
    });
  }

  if (parts[0] === "llm-config") {
    if (method === "get") {
      const out = { ...db.llm_config, api_key: "" };
      return response(out);
    }
    if (method === "put") {
      db.llm_config = {
        ...db.llm_config,
        provider: payload?.provider || db.llm_config.provider,
        model: payload?.model || db.llm_config.model,
        base_url: payload?.base_url || "",
        has_custom_key: db.llm_config.has_custom_key || Boolean(payload?.api_key),
        api_key: payload?.api_key ? payload.api_key : db.llm_config.api_key,
      };
      writeDb(db);
      return response({ ...db.llm_config, api_key: "" });
    }
  }

  if (parts[0] === "dashboard" && parts[1] === "summary" && method === "get") {
    return response(dashboardSummary(db));
  }

  if (parts[0] === "clients" && parts[1] && parts[2] === "workspace-summary" && method === "get") {
    return response(workspaceSummary(db, parts[1]));
  }

  if (parts[0] === "clients" && parts[1] && parts[2] === "onboarding") {
    const clientId = parts[1];
    if (method === "get" && parts.length === 3) {
      return response(db.onboarding_items.filter((x) => x.client_id === clientId));
    }
    if (method === "post" && parts.length === 3) {
      const item = {
        id: rid(),
        client_id: clientId,
        title: payload?.title || "Untitled",
        category: payload?.category || "onboarding_checklist",
        notes: payload?.notes || "",
        completed: Boolean(payload?.completed),
        created_at: stamp,
        updated_at: stamp,
      };
      db.onboarding_items.push(item);
      writeDb(db);
      return response(item, 201);
    }
    if (method === "patch" && parts[3]) {
      const item = db.onboarding_items.find((x) => x.id === parts[3] && x.client_id === clientId);
      if (!item) return reject("Onboarding item not found", 404);
      Object.assign(item, payload || {}, { updated_at: stamp });
      writeDb(db);
      return response(item);
    }
  }

  if (parts[0] === "clients" && parts[1] && parts[2] === "handover") {
    const clientId = parts[1];
    if (method === "get" && parts.length === 3) {
      return response(db.handover_items.filter((x) => x.client_id === clientId));
    }
    if (method === "post" && parts.length === 3) {
      const item = {
        id: rid(),
        client_id: clientId,
        title: payload?.title || "Untitled",
        notes: payload?.notes || "",
        completed: Boolean(payload?.completed),
        created_at: stamp,
        updated_at: stamp,
      };
      db.handover_items.push(item);
      writeDb(db);
      return response(item, 201);
    }
    if (method === "patch" && parts[3]) {
      const item = db.handover_items.find((x) => x.id === parts[3] && x.client_id === clientId);
      if (!item) return reject("Handover item not found", 404);
      Object.assign(item, payload || {}, { updated_at: stamp });
      writeDb(db);
      return response(item);
    }
  }

  if (parts[0] === "notifications" && method === "post" && parts[1] === "read-all") {
    db.notifications = db.notifications.map((n) => ({ ...n, read: true }));
    writeDb(db);
    return response({ ok: true });
  }
  if (parts[0] === "notifications" && method === "patch" && parts[2] === "read") {
    const item = db.notifications.find((n) => n.id === parts[1]);
    if (!item) return reject("Notification not found", 404);
    item.read = true;
    writeDb(db);
    return response(item);
  }

  if (parts[0] === "invoices" && parts[1] && method === "get") {
    const invoice = db.invoices.find((x) => x.id === parts[1]);
    if (!invoice) return reject("Invoice not found", 404);
    return response(invoice);
  }

  if (parts[0] === "contracts" && parts[1] && method === "get") {
    const contract = db.contracts.find((x) => x.id === parts[1]);
    if (!contract) return reject("Contract not found", 404);
    return response(contract);
  }

  if (parts[0] === "payments" && method === "post") {
    const amount = Number(payload?.amount || 0);
    if (amount <= 0) return reject("Payment amount must be greater than 0", 400);
    const invoice = db.invoices.find((i) => i.id === payload?.invoice_id);
    if (!invoice) return reject("Invoice not found", 404);
    if (invoice.client_id !== payload?.client_id) return reject("Invoice does not belong to selected client", 400);

    if (payload?.project_id) {
      const project = db.projects.find((p) => p.id === payload.project_id);
      if (!project) return reject("Project not found", 404);
      if (project.client_id !== payload?.client_id) return reject("Project does not belong to selected client", 400);
    }

    invoice.amount_paid = Number(invoice.amount_paid || 0) + amount;
    invoice.updated_at = stamp;
    computeInvoiceFields(invoice);

    const pay = {
      id: rid(),
      client_id: payload.client_id,
      invoice_id: payload.invoice_id,
      project_id: payload.project_id || invoice.project_id || null,
      payment_date: payload.payment_date || todayIso(),
      amount,
      method: payload.method || "manual",
      reference_number: payload.reference_number || "",
      notes: payload.notes || "",
      status: payload.status || "recorded",
      remaining_balance: invoice.balance_due,
      created_at: stamp,
      owner_id: DEV_USER.id,
    };
    db.payments.push(pay);

    db.timeline_events.push({
      id: rid(),
      client_id: payload.client_id,
      event_type: "payment_received",
      title: `Payment received for ${invoice.invoice_number}`,
      details: `Amount: ${amount}. Remaining: ${invoice.balance_due}`,
      occurred_at: payload.payment_date || stamp,
      created_at: stamp,
      owner_id: DEV_USER.id,
    });

    writeDb(db);
    return response(pay, 201);
  }

  if (parts.length >= 1) {
    const collection = toCollection(parts[0]);
    if (!db[collection] && method === "get") {
      return response([]);
    }
    if (!db[collection] && ["post", "patch", "delete"].includes(method)) {
      return reject("Unsupported endpoint in local mode", 404);
    }

    if (method === "get" && parts.length === 1) {
      let list = db[collection] || [];
      if (params.client_id) list = byClient(list, params.client_id);
      if (params.project_id) list = list.filter((x) => x.project_id === params.project_id);
      if (params.invoice_id) list = list.filter((x) => x.invoice_id === params.invoice_id);
      return response(list);
    }

    if (method === "post" && parts.length === 1) {
      const item = {
        ...(payload || {}),
        id: rid(),
        created_at: stamp,
        updated_at: stamp,
        owner_id: DEV_USER.id,
      };

      if (collection === "tasks") {
        item.status = item.status || "todo";
        item.priority = item.priority || "medium";
        item.creator_id = DEV_USER.id;
      }

      if (collection === "clients") {
        item.status = item.status || "lead";
        item.source = item.source || "manual";
        ensureClientArtifacts(db, item.id);
      }

      if (collection === "invoices") {
        item.currency = item.currency || "USD";
        item.line_items = item.line_items || [];
        item.discount = Number(item.discount || 0);
        item.tax_fees = Number(item.tax_fees || 0);
        item.amount_paid = Number(item.amount_paid || 0);
        computeInvoiceFields(item);
        if (["sent", "overdue"].includes(item.status)) {
          db.timeline_events.push({
            id: rid(),
            client_id: item.client_id,
            event_type: "invoice_sent",
            title: `Invoice ${item.invoice_number} sent`,
            details: `Total: ${item.total}`,
            occurred_at: stamp,
            created_at: stamp,
            owner_id: DEV_USER.id,
          });
        }
      }

      if (collection === "timeline_events") {
        item.occurred_at = item.occurred_at || stamp;
      }

      db[collection].push(item);
      writeDb(db);
      return response(item, 201);
    }

    if (method === "patch" && parts[1]) {
      const item = db[collection].find((x) => x.id === parts[1]);
      if (!item) return reject("Item not found", 404);
      Object.assign(item, payload || {}, { updated_at: stamp });
      if (collection === "invoices") computeInvoiceFields(item);
      writeDb(db);
      return response(item);
    }

    if (method === "delete" && parts[1]) {
      const before = db[collection].length;
      db[collection] = db[collection].filter((x) => x.id !== parts[1]);
      if (db[collection].length === before) return reject("Item not found", 404);

      if (collection === "projects") {
        db.tasks = db.tasks.map((t) => (t.project_id === parts[1] ? { ...t, project_id: null } : t));
        db.file_links = db.file_links.map((f) => (f.project_id === parts[1] ? { ...f, project_id: null } : f));
        db.revisions = db.revisions.map((r) => (r.project_id === parts[1] ? { ...r, project_id: null } : r));
      }

      if (collection === "invoices") {
        db.payments = db.payments.filter((p) => p.invoice_id !== parts[1]);
      }

      writeDb(db);
      return response({ ok: true });
    }
  }

  return reject(`Unsupported local endpoint: ${method.toUpperCase()} ${path}`, 404);
}

const api = axios.create({
  baseURL: API,
  withCredentials: true,
});

// Skip these endpoints in the 401 redirect logic — they are part of the auth probe.
const AUTH_PROBE_PATHS = ["/auth/me", "/auth/login", "/auth/register", "/auth/logout"];

// Global 401 handler — on any auth failure outside the probe, send the user
// to /login. Components can still .catch() their own errors locally.
api.interceptors.response.use(
  (resp) => resp,
  (err) => {
    const status = err?.response?.status;
    const url = err?.config?.url || "";
    const isAuthProbe = AUTH_PROBE_PATHS.some((p) => url.includes(p));
    if (status === 401 && !isAuthProbe && typeof window !== "undefined") {
      const path = window.location.pathname;
      if (path !== "/login" && path !== "/register") {
        // Use replace so the user can't back-button into the broken state
        window.location.replace("/login");
      }
    }
    return Promise.reject(err);
  }
);

const localApi = {
  get(url, config) {
    return localRequest("get", url, null, config);
  },
  post(url, data, config) {
    return localRequest("post", url, data, config);
  },
  patch(url, data, config) {
    return localRequest("patch", url, data, config);
  },
  delete(url, config) {
    return localRequest("delete", url, null, config);
  },
  put(url, data, config) {
    return localRequest("put", url, data, config);
  },
};

export function formatApiError(detail) {
  if (detail == null) return "Something went wrong. Please try again.";
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail))
    return detail
      .map((e) => (e && typeof e.msg === "string" ? e.msg : JSON.stringify(e)))
      .filter(Boolean)
      .join(" ");
  if (detail && typeof detail.msg === "string") return detail.msg;
  return String(detail);
}

export default AUTH_BYPASS ? localApi : api;
