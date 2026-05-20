export const PAYMENT_STATUS_OPTIONS = ["recorded", "pending", "failed", "refunded"];

export function paymentStatusLabel(status) {
  return String(status || "recorded").replace(/_/g, " ");
}

export function paymentStatusBadgeClass(status) {
  const value = String(status || "recorded");
  if (value === "pending") return "bg-[#D4A373]/18 text-[#8A5A2B] border-[#D4A373]/35";
  if (value === "failed") return "bg-[#D97C7C]/15 text-[#9a3838] border-[#D97C7C]/30";
  if (value === "refunded") return "bg-[#E5ECE8] text-[#667C74] border-[#D7E0DB]";
  return "bg-[#E8F3EE] text-[#2f6f5a] border-[#D3E7DE]";
}