"""Pydantic models for the SerenOps project management app."""
from datetime import datetime, timezone
from typing import List, Optional, Literal
from pydantic import BaseModel, EmailStr, Field
import uuid


# ---------- helpers ----------
def _uuid() -> str:
    return str(uuid.uuid4())


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


# ---------- Auth ----------
class RegisterIn(BaseModel):
    email: EmailStr
    password: str = Field(min_length=6)
    name: str = Field(min_length=1)


class LoginIn(BaseModel):
    email: EmailStr
    password: str


class UserOut(BaseModel):
    id: str
    email: EmailStr
    name: str
    role: str = "user"
    avatar_url: Optional[str] = None


# ---------- Project ----------
ProjectStatus = Literal["planned", "in_progress", "on_hold", "completed", "cancelled"]
ProjectPriority = Literal["low", "medium", "high", "urgent"]


class ProjectIn(BaseModel):
    name: str
    description: Optional[str] = ""
    color: Optional[str] = "#EA580C"
    client_id: Optional[str] = None
    status: ProjectStatus = "planned"
    start_date: Optional[str] = None
    due_date: Optional[str] = None
    priority: ProjectPriority = "medium"
    services_included: List[str] = Field(default_factory=list)
    deliverables: List[str] = Field(default_factory=list)
    related_invoice_id: Optional[str] = None
    related_contract_id: Optional[str] = None


class ProjectOut(BaseModel):
    id: str
    name: str
    description: str = ""
    color: str = "#EA580C"
    client_id: Optional[str] = None
    status: ProjectStatus = "planned"
    start_date: Optional[str] = None
    due_date: Optional[str] = None
    priority: ProjectPriority = "medium"
    services_included: List[str] = Field(default_factory=list)
    deliverables: List[str] = Field(default_factory=list)
    related_invoice_id: Optional[str] = None
    related_contract_id: Optional[str] = None
    created_at: str
    owner_id: str


class ProjectUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    color: Optional[str] = None
    client_id: Optional[str] = None
    status: Optional[ProjectStatus] = None
    start_date: Optional[str] = None
    due_date: Optional[str] = None
    priority: Optional[ProjectPriority] = None
    services_included: Optional[List[str]] = None
    deliverables: Optional[List[str]] = None
    related_invoice_id: Optional[str] = None
    related_contract_id: Optional[str] = None


# ---------- Task ----------
TaskStatus = Literal["todo", "in_progress", "waiting_for_client", "for_review", "done", "backlog"]
TaskPriority = Literal["low", "medium", "high", "urgent"]


class TaskIn(BaseModel):
    title: str
    description: Optional[str] = ""
    status: TaskStatus = "todo"
    priority: TaskPriority = "medium"
    due_date: Optional[str] = None  # ISO date string
    project_id: Optional[str] = None
    client_id: Optional[str] = None
    assignee_id: Optional[str] = None


class TaskUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    status: Optional[TaskStatus] = None
    priority: Optional[TaskPriority] = None
    due_date: Optional[str] = None
    project_id: Optional[str] = None
    client_id: Optional[str] = None
    assignee_id: Optional[str] = None


class TaskOut(BaseModel):
    id: str
    title: str
    description: str = ""
    status: TaskStatus = "todo"
    priority: TaskPriority = "medium"
    due_date: Optional[str] = None
    project_id: Optional[str] = None
    client_id: Optional[str] = None
    assignee_id: Optional[str] = None
    creator_id: str
    created_at: str
    updated_at: str


# ---------- Clients ----------
ClientStatus = Literal[
    "lead",
    "onboarding",
    "active",
    "waiting_for_client",
    "completed",
    "maintenance",
    "archived",
]
ClientSource = Literal["referral", "facebook", "linkedin", "website", "upwork", "manual", "other"]


class ClientIn(BaseModel):
    name: str = Field(min_length=1)
    company_name: Optional[str] = ""
    email: Optional[EmailStr] = None
    phone: Optional[str] = ""
    website: Optional[str] = ""
    social_links: List[str] = Field(default_factory=list)
    client_type: str = "freelancer_client"
    status: ClientStatus = "lead"
    source: ClientSource = "manual"
    notes: Optional[str] = ""
    last_contacted_at: Optional[str] = None


class ClientUpdate(BaseModel):
    name: Optional[str] = None
    company_name: Optional[str] = None
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    website: Optional[str] = None
    social_links: Optional[List[str]] = None
    client_type: Optional[str] = None
    status: Optional[ClientStatus] = None
    source: Optional[ClientSource] = None
    notes: Optional[str] = None
    last_contacted_at: Optional[str] = None


class ClientOut(BaseModel):
    id: str
    name: str
    company_name: str = ""
    email: Optional[EmailStr] = None
    phone: str = ""
    website: str = ""
    social_links: List[str] = Field(default_factory=list)
    client_type: str = "freelancer_client"
    status: ClientStatus = "lead"
    source: ClientSource = "manual"
    notes: str = ""
    created_at: str
    updated_at: str
    last_contacted_at: Optional[str] = None
    owner_id: str


# ---------- Onboarding ----------
OnboardingCategory = Literal[
    "onboarding_checklist",
    "intake_questionnaire",
    "required_access",
    "brand_assets",
    "project_goals",
    "communication",
    "tools_accounts",
]


class OnboardingItemIn(BaseModel):
    title: str = Field(min_length=1)
    category: OnboardingCategory = "onboarding_checklist"
    notes: Optional[str] = ""
    completed: bool = False


class OnboardingItemUpdate(BaseModel):
    title: Optional[str] = None
    category: Optional[OnboardingCategory] = None
    notes: Optional[str] = None
    completed: Optional[bool] = None


class OnboardingItemOut(BaseModel):
    id: str
    client_id: str
    title: str
    category: OnboardingCategory
    notes: str = ""
    completed: bool = False
    created_at: str
    updated_at: str


# ---------- Invoice ----------
InvoiceStatus = Literal["draft", "sent", "paid", "partially_paid", "overdue", "cancelled"]
InvoiceCurrency = Literal["USD", "EUR", "GBP", "AUD", "CAD", "JPY", "PHP", "SGD", "NZD", "OTHER"]


class InvoiceItemIn(BaseModel):
    description: str
    quantity: float = Field(default=1, ge=0)
    rate: float = Field(default=0, ge=0)


class InvoiceIn(BaseModel):
    invoice_number: str
    client_id: str
    project_id: Optional[str] = None
    issue_date: str
    due_date: str
    currency: InvoiceCurrency = "USD"
    line_items: List[InvoiceItemIn] = Field(default_factory=list)
    discount: float = Field(default=0, ge=0)
    tax_fees: float = Field(default=0, ge=0)
    amount_paid: float = Field(default=0, ge=0)
    payment_method: Optional[str] = ""
    notes: Optional[str] = ""
    status: InvoiceStatus = "draft"


class InvoiceUpdate(BaseModel):
    invoice_number: Optional[str] = None
    project_id: Optional[str] = None
    issue_date: Optional[str] = None
    due_date: Optional[str] = None
    currency: Optional[InvoiceCurrency] = None
    line_items: Optional[List[InvoiceItemIn]] = None
    discount: Optional[float] = Field(default=None, ge=0)
    tax_fees: Optional[float] = Field(default=None, ge=0)
    amount_paid: Optional[float] = Field(default=None, ge=0)
    payment_method: Optional[str] = None
    notes: Optional[str] = None
    status: Optional[InvoiceStatus] = None


class InvoiceOut(BaseModel):
    id: str
    invoice_number: str
    client_id: str
    project_id: Optional[str] = None
    issue_date: str
    due_date: str
    currency: InvoiceCurrency = "USD"
    line_items: List[InvoiceItemIn] = Field(default_factory=list)
    subtotal: float = 0
    discount: float = 0
    tax_fees: float = 0
    total: float = 0
    amount_paid: float = 0
    balance_due: float = 0
    payment_method: str = ""
    notes: str = ""
    status: InvoiceStatus = "draft"
    created_at: str
    updated_at: str
    owner_id: str


# ---------- Payment ----------
PaymentStatus = Literal["recorded", "pending", "failed", "refunded"]


class PaymentIn(BaseModel):
    client_id: str
    invoice_id: str
    project_id: Optional[str] = None
    payment_date: str
    amount: float
    method: str
    reference_number: Optional[str] = ""
    notes: Optional[str] = ""
    status: PaymentStatus = "recorded"


class PaymentOut(BaseModel):
    id: str
    client_id: str
    invoice_id: str
    project_id: Optional[str] = None
    payment_date: str
    amount: float
    method: str
    reference_number: str = ""
    notes: str = ""
    status: PaymentStatus = "recorded"
    remaining_balance: float = 0
    created_at: str
    owner_id: str


# ---------- Contract ----------
ContractStatus = Literal["draft", "sent", "signed", "expired", "cancelled"]


class ContractIn(BaseModel):
    client_id: str
    title: str
    service_provider_details: Optional[str] = ""
    scope_of_work: Optional[str] = ""
    deliverables: List[str] = Field(default_factory=list)
    payment_terms: Optional[str] = ""
    timeline: Optional[str] = ""
    revision_policy: Optional[str] = ""
    cancellation_policy: Optional[str] = ""
    late_payment_clause: Optional[str] = ""
    ownership_rights: Optional[str] = ""
    confidentiality_clause: Optional[str] = ""
    signature_section: Optional[str] = ""
    notes: Optional[str] = ""
    status: ContractStatus = "draft"


class ContractUpdate(BaseModel):
    title: Optional[str] = None
    service_provider_details: Optional[str] = None
    scope_of_work: Optional[str] = None
    deliverables: Optional[List[str]] = None
    payment_terms: Optional[str] = None
    timeline: Optional[str] = None
    revision_policy: Optional[str] = None
    cancellation_policy: Optional[str] = None
    late_payment_clause: Optional[str] = None
    ownership_rights: Optional[str] = None
    confidentiality_clause: Optional[str] = None
    signature_section: Optional[str] = None
    notes: Optional[str] = None
    status: Optional[ContractStatus] = None


class ContractOut(BaseModel):
    id: str
    client_id: str
    title: str
    service_provider_details: str = ""
    scope_of_work: str = ""
    deliverables: List[str] = Field(default_factory=list)
    payment_terms: str = ""
    timeline: str = ""
    revision_policy: str = ""
    cancellation_policy: str = ""
    late_payment_clause: str = ""
    ownership_rights: str = ""
    confidentiality_clause: str = ""
    signature_section: str = ""
    notes: str = ""
    status: ContractStatus = "draft"
    created_at: str
    updated_at: str
    owner_id: str


# ---------- Revision ----------
RevisionStatus = Literal["requested", "in_progress", "done", "approved", "rejected"]
RevisionPriority = Literal["low", "medium", "high", "urgent"]


class RevisionIn(BaseModel):
    client_id: str
    project_id: Optional[str] = None
    requested_by: Optional[str] = ""
    request_title: str
    description: Optional[str] = ""
    affected_area: Optional[str] = ""
    priority: RevisionPriority = "medium"
    status: RevisionStatus = "requested"
    date_requested: Optional[str] = None
    date_completed: Optional[str] = None
    attachment_link: Optional[str] = ""
    revision_count: int = 1


class RevisionUpdate(BaseModel):
    project_id: Optional[str] = None
    requested_by: Optional[str] = None
    request_title: Optional[str] = None
    description: Optional[str] = None
    affected_area: Optional[str] = None
    priority: Optional[RevisionPriority] = None
    status: Optional[RevisionStatus] = None
    date_requested: Optional[str] = None
    date_completed: Optional[str] = None
    attachment_link: Optional[str] = None
    revision_count: Optional[int] = None


class RevisionOut(BaseModel):
    id: str
    client_id: str
    project_id: Optional[str] = None
    requested_by: str = ""
    request_title: str
    description: str = ""
    affected_area: str = ""
    priority: RevisionPriority = "medium"
    status: RevisionStatus = "requested"
    date_requested: Optional[str] = None
    date_completed: Optional[str] = None
    attachment_link: str = ""
    revision_count: int = 1
    created_at: str
    updated_at: str
    owner_id: str


# ---------- Handover ----------
class HandoverItemIn(BaseModel):
    title: str = Field(min_length=1)
    notes: Optional[str] = ""
    completed: bool = False


class HandoverItemUpdate(BaseModel):
    title: Optional[str] = None
    notes: Optional[str] = None
    completed: Optional[bool] = None


class HandoverItemOut(BaseModel):
    id: str
    client_id: str
    title: str
    notes: str = ""
    completed: bool = False
    created_at: str
    updated_at: str


# ---------- Maintenance ----------
MaintenanceStatus = Literal["active", "paused", "cancelled"]


class MaintenancePlanIn(BaseModel):
    client_id: str
    project_id: Optional[str] = None
    plan_name: str = Field(min_length=1)
    monthly_fee: float = 0
    included_services: List[str] = Field(default_factory=list)
    start_date: Optional[str] = None
    renewal_date: Optional[str] = None
    recurring_tasks: List[str] = Field(default_factory=list)
    support_requests: Optional[str] = ""
    status: MaintenanceStatus = "active"
    notes: Optional[str] = ""


class MaintenancePlanUpdate(BaseModel):
    project_id: Optional[str] = None
    plan_name: Optional[str] = None
    monthly_fee: Optional[float] = None
    included_services: Optional[List[str]] = None
    start_date: Optional[str] = None
    renewal_date: Optional[str] = None
    recurring_tasks: Optional[List[str]] = None
    support_requests: Optional[str] = None
    status: Optional[MaintenanceStatus] = None
    notes: Optional[str] = None


class MaintenancePlanOut(BaseModel):
    id: str
    client_id: str
    project_id: Optional[str] = None
    plan_name: str
    monthly_fee: float = 0
    included_services: List[str] = Field(default_factory=list)
    start_date: Optional[str] = None
    renewal_date: Optional[str] = None
    recurring_tasks: List[str] = Field(default_factory=list)
    support_requests: str = ""
    status: MaintenanceStatus = "active"
    notes: str = ""
    created_at: str
    updated_at: str
    owner_id: str


# ---------- Timeline ----------
TimelineType = Literal[
    "client_created",
    "onboarding_completed",
    "proposal_sent",
    "contract_signed",
    "invoice_sent",
    "payment_received",
    "project_started",
    "revision_requested",
    "revision_completed",
    "project_handover",
    "maintenance_started",
    "manual",
]


class TimelineEventIn(BaseModel):
    client_id: str
    event_type: TimelineType = "manual"
    title: str
    details: Optional[str] = ""
    occurred_at: Optional[str] = None


class TimelineEventOut(BaseModel):
    id: str
    client_id: str
    event_type: TimelineType
    title: str
    details: str = ""
    occurred_at: str
    created_at: str
    owner_id: str


# ---------- Proposal ----------
ProposalStatus = Literal["draft", "sent", "approved", "rejected"]


class ProposalIn(BaseModel):
    client_id: str
    project_title: str
    scope_of_work: Optional[str] = ""
    deliverables: List[str] = Field(default_factory=list)
    timeline: Optional[str] = ""
    pricing: Optional[str] = ""
    payment_terms: Optional[str] = ""
    revision_limits: Optional[str] = ""
    optional_add_ons: Optional[str] = ""
    terms_conditions: Optional[str] = ""
    notes: Optional[str] = ""
    status: ProposalStatus = "draft"


class ProposalUpdate(BaseModel):
    project_title: Optional[str] = None
    scope_of_work: Optional[str] = None
    deliverables: Optional[List[str]] = None
    timeline: Optional[str] = None
    pricing: Optional[str] = None
    payment_terms: Optional[str] = None
    revision_limits: Optional[str] = None
    optional_add_ons: Optional[str] = None
    terms_conditions: Optional[str] = None
    notes: Optional[str] = None
    status: Optional[ProposalStatus] = None


class ProposalOut(BaseModel):
    id: str
    client_id: str
    project_title: str
    scope_of_work: str = ""
    deliverables: List[str] = Field(default_factory=list)
    timeline: str = ""
    pricing: str = ""
    payment_terms: str = ""
    revision_limits: str = ""
    optional_add_ons: str = ""
    terms_conditions: str = ""
    notes: str = ""
    status: ProposalStatus = "draft"
    created_at: str
    updated_at: str
    owner_id: str


# ---------- File Link ----------
FileLinkType = Literal[
    "google_drive",
    "figma",
    "github_repo",
    "website",
    "staging",
    "production",
    "admin_login_url",
    "tutorial_video",
    "other",
]


class FileLinkIn(BaseModel):
    client_id: str
    project_id: Optional[str] = None
    label: str
    link_type: FileLinkType = "other"
    url: str
    notes: Optional[str] = ""


class FileLinkUpdate(BaseModel):
    project_id: Optional[str] = None
    label: Optional[str] = None
    link_type: Optional[FileLinkType] = None
    url: Optional[str] = None
    notes: Optional[str] = None


class FileLinkOut(BaseModel):
    id: str
    client_id: str
    project_id: Optional[str] = None
    label: str
    link_type: FileLinkType = "other"
    url: str
    notes: str = ""
    created_at: str
    updated_at: str
    owner_id: str


# ---------- Templates ----------
TemplateType = Literal[
    "onboarding_checklist",
    "website_project_checklist",
    "va_client_checklist",
    "proposal_template",
    "contract_template",
    "invoice_template",
    "handover_checklist",
    "maintenance_checklist",
    "other",
]


class TemplateIn(BaseModel):
    name: str = Field(min_length=1)
    template_type: TemplateType = "other"
    content: str = ""
    is_default: bool = False


class TemplateUpdate(BaseModel):
    name: Optional[str] = None
    template_type: Optional[TemplateType] = None
    content: Optional[str] = None
    is_default: Optional[bool] = None


class TemplateOut(BaseModel):
    id: str
    name: str
    template_type: TemplateType = "other"
    content: str = ""
    is_default: bool = False
    created_at: str
    updated_at: str
    owner_id: str


# ---------- Notification ----------
class NotificationOut(BaseModel):
    id: str
    user_id: str
    type: str  # "overdue", "due_soon", "assigned", "ai_alert"
    title: str
    message: str
    task_id: Optional[str] = None
    read: bool = False
    created_at: str


# ---------- LLM Config ----------
LLMProvider = Literal["openai", "anthropic", "gemini", "custom"]


class LLMConfigIn(BaseModel):
    provider: LLMProvider = "openai"
    model: str = "gpt-5.1"
    api_key: Optional[str] = None
    base_url: Optional[str] = None  # for custom providers


class LLMConfigOut(BaseModel):
    provider: LLMProvider
    model: str
    has_custom_key: bool = False
    base_url: Optional[str] = None


# ---------- Chat ----------
class ChatIn(BaseModel):
    message: str
    session_id: Optional[str] = None


class ChatOut(BaseModel):
    reply: str
    session_id: str
    source: str  # "rule_based" or "llm"


# ---------- Meeting ----------
class MeetingOut(BaseModel):
    id: str
    title: str
    platform: str  # "Zoom", "Meet"
    starts_at: str
    project_id: Optional[str] = None


# ---------- Dashboard summary ----------
class DashboardSummary(BaseModel):
    total_tasks: int
    overdue: int
    in_progress: int
    completed: int
    backlog: int
    not_started: int
    total_clients: int = 0
    active_clients: int = 0
    leads: int = 0
    pending_proposals: int = 0
    pending_invoices: int = 0
    pending_contracts: int = 0
    projects_in_progress: int = 0
    revisions_pending: int = 0
    payments_due: int = 0
    upcoming_deadlines: int = 0
    clients_needing_follow_up: int = 0
    ai_insights: List[str]
