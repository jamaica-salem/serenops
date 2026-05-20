export const CONTRACT_STATUS_OPTIONS = ["draft", "sent", "signed", "expired", "cancelled"];

export function contractStatusLabel(status) {
  return String(status || "draft").replace(/_/g, " ");
}

export function contractStatusBadgeClass(status) {
  const value = String(status || "draft");
  if (value === "signed") return "bg-[#6FCF97]/20 text-[#1f6a42] border-[#6FCF97]/30";
  if (value === "sent") return "bg-[#5FA38D]/16 text-[#2f6f5a] border-[#5FA38D]/30";
  if (value === "expired") return "bg-[#D4A373]/18 text-[#8A5A2B] border-[#D4A373]/35";
  if (value === "cancelled") return "bg-[#E5ECE8] text-[#667C74] border-[#D7E0DB]";
  return "bg-[#E8F3EE] text-[#2F6F5A] border-[#D3E7DE]";
}