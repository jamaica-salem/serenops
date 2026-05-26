export const PAYMENT_STATUS_OPTIONS = ["recorded", "pending", "failed", "refunded"];

export function paymentStatusLabel(status) {
  return String(status || "recorded").replace(/_/g, " ");
}

export function paymentStatusBadgeClass(status) {
  const value = String(status || "recorded");
  if (value === "pending") return "bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30";
  if (value === "failed") return "bg-destructive/15 text-destructive border-destructive/30";
  if (value === "refunded") return "bg-muted text-muted-foreground border-border";
  return "bg-muted/60 text-primary border-border";
}