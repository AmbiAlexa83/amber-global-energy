export const emailDirectionOptions = [
  { value: "outbound", label: "Outbound" },
  { value: "inbound", label: "Inbound" },
];

export const emailDirectionStyles: Record<string, string> = {
  outbound: "border-sky-400/35 bg-sky-400/12 text-sky-200",
  inbound: "border-[#C8A24D]/35 bg-[#C8A24D]/12 text-[#F0D38A]",
};

export const normalizeEmailDirection = (value?: string | null) => {
  const normalized = (value ?? "outbound").trim().toLowerCase();
  return normalized === "inbound" ? "inbound" : "outbound";
};

export const formatEmailDirectionLabel = (value?: string | null) => {
  const normalized = normalizeEmailDirection(value);
  return normalized === "inbound" ? "Inbound" : "Outbound";
};
