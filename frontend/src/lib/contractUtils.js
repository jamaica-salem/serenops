export const CONTRACT_STATUS_OPTIONS = ["draft", "sent", "signed", "expired", "cancelled"];

export function contractStatusLabel(status) {
  return String(status || "draft").replace(/_/g, " ");
}

export function contractStatusBadgeClass(status) {
  const value = String(status || "draft");
  if (value === "signed") return "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30";
  if (value === "sent") return "bg-primary/16 text-primary border-primary/30";
  if (value === "expired") return "bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30";
  if (value === "cancelled") return "bg-muted text-muted-foreground border-border";
  return "bg-muted/60 text-primary border-border";
}