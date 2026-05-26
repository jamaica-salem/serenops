import { FileSignature, ShieldCheck, Sparkles } from "lucide-react";
import { contractStatusBadgeClass, contractStatusLabel } from "../../lib/contractUtils";

export default function ContractPreview({ contract, client }) {
  const deliverables = contract?.deliverables || [];

  return (
    <section className="bg-card rounded-2xl border border-border shadow-[0_8px_24px_rgba(29,42,37,0.04)] overflow-hidden">
      <div className="bg-gradient-to-r from-primary to-primary/80 px-5 py-4 text-white">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.22em] text-primary-foreground/70">Contract preview</p>
            <h3 className="mt-1 text-xl font-display font-semibold text-foreground">{contract?.title || "Contract"}</h3>
            <p className="text-sm text-primary-foreground/80 mt-1">Prepared for {client?.name || "client"}.</p>
          </div>
          <span className={`inline-flex items-center px-2.5 py-1 rounded-full border text-xs font-medium ${contractStatusBadgeClass(contract?.status)}`}>
            {contractStatusLabel(contract?.status)}
          </span>
        </div>
      </div>

      <div className="p-5 space-y-5">
        <Section title="Service provider details" icon={Sparkles}>
          <p className="text-sm text-muted-foreground whitespace-pre-wrap">{contract?.service_provider_details || "Add service provider details."}</p>
        </Section>

        <Section title="Scope of work" icon={FileSignature}>
          <p className="text-sm text-muted-foreground whitespace-pre-wrap">{contract?.scope_of_work || "Define the contract scope."}</p>
          {deliverables.length > 0 && (
            <div className="mt-3">
              <div className="text-xs uppercase tracking-wide text-muted-foreground">Deliverables</div>
              <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
                {deliverables.map((item, idx) => (
                  <li key={`${item}-${idx}`} className="flex items-start gap-2">
                    <span className="mt-1 h-1.5 w-1.5 rounded-full bg-primary" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </Section>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <InfoCard label="Timeline" value={contract?.timeline || "Add timeline"} />
          <InfoCard label="Payment terms" value={contract?.payment_terms || "Add payment terms"} />
          <InfoCard label="Revision policy" value={contract?.revision_policy || "Add revision policy"} />
          <InfoCard label="Cancellation policy" value={contract?.cancellation_policy || "Add cancellation policy"} />
          <InfoCard label="Ownership rights" value={contract?.ownership_rights || "Add ownership rights"} />
          <InfoCard label="Confidentiality clause" value={contract?.confidentiality_clause || "Add confidentiality clause"} />
        </div>

        <Section title="Signature section" icon={ShieldCheck}>
          <p className="text-sm text-muted-foreground whitespace-pre-wrap">{contract?.signature_section || "Add signature instructions."}</p>
        </Section>

        <div className="rounded-xl border border-border bg-muted/40 p-4 text-sm text-muted-foreground">
          <p className="font-medium text-foreground">Notes</p>
          <p className="mt-2 whitespace-pre-wrap">{contract?.notes || "No notes added."}</p>
        </div>

        <div className="rounded-xl border border-border bg-amber-500/10 dark:bg-amber-950/20 p-4 text-sm text-amber-700 dark:text-amber-400">
          <p className="font-medium text-amber-700 dark:text-amber-400">Disclaimer</p>
          <p className="mt-2">This template is customizable and not legal advice.</p>
        </div>
      </div>
    </section>
  );
}

function Section({ title, icon: Icon, children }) {
  return (
    <div className="rounded-xl border border-border p-4">
      <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-muted-foreground">
        <Icon className="w-3.5 h-3.5" />
        {title}
      </div>
      <div className="mt-3">{children}</div>
    </div>
  );
}

function InfoCard({ label, value }) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="text-xs uppercase tracking-wide text-muted-foreground">{label}</div>
      <p className="mt-2 text-sm text-muted-foreground whitespace-pre-wrap">{value}</p>
    </div>
  );
}
