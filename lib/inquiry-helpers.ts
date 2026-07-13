export type HistoryRecord = {
  id: string;
  inquiry_id: string;
  field_changed: string;
  old_value: string | null;
  new_value: string | null;
  changed_at: string;
  changed_by: string;
};

export type InquiryRecord = {
  id?: string | number | null;
  name?: string | null;
  email?: string | null;
  company_name?: string | null;
  company_registration_number?: string | null;
  company_website?: string | null;
  address?: string | null;
  country?: string | null;
  contact_name?: string | null;
  position?: string | null;
  phone?: string | null;
  whatsapp?: string | null;
  inquiry_type?: string | null;
  product?: string | null;
  grade?: string | null;
  quantity?: string | null;
  unit?: string | null;
  loading_port?: string | null;
  destination_port?: string | null;
  origin_country?: string | null;
  destination_country?: string | null;
  delivery_window?: string | null;
  payment_method?: string | null;
  incoterms?: string | null;
  target_price?: string | null;
  commission?: string | null;
  financing_needed?: string | null;
  documents_available?: string | null;
  special_instructions?: string | null;
  status?: string | null;
  priority?: string | null;
  assigned_broker?: string | null;
  broker_notes?: string | null;
  notes?: string | null;
  last_contacted_at?: string | null;
  reviewed_at?: string | null;
  qualified_at?: string | null;
  matched_at?: string | null;
  closed_at?: string | null;
  updated_at?: string | null;
  created_at?: string | null;
  message?: string | null;
};

export type InquiryDraft = {
  status: string;
  priority: string;
  assigned_broker: string;
  broker_notes: string;
  notes: string;
  last_contacted_at: string;
};

export const statusStyles: Record<string, string> = {
  new: "border-[#C8A24D]/35 bg-[#C8A24D]/12 text-[#F0D38A]",
  "under review": "border-sky-400/35 bg-sky-400/12 text-sky-200",
  contacted: "border-violet-400/35 bg-violet-400/12 text-violet-200",
  negotiating: "border-cyan-400/35 bg-cyan-400/12 text-cyan-200",
  matched: "border-emerald-400/35 bg-emerald-400/12 text-emerald-200",
  "documents requested": "border-amber-400/35 bg-amber-400/12 text-amber-200",
  "compliance review": "border-purple-400/35 bg-purple-400/12 text-purple-200",
  "closed won": "border-emerald-500/35 bg-emerald-500/12 text-emerald-100",
  "closed lost": "border-slate-400/35 bg-slate-400/12 text-slate-200",
};

export type BadgeStatus = "Verified" | "Pending" | "Missing" | "Needs Review";

export const badgeStatusStyles: Record<BadgeStatus, string> = {
  Verified: "border-emerald-400/35 bg-emerald-400/12 text-emerald-200",
  Pending: "border-[#C8A24D]/35 bg-[#C8A24D]/12 text-[#F0D38A]",
  Missing: "border-rose-400/35 bg-rose-400/12 text-rose-200",
  "Needs Review": "border-sky-400/35 bg-sky-400/12 text-sky-200",
};

export const statusOptions = [
  { value: "new", label: "New" },
  { value: "under review", label: "Under Review" },
  { value: "contacted", label: "Contacted" },
  { value: "negotiating", label: "Negotiating" },
  { value: "matched", label: "Matched" },
  { value: "documents requested", label: "Documents Requested" },
  { value: "compliance review", label: "Compliance Review" },
  { value: "closed won", label: "Closed Won" },
  { value: "closed lost", label: "Closed Lost" },
];

export const priorityOptions = [
  { value: "low", label: "Low" },
  { value: "normal", label: "Normal" },
  { value: "high", label: "High" },
  { value: "urgent", label: "Urgent" },
];

export const CLOSED_STATUSES = new Set(["closed won", "closed lost"]);

export const formatValue = (value: string | null | undefined) => (value?.trim() ? value : "—");
export const formatDate = (value: string | null | undefined) => {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("en", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
};

export const normalizeStatusValue = (value?: string | null) => {
  const normalized = (value ?? "new").trim().toLowerCase();
  if (normalized === "reviewing") return "under review";
  if (normalized === "qualified") return "contacted";
  if (
    normalized === "waiting_on_documents" ||
    normalized === "waiting on documents" ||
    normalized === "awaiting_documents" ||
    normalized === "awaiting documents"
  ) return "documents requested";
  if (normalized === "closed") return "closed won";
  return normalized || "new";
};

export const normalizePriorityValue = (value?: string | null) => {
  const normalized = (value ?? "normal").trim().toLowerCase();
  if (normalized === "high" || normalized === "normal" || normalized === "low" || normalized === "urgent") return normalized;
  if (normalized === "medium") return "normal";
  return "normal";
};

export const formatStatusLabel = (value?: string | null) => {
  const normalized = normalizeStatusValue(value);
  return statusOptions.find((option) => option.value === normalized)?.label ?? "New";
};

export const isHighPriority = (item: InquiryRecord) => {
  const priority = normalizePriorityValue(item.priority);
  if (priority === "high" || priority === "urgent") return true;
  const status = normalizeStatusValue(item.status);
  const text = `${item.message ?? ""} ${item.special_instructions ?? ""}`.toLowerCase();
  return status === "under review" || status === "contacted" || status === "matched" || text.includes("urgent") || text.includes("priority");
};

export const getRelativeTime = (value?: string | null) => {
  if (!value) return "Unknown";
  const diff = Date.now() - new Date(value).getTime();
  const seconds = Math.round(diff / 1000);
  const minutes = Math.round(diff / 60000);
  const hours = Math.round(diff / 3600000);
  const days = Math.round(diff / 86400000);
  if (seconds < 60) return `${seconds}s ago`;
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  return `${days}d ago`;
};

export const getPriorityIndicator = (priority: string) => {
  const normalized = normalizePriorityValue(priority);
  if (normalized === "urgent") return "bg-red-500 text-red-100";
  if (normalized === "high") return "bg-rose-400 text-rose-100";
  if (normalized === "normal") return "bg-orange-400 text-orange-100";
  return "bg-emerald-400 text-emerald-900";
};

export const parseDocumentAction = (inquiry: InquiryRecord) => {
  const docs = (inquiry.documents_available ?? "").toLowerCase();
  if (!docs) return "Awaiting documents";
  if (!docs.includes("passport")) return "Passport Needed";
  if (!docs.includes("loi")) return "LOI Needed";
  if (!docs.includes("icpo")) return "ICPO Needed";
  return "Ready for Matching";
};

export const formatCurrencyValue = (value: string | number | null | undefined) => {
  if (value === null || value === undefined || value === "") return "—";
  const numeric = typeof value === "number" ? value : Number(String(value).replace(/[^0-9.-]+/g, ""));
  if (Number.isNaN(numeric)) return "—";
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(numeric);
};

export const parseCurrencyValue = (value: string | number | null | undefined) => {
  if (value === null || value === undefined || value === "") return 0;
  const numeric = typeof value === "number" ? value : Number(String(value).replace(/[^0-9.-]+/g, ""));
  return Number.isNaN(numeric) ? 0 : numeric;
};

export const getMissingDocumentCount = (inquiry: InquiryRecord) => {
  const docs = (inquiry.documents_available ?? "").toLowerCase();
  if (!docs) return 3;
  return ["passport", "loi", "icpo", "company registration"].filter((doc) => !docs.includes(doc)).length;
};

export const getReadinessScore = (inquiry: InquiryRecord) => {
  let score = 0;
  if (inquiry.contact_name) score += 14;
  if (inquiry.email) score += 14;
  if (inquiry.phone || inquiry.whatsapp) score += 8;
  if (inquiry.company_name) score += 12;
  if (inquiry.company_registration_number || inquiry.company_website) score += 8;
  const docs = (inquiry.documents_available ?? "").toLowerCase();
  const documentMatches = ["loi", "icpo", "passport", "company registration"].filter((doc) => docs.includes(doc));
  score += Math.min(documentMatches.length, 4) * 10;
  if (inquiry.product) score += 10;
  if (inquiry.quantity && inquiry.unit) score += 8;
  if (inquiry.payment_method || inquiry.incoterms || inquiry.target_price) score += 8;
  const status = normalizeStatusValue(inquiry.status);
  if (status === "contacted" || status === "matched") score += 12;
  else if (status === "under review") score += 8;
  else if (status === "documents requested") score += 4;
  if (inquiry.assigned_broker || inquiry.broker_notes) score += 8;
  return Math.min(100, Math.max(0, score));
};

export const getReadinessBand = (score: number) => {
  if (score >= 90) return { label: "Executive Ready", tone: "text-emerald-200" };
  if (score >= 70) return { label: "Nearly Ready", tone: "text-sky-200" };
  if (score >= 50) return { label: "Needs Attention", tone: "text-amber-200" };
  return { label: "High Risk", tone: "text-rose-200" };
};

export const getInferenceRecommendations = (inquiries: InquiryRecord[]) => {
  const recommendations: Array<{ id: string; icon: string; title: string; detail: string; priority: string }> = [];
  const openHighValue = inquiries.some((item) => {
    const p = normalizePriorityValue(item.priority);
    return (p === "high" || p === "urgent") && !CLOSED_STATUSES.has(normalizeStatusValue(item.status));
  });
  const unassigned = inquiries.some((item) => !item.assigned_broker && !CLOSED_STATUSES.has(normalizeStatusValue(item.status)));
  const missingPassport = inquiries.some((item) => !(item.documents_available ?? "").toLowerCase().includes("passport") && !CLOSED_STATUSES.has(normalizeStatusValue(item.status)));
  const missingLOI = inquiries.some((item) => !(item.documents_available ?? "").toLowerCase().includes("loi") && !CLOSED_STATUSES.has(normalizeStatusValue(item.status)));
  const readyForIntroduction = inquiries.some((item) => getReadinessScore(item) >= 90 && !CLOSED_STATUSES.has(normalizeStatusValue(item.status)));
  const documentsComplete = inquiries.some((item) => (item.documents_available ?? "").toLowerCase().includes("loi") && (item.documents_available ?? "").toLowerCase().includes("icpo") && !CLOSED_STATUSES.has(normalizeStatusValue(item.status)));

  if (openHighValue) recommendations.push({ id: "high-value", icon: "⚡", title: "High value opportunity requires follow-up", detail: "A premium inquiry is awaiting broker engagement and should be moved to the top of the desk queue.", priority: "High" });
  if (missingPassport) recommendations.push({ id: "passport", icon: "🗂", title: "Missing passport", detail: "One or more active deals still require passport documentation before outreach can proceed.", priority: "Medium" });
  if (missingLOI) recommendations.push({ id: "loi", icon: "📄", title: "Missing LOI", detail: "Request the LOI to keep the deal moving toward qualification and buyer introduction.", priority: "High" });
  if (readyForIntroduction) recommendations.push({ id: "intro", icon: "↗", title: "Ready for buyer introduction", detail: "A deal has reached the readiness threshold for a broker-led introduction.", priority: "High" });
  if (documentsComplete) recommendations.push({ id: "documents", icon: "✓", title: "Documents complete", detail: "Required documentation is now in place for at least one opportunity.", priority: "Medium" });
  if (unassigned) recommendations.push({ id: "assign", icon: "🤝", title: "Broker assignment needed", detail: "Several inquiries still need a named broker to accelerate workflow movement.", priority: "Medium" });
  if (recommendations.length === 0) recommendations.push({ id: "ready", icon: "✓", title: "All active deals are progressing", detail: "No immediate broker intervention is required at the moment.", priority: "Low" });

  return recommendations.slice(0, 4);
};

export const getDocumentEntries = (documentsValue?: string | null) => {
  const rawDocuments = (documentsValue ?? "")
    .split(/[\n,;]+/)
    .map((item) => item.trim())
    .filter(Boolean);

  const knownDocs = [
    { key: "loi", label: "LOI" },
    { key: "icpo", label: "ICPO" },
    { key: "bcl", label: "BCL" },
    { key: "passport", label: "Passport" },
    { key: "company registration", label: "Company Registration" },
  ];

  const normalized = rawDocuments.map((item) => item.toLowerCase());
  const text = (documentsValue ?? "").toLowerCase();
  const defaultStatus = text.includes("pending") || text.includes("review") ? "Pending Review" : text.includes("verified") ? "Verified" : "Uploaded";

  const entries = knownDocs.map((doc) => {
    const hasMatch = normalized.some((item) => item.includes(doc.key));
    return { label: doc.label, status: hasMatch ? defaultStatus : "Missing" };
  });

  const extras = rawDocuments.filter((item) => !knownDocs.some((doc) => item.toLowerCase().includes(doc.key)));
  if (extras.length) {
    extras.forEach((item) => { entries.push({ label: item, status: defaultStatus }); });
  }

  return entries;
};

export const getTrustRiskTone = (risk: string) => {
  if (risk === "Low Risk") return "border-emerald-400/35 bg-emerald-400/12 text-emerald-200";
  if (risk === "Medium Risk") return "border-[#C8A24D]/35 bg-[#C8A24D]/12 text-[#F0D38A]";
  return "border-rose-400/35 bg-rose-400/12 text-rose-200";
};

export const getDealVelocity = (inquiry: InquiryRecord) => {
  const created = inquiry.created_at ? new Date(inquiry.created_at).getTime() : 0;
  const updated = inquiry.updated_at ? new Date(inquiry.updated_at).getTime() : created;
  const ageHours = created ? Math.max(0, (Date.now() - created) / 3600000) : 0;
  const hoursSinceUpdate = updated ? Math.max(0, (Date.now() - updated) / 3600000) : 0;
  const status = normalizeStatusValue(inquiry.status);

  if (CLOSED_STATUSES.has(status) || status === "matched") return { label: "Deal Closed", tone: "text-slate-300", score: 100 };
  if (ageHours < 12 && hoursSinceUpdate < 12) return { label: "Active", tone: "text-emerald-200", score: 95 };
  if (hoursSinceUpdate < 24 && (status === "under review" || status === "contacted")) return { label: "Moving Fast", tone: "text-emerald-200", score: 80 };
  if (hoursSinceUpdate < 48) return { label: "In Progress", tone: "text-sky-200", score: 60 };
  if (hoursSinceUpdate < 96) return { label: "Slowing", tone: "text-[#F0D38A]", score: 40 };
  return { label: "Stalled", tone: "text-rose-200", score: 15 };
};

export const getGeographicRisk = (country: string | null | undefined) => {
  const highRisk = ["iran", "north korea", "syria", "russia", "belarus", "myanmar", "cuba", "venezuela"];
  const mediumRisk = ["nigeria", "iraq", "libya", "angola", "south sudan", "yemen", "sudan", "somalia"];
  const normalized = (country ?? "").toLowerCase();
  if (highRisk.some((c) => normalized.includes(c))) return { label: "Elevated", tone: "border-rose-400/35 bg-rose-400/12 text-rose-200" };
  if (mediumRisk.some((c) => normalized.includes(c))) return { label: "Monitor", tone: "border-[#C8A24D]/35 bg-[#C8A24D]/12 text-[#F0D38A]" };
  return { label: "Standard", tone: "border-emerald-400/35 bg-emerald-400/12 text-emerald-200" };
};

export const getProductRisk = (product: string | null | undefined) => {
  const crude = ["crude", "sweet crude", "sour crude", "bonny light", "brent", "wti", "urals"];
  const refined = ["jet", "diesel", "d6", "d2", "gasoil", "lpg", "lng", "naphtha", "mazut", "fuel oil"];
  const normalized = (product ?? "").toLowerCase();
  if (crude.some((p) => normalized.includes(p))) return { label: "Crude Oil", sector: "Upstream" };
  if (refined.some((p) => normalized.includes(p))) return { label: "Refined Product", sector: "Downstream" };
  if (normalized.includes("gas")) return { label: "Gas", sector: "Midstream" };
  if (normalized) return { label: normalized.split(" ").slice(0, 3).join(" "), sector: "Commodity" };
  return { label: "Unspecified", sector: "Unknown" };
};

export const getVerificationBadges = (inquiry: InquiryRecord): Array<{ label: string; status: BadgeStatus }> => {
  const docsText = (inquiry.documents_available ?? "").toLowerCase();
  const specialText = `${inquiry.message ?? ""} ${inquiry.special_instructions ?? ""}`.toLowerCase();
  const emailValue = inquiry.email ?? "";
  const emailDomain = emailValue.includes("@") ? (emailValue.split("@")[1] ?? "").toLowerCase() : "";
  const freeEmailDomains = ["gmail.com", "yahoo.com", "hotmail.com", "outlook.com", "aol.com", "icloud.com", "protonmail.com"];
  const isFreeDomain = freeEmailDomains.includes(emailDomain);
  const status = normalizeStatusValue(inquiry.status);

  return [
    { label: "Company Registered", status: inquiry.company_registration_number ? "Verified" : "Missing" },
    { label: "Website Verified", status: inquiry.company_website ? "Verified" : "Missing" },
    { label: "Corporate Email", status: emailValue.includes("@") ? (isFreeDomain ? "Needs Review" : "Verified") : "Missing" },
    { label: "Phone Verified", status: inquiry.phone ? "Verified" : inquiry.whatsapp ? "Pending" : "Missing" },
    { label: "Passport Uploaded", status: docsText.includes("passport") ? "Verified" : status === "documents requested" ? "Pending" : "Missing" },
    { label: "LOI Uploaded", status: docsText.includes("loi") ? "Verified" : status === "under review" ? "Pending" : "Missing" },
    { label: "ICPO Uploaded", status: docsText.includes("icpo") ? "Verified" : "Missing" },
    {
      label: "Proof of Funds",
      status: /proof of funds|pof/.test(docsText) || /proof of funds|pof/.test(specialText)
        ? "Verified"
        : /funding|financ/.test(specialText) ? "Pending" : "Missing",
    },
    {
      label: "Trade References",
      status: /reference|trade ref/.test(specialText)
        ? "Verified"
        : inquiry.company_registration_number ? "Needs Review" : "Missing",
    },
    {
      label: "Business Documents",
      status: docsText.includes("bcl") || docsText.includes("company registration")
        ? "Verified"
        : docsText.length > 3 ? "Pending" : "Missing",
    },
    {
      label: "Domain Reputation",
      status: !emailValue.includes("@")
        ? "Missing"
        : isFreeDomain ? "Needs Review"
        : inquiry.company_website ? "Verified" : "Pending",
    },
  ];
};

export const formatHistoryField = (field: string) => {
  const labels: Record<string, string> = {
    status: "Status",
    priority: "Priority",
    assigned_broker: "Assigned Broker",
    notes: "Internal Notes",
    last_contacted_at: "Last Contacted",
  };
  return labels[field] ?? field;
};

export const toDateTimeLocal = (value: string | null | undefined): string => {
  if (!value) return "";
  try {
    const d = new Date(value);
    if (isNaN(d.getTime())) return "";
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  } catch {
    return "";
  }
};

export const computeCommercialIntelligence = (inquiry: InquiryRecord | null | undefined) => {
  if (!inquiry) return null;

  const rawPrice = parseCurrencyValue(inquiry.target_price);
  const rawQty = Number((inquiry.quantity ?? "").replace(/[^0-9.]+/g, "")) || 0;
  const rawUnit = (inquiry.unit ?? "").toLowerCase();
  const barrelEquivalent =
    rawUnit.includes("barrel") || rawUnit.includes("bbl")
      ? rawQty
      : rawUnit.includes("mt") || rawUnit.includes("metric ton")
        ? rawQty * 7.3
        : rawQty;
  const dealValue = rawPrice > 0 && rawQty > 0 ? rawPrice * barrelEquivalent : rawPrice > 0 ? rawPrice : 0;

  const commissionText = (inquiry.commission ?? "").toLowerCase();
  const commissionMatch = commissionText.match(/([0-9.]+)%/);
  const commissionPct = commissionMatch ? Number(commissionMatch[1]) : 0;
  const commissionValue = commissionPct > 0 && dealValue > 0 ? (commissionPct / 100) * dealValue : 0;

  const velocity = getDealVelocity(inquiry);
  const geoRisk = getGeographicRisk(inquiry.destination_country ?? inquiry.country);
  const product = getProductRisk(inquiry.product);

  const daysSinceUpdate = inquiry.updated_at
    ? Math.round((Date.now() - new Date(inquiry.updated_at).getTime()) / 86400000)
    : 0;

  const commercialFlags: Array<{ label: string; detail: string; severity: string }> = [];
  if (!inquiry.target_price) commercialFlags.push({ label: "No target price set", detail: "Commercial value is undefined — establish pricing before advancing.", severity: "High" });
  if (!inquiry.incoterms) commercialFlags.push({ label: "Incoterms missing", detail: "Delivery risk allocation is unresolved.", severity: "Medium" });
  if (!inquiry.payment_method) commercialFlags.push({ label: "Payment terms undefined", detail: "Settlement risk needs to be established before matching.", severity: "Medium" });
  if (velocity.score < 40) commercialFlags.push({ label: "Deal velocity low", detail: `Last activity was ${daysSinceUpdate} day${daysSinceUpdate === 1 ? "" : "s"} ago — re-engage to avoid cold pipeline.`, severity: "Medium" });
  if ((inquiry.financing_needed ?? "").toLowerCase().includes("yes")) commercialFlags.push({ label: "Financing required", detail: "Buyer has indicated financing will be needed — factor into timeline.", severity: "Low" });

  const tradeStructure = [
    { label: "Inquiry Type", value: inquiry.inquiry_type ?? "—" },
    { label: "Product", value: `${product.label} — ${product.sector}` },
    { label: "Quantity", value: inquiry.quantity && inquiry.unit ? `${inquiry.quantity} ${inquiry.unit}` : "—" },
    { label: "Incoterms", value: inquiry.incoterms ?? "—" },
    { label: "Payment Terms", value: inquiry.payment_method ?? "—" },
    { label: "Delivery Window", value: inquiry.delivery_window ?? "—" },
    { label: "Origin", value: inquiry.origin_country ?? inquiry.loading_port ?? "—" },
    { label: "Destination", value: inquiry.destination_country ?? inquiry.destination_port ?? "—" },
  ];

  return { dealValue, commissionValue, commissionPct, velocity, geoRisk, product, daysSinceUpdate, commercialFlags, tradeStructure };
};

export const computeTrustProfile = (inquiry: InquiryRecord | null | undefined) => {
  const docsText = (inquiry?.documents_available ?? "").toLowerCase();
  const specialText = `${inquiry?.message ?? ""} ${inquiry?.special_instructions ?? ""}`.toLowerCase();

  const companyVerificationItems = [
    { label: "Company Name", verified: Boolean(inquiry?.company_name) },
    { label: "Registration No.", verified: Boolean(inquiry?.company_registration_number) },
    { label: "Corporate Website", verified: Boolean(inquiry?.company_website) },
    { label: "Registered Address", verified: Boolean(inquiry?.address) },
  ];
  const companyVerification = {
    score: Math.round((companyVerificationItems.filter((i) => i.verified).length / companyVerificationItems.length) * 100),
    items: companyVerificationItems,
  };

  const contactVerificationItems = [
    { label: "Contact Name", verified: Boolean(inquiry?.contact_name) },
    { label: "Corporate Email", verified: Boolean(inquiry?.email?.includes("@")) },
    { label: "Phone Number", verified: Boolean(inquiry?.phone) },
    { label: "WhatsApp Contact", verified: Boolean(inquiry?.whatsapp) },
  ];
  const contactVerification = {
    score: Math.round((contactVerificationItems.filter((i) => i.verified).length / contactVerificationItems.length) * 100),
    items: contactVerificationItems,
  };

  const documentCompletenessItems = [
    { label: "LOI", verified: docsText.includes("loi"), critical: true },
    { label: "Passport", verified: docsText.includes("passport"), critical: true },
    { label: "ICPO", verified: docsText.includes("icpo"), critical: true },
    { label: "BCL", verified: docsText.includes("bcl"), critical: false },
    { label: "Co. Registration", verified: docsText.includes("company registration"), critical: false },
    { label: "Proof of Funds", verified: /proof of funds|pof|funding/.test(specialText), critical: false },
  ];
  const documentCompleteness = {
    score: Math.round((documentCompletenessItems.filter((i) => i.verified).length / documentCompletenessItems.length) * 100),
    criticalScore: Math.round(
      (documentCompletenessItems.filter((i) => i.critical && i.verified).length /
        Math.max(1, documentCompletenessItems.filter((i) => i.critical).length)) * 100
    ),
    items: documentCompletenessItems,
  };

  const tradeReadinessItems = [
    { label: "Product Specified", verified: Boolean(inquiry?.product) },
    { label: "Quantity Defined", verified: Boolean(inquiry?.quantity) },
    { label: "Incoterms Set", verified: Boolean(inquiry?.incoterms) },
    { label: "Payment Method", verified: Boolean(inquiry?.payment_method) },
    { label: "Delivery Window", verified: Boolean(inquiry?.delivery_window) },
    { label: "Destination", verified: Boolean(inquiry?.destination_country || inquiry?.destination_port) },
  ];
  const tradeReadiness = {
    score: Math.round((tradeReadinessItems.filter((i) => i.verified).length / tradeReadinessItems.length) * 100),
    items: tradeReadinessItems,
  };

  const riskIndicators: Array<{ label: string; severity: "High" | "Medium" | "Low"; detail: string }> = [];
  if (!inquiry?.company_registration_number) riskIndicators.push({ label: "No company registration", severity: "High", detail: "Company has not provided registration details" });
  if (!docsText.includes("loi")) riskIndicators.push({ label: "LOI missing", severity: "High", detail: "Letter of Intent has not been submitted" });
  if (!docsText.includes("passport")) riskIndicators.push({ label: "Passport pending", severity: "Medium", detail: "Identity document required before proceeding" });
  if (!inquiry?.assigned_broker) riskIndicators.push({ label: "No broker assigned", severity: "Medium", detail: "Inquiry lacks dedicated broker oversight" });
  if (!inquiry?.company_website) riskIndicators.push({ label: "Website unverified", severity: "Low", detail: "Corporate web presence has not been confirmed" });
  if (!inquiry?.target_price) riskIndicators.push({ label: "No target price", severity: "Low", detail: "Commercial value is not yet established" });

  const significantFields = [
    inquiry?.company_name, inquiry?.company_registration_number, inquiry?.company_website,
    inquiry?.address, inquiry?.contact_name, inquiry?.email, inquiry?.phone,
    inquiry?.product, inquiry?.quantity, inquiry?.incoterms, inquiry?.payment_method,
    inquiry?.delivery_window, inquiry?.target_price, inquiry?.destination_country,
    inquiry?.documents_available, inquiry?.assigned_broker,
    docsText.includes("loi") ? "loi" : null,
    docsText.includes("passport") ? "passport" : null,
    docsText.includes("icpo") ? "icpo" : null,
    inquiry?.broker_notes,
  ];
  const aiConfidenceScore = Math.round((significantFields.filter(Boolean).length / significantFields.length) * 100);

  const nextSteps: Array<{ step: string; priority: "Critical" | "High" | "Medium" | "Low" }> = [];
  if (!inquiry?.company_registration_number) nextSteps.push({ step: "Collect company registration number", priority: "Critical" });
  if (!docsText.includes("loi")) nextSteps.push({ step: "Request Letter of Intent (LOI)", priority: "Critical" });
  if (!docsText.includes("passport")) nextSteps.push({ step: "Request passport from primary contact", priority: "High" });
  if (!docsText.includes("icpo")) nextSteps.push({ step: "Obtain ICPO document", priority: "High" });
  if (!inquiry?.assigned_broker) nextSteps.push({ step: "Assign a dedicated broker", priority: "Medium" });
  if (!inquiry?.target_price) nextSteps.push({ step: "Establish target price and commercial terms", priority: "Medium" });
  if (nextSteps.length === 0) nextSteps.push({ step: "Proceed to buyer introduction", priority: "Low" });

  if (!inquiry) {
    return {
      score: 0,
      risk: "High Risk",
      nextAction: "Verify Corporate Registration",
      breakdown: [
        { label: "Company registration", points: 0, reason: "No registration information available" },
        { label: "Corporate email", points: 0, reason: "Email record is missing" },
        { label: "Website", points: 0, reason: "Website is not yet verified" },
        { label: "Passport", points: 0, reason: "Passport is pending" },
        { label: "LOI", points: 0, reason: "LOI has not been submitted" },
        { label: "ICPO", points: 0, reason: "ICPO is pending" },
        { label: "Trade references", points: 0, reason: "References have not been supplied" },
      ],
      companyVerification,
      contactVerification,
      documentCompleteness,
      tradeReadiness,
      riskIndicators,
      aiConfidenceScore: 0,
      nextSteps,
    };
  }

  let score = 0;
  const breakdown = [] as Array<{ label: string; points: number; reason: string }>;

  if (inquiry.company_registration_number) {
    score += 20;
    breakdown.push({ label: "Company registration", points: 20, reason: "Corporate registration data is present" });
  } else {
    breakdown.push({ label: "Company registration", points: 0, reason: "Registration information is missing" });
  }

  if (inquiry.email?.includes("@")) {
    score += 15;
    breakdown.push({ label: "Corporate email", points: 15, reason: "Direct corporate email is on file" });
  } else {
    breakdown.push({ label: "Corporate email", points: 0, reason: "Corporate email is not available" });
  }

  if (inquiry.company_website) {
    score += 10;
    breakdown.push({ label: "Website", points: 10, reason: "Corporate website is available" });
  } else {
    breakdown.push({ label: "Website", points: 0, reason: "Website is not yet verified" });
  }

  if (docsText.includes("passport")) {
    score += 10;
    breakdown.push({ label: "Passport", points: 10, reason: "Passport document uploaded" });
  } else {
    score -= 10;
    breakdown.push({ label: "Passport", points: -10, reason: "Passport remains outstanding" });
  }

  if (docsText.includes("loi")) {
    score += 15;
    breakdown.push({ label: "LOI", points: 15, reason: "LOI was received" });
  } else {
    score -= 10;
    breakdown.push({ label: "LOI", points: -10, reason: "LOI is still pending" });
  }

  if (docsText.includes("icpo")) {
    score += 10;
    breakdown.push({ label: "ICPO", points: 10, reason: "ICPO is in the file" });
  } else {
    score -= 10;
    breakdown.push({ label: "ICPO", points: -10, reason: "ICPO is still pending" });
  }

  if (/reference|references/.test(specialText)) {
    score += 10;
    breakdown.push({ label: "Trade references", points: 10, reason: "Reference details are documented" });
  } else {
    score -= 8;
    breakdown.push({ label: "Trade references", points: -8, reason: "Trade references are not yet on file" });
  }

  if (inquiry.product || inquiry.quantity || inquiry.incoterms || inquiry.payment_method) {
    score += 10;
    breakdown.push({ label: "Commercial terms", points: 10, reason: "Core commercial terms are captured" });
  } else {
    breakdown.push({ label: "Commercial terms", points: 0, reason: "Commercial terms remain incomplete" });
  }

  if (inquiry.assigned_broker || inquiry.broker_notes) {
    score += 5;
    breakdown.push({ label: "Broker coverage", points: 5, reason: "Broker workflow is active" });
  } else {
    breakdown.push({ label: "Broker coverage", points: 0, reason: "Broker ownership has not been confirmed" });
  }

  score = Math.max(0, Math.min(100, score));

  let risk = "High Risk";
  if (score >= 80) risk = "Low Risk";
  else if (score >= 60) risk = "Medium Risk";

  let nextAction = "Verify Corporate Registration";
  if (score >= 85) nextAction = "Proceed to Buyer Introduction";
  else if (!docsText.includes("passport")) nextAction = "Request Passport";
  else if (!/proof of funds|pof|funding/.test(specialText)) nextAction = "Await Proof of Funds";
  else if (!inquiry.assigned_broker) nextAction = "Schedule Broker Call";

  return { score, risk, nextAction, breakdown, companyVerification, contactVerification, documentCompleteness, tradeReadiness, riskIndicators, aiConfidenceScore, nextSteps };
};
