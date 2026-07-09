"use client";

import { useEffect, useMemo, useState } from "react";

type InquiryRecord = {
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
  reviewed_at?: string | null;
  qualified_at?: string | null;
  matched_at?: string | null;
  closed_at?: string | null;
  updated_at?: string | null;
  created_at?: string | null;
  message?: string | null;
};

type InquiryDraft = {
  status: string;
  priority: string;
  assigned_broker: string;
  broker_notes: string;
};

const statusStyles: Record<string, string> = {
  new: "border-[#C8A24D]/35 bg-[#C8A24D]/12 text-[#F0D38A]",
  reviewing: "border-sky-400/35 bg-sky-400/12 text-sky-200",
  qualified: "border-emerald-400/35 bg-emerald-400/12 text-emerald-200",
  "awaiting documents": "border-violet-400/35 bg-violet-400/12 text-violet-200",
  matched: "border-cyan-400/35 bg-cyan-400/12 text-cyan-200",
  closed: "border-slate-400/35 bg-slate-400/12 text-slate-200",
};

const statusOptions = [
  { value: "new", label: "New" },
  { value: "reviewing", label: "Reviewing" },
  { value: "awaiting documents", label: "Awaiting Documents" },
  { value: "qualified", label: "Qualified" },
  { value: "matched", label: "Matched" },
  { value: "closed", label: "Closed" },
];

const priorityOptions = [
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" },
];

const formatValue = (value: string | null | undefined) => (value?.trim() ? value : "—");
const formatDate = (value: string | null | undefined) => {
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

const normalizeStatusValue = (value?: string | null) => {
  const normalized = (value ?? "new").trim().toLowerCase();

  if (normalized === "waiting_on_documents" || normalized === "waiting on documents" || normalized === "awaiting_documents" || normalized === "awaiting documents") {
    return "awaiting documents";
  }

  return normalized || "new";
};

const normalizePriorityValue = (value?: string | null) => {
  const normalized = (value ?? "medium").trim().toLowerCase();

  if (normalized === "high" || normalized === "medium" || normalized === "low") {
    return normalized;
  }

  return "medium";
};

const formatStatusLabel = (value?: string | null) => {
  const normalized = normalizeStatusValue(value);
  return statusOptions.find((option) => option.value === normalized)?.label ?? "New";
};

const isHighPriority = (item: InquiryRecord) => {
  const priority = normalizePriorityValue(item.priority);
  if (priority === "high") {
    return true;
  }

  const status = normalizeStatusValue(item.status);
  const text = `${item.message ?? ""} ${item.special_instructions ?? ""}`.toLowerCase();
  return status === "reviewing" || status === "qualified" || status === "matched" || text.includes("urgent") || text.includes("priority");
};

const getRelativeTime = (value?: string | null) => {
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

const getPriorityIndicator = (priority: string) => {
  const normalized = normalizePriorityValue(priority);
  return normalized === "high" ? "bg-rose-400 text-rose-100" : normalized === "medium" ? "bg-orange-400 text-orange-100" : "bg-emerald-400 text-emerald-900";
};

const parseDocumentAction = (inquiry: InquiryRecord) => {
  const docs = (inquiry.documents_available ?? "").toLowerCase();

  if (!docs) {
    return "Awaiting documents";
  }

  if (!docs.includes("passport")) {
    return "Passport Needed";
  }
  if (!docs.includes("loi")) {
    return "LOI Needed";
  }
  if (!docs.includes("icpo")) {
    return "ICPO Needed";
  }

  return "Ready for Matching";
};

const formatCurrencyValue = (value: string | number | null | undefined) => {
  if (value === null || value === undefined || value === "") return "—";

  const numeric = typeof value === "number" ? value : Number(String(value).replace(/[^0-9.-]+/g, ""));
  if (Number.isNaN(numeric)) return "—";

  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(numeric);
};

const parseCurrencyValue = (value: string | number | null | undefined) => {
  if (value === null || value === undefined || value === "") return 0;

  const numeric = typeof value === "number" ? value : Number(String(value).replace(/[^0-9.-]+/g, ""));
  return Number.isNaN(numeric) ? 0 : numeric;
};

const getMissingDocumentCount = (inquiry: InquiryRecord) => {
  const docs = (inquiry.documents_available ?? "").toLowerCase();
  if (!docs) return 3;
  const missing = ["passport", "loi", "icpo", "company registration"].filter((doc) => !docs.includes(doc));
  return missing.length;
};

const getReadinessScore = (inquiry: InquiryRecord) => {
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
  if (status === "qualified" || status === "matched") score += 12;
  else if (status === "reviewing") score += 8;
  else if (status === "awaiting documents") score += 4;

  if (inquiry.assigned_broker || inquiry.broker_notes) score += 8;

  return Math.min(100, Math.max(0, score));
};

const getReadinessBand = (score: number) => {
  if (score >= 90) return { label: "Executive Ready", tone: "text-emerald-200" };
  if (score >= 70) return { label: "Nearly Ready", tone: "text-sky-200" };
  if (score >= 50) return { label: "Needs Attention", tone: "text-amber-200" };
  return { label: "High Risk", tone: "text-rose-200" };
};

const getInferenceRecommendations = (inquiries: InquiryRecord[]) => {
  const recommendations: Array<{ id: string; icon: string; title: string; detail: string; priority: string }> = [];
  const openHighValue = inquiries.some((item) => normalizePriorityValue(item.priority) === "high" && normalizeStatusValue(item.status) !== "matched");
  const unassigned = inquiries.some((item) => !item.assigned_broker && normalizeStatusValue(item.status) !== "closed");
  const missingPassport = inquiries.some((item) => !(item.documents_available ?? "").toLowerCase().includes("passport") && normalizeStatusValue(item.status) !== "closed");
  const missingLOI = inquiries.some((item) => !(item.documents_available ?? "").toLowerCase().includes("loi") && normalizeStatusValue(item.status) !== "closed");
  const readyForIntroduction = inquiries.some((item) => getReadinessScore(item) >= 90 && normalizeStatusValue(item.status) !== "closed");
  const documentsComplete = inquiries.some((item) => (item.documents_available ?? "").toLowerCase().includes("loi") && (item.documents_available ?? "").toLowerCase().includes("icpo") && normalizeStatusValue(item.status) !== "closed");

  if (openHighValue) {
    recommendations.push({ id: "high-value", icon: "⚡", title: "High value opportunity requires follow-up", detail: "A premium inquiry is awaiting broker engagement and should be moved to the top of the desk queue.", priority: "High" });
  }
  if (missingPassport) {
    recommendations.push({ id: "passport", icon: "🗂", title: "Missing passport", detail: "One or more active deals still require passport documentation before outreach can proceed.", priority: "Medium" });
  }
  if (missingLOI) {
    recommendations.push({ id: "loi", icon: "📄", title: "Missing LOI", detail: "Request the LOI to keep the deal moving toward qualification and buyer introduction.", priority: "High" });
  }
  if (readyForIntroduction) {
    recommendations.push({ id: "intro", icon: "↗", title: "Ready for buyer introduction", detail: "A deal has reached the readiness threshold for a broker-led introduction.", priority: "High" });
  }
  if (documentsComplete) {
    recommendations.push({ id: "documents", icon: "✓", title: "Documents complete", detail: "Required documentation is now in place for at least one opportunity.", priority: "Medium" });
  }
  if (unassigned) {
    recommendations.push({ id: "assign", icon: "🤝", title: "Broker assignment needed", detail: "Several inquiries still need a named broker to accelerate workflow movement.", priority: "Medium" });
  }
  if (recommendations.length === 0) {
    recommendations.push({ id: "ready", icon: "✓", title: "All active deals are progressing", detail: "No immediate broker intervention is required at the moment.", priority: "Low" });
  }

  return recommendations.slice(0, 4);
};

const getDocumentStatusLabel = (status: string) => {
  if (status === "Uploaded") return "Uploaded";
  if (status === "Missing") return "Missing";
  if (status === "Pending Review") return "Pending Review";
  if (status === "Verified") return "Verified";
  return "Missing";
};

const getDocumentEntries = (documentsValue?: string | null) => {
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
    return {
      label: doc.label,
      status: hasMatch ? defaultStatus : "Missing",
    };
  });

  const extras = rawDocuments.filter((item) => !knownDocs.some((doc) => item.toLowerCase().includes(doc.key)));
  if (extras.length) {
    extras.forEach((item) => {
      entries.push({ label: item, status: defaultStatus });
    });
  }

  return entries;
};

const getTrustRiskTone = (risk: string) => {
  if (risk === "Low Risk") return "border-emerald-400/35 bg-emerald-400/12 text-emerald-200";
  if (risk === "Medium Risk") return "border-[#C8A24D]/35 bg-[#C8A24D]/12 text-[#F0D38A]";
  return "border-rose-400/35 bg-rose-400/12 text-rose-200";
};

const getDealVelocity = (inquiry: InquiryRecord) => {
  const created = inquiry.created_at ? new Date(inquiry.created_at).getTime() : 0;
  const updated = inquiry.updated_at ? new Date(inquiry.updated_at).getTime() : created;
  const ageHours = created ? Math.max(0, (Date.now() - created) / 3600000) : 0;
  const hoursSinceUpdate = updated ? Math.max(0, (Date.now() - updated) / 3600000) : 0;
  const status = normalizeStatusValue(inquiry.status);

  if (status === "matched" || status === "closed") return { label: "Deal Closed", tone: "text-slate-300", score: 100 };
  if (ageHours < 12 && hoursSinceUpdate < 12) return { label: "Active", tone: "text-emerald-200", score: 95 };
  if (hoursSinceUpdate < 24 && (status === "reviewing" || status === "qualified")) return { label: "Moving Fast", tone: "text-emerald-200", score: 80 };
  if (hoursSinceUpdate < 48) return { label: "In Progress", tone: "text-sky-200", score: 60 };
  if (hoursSinceUpdate < 96) return { label: "Slowing", tone: "text-[#F0D38A]", score: 40 };
  return { label: "Stalled", tone: "text-rose-200", score: 15 };
};

const getGeographicRisk = (country: string | null | undefined) => {
  const highRisk = ["iran", "north korea", "syria", "russia", "belarus", "myanmar", "cuba", "venezuela"];
  const mediumRisk = ["nigeria", "iraq", "libya", "angola", "south sudan", "yemen", "sudan", "somalia"];
  const normalized = (country ?? "").toLowerCase();
  if (highRisk.some((c) => normalized.includes(c))) return { label: "Elevated", tone: "border-rose-400/35 bg-rose-400/12 text-rose-200" };
  if (mediumRisk.some((c) => normalized.includes(c))) return { label: "Monitor", tone: "border-[#C8A24D]/35 bg-[#C8A24D]/12 text-[#F0D38A]" };
  return { label: "Standard", tone: "border-emerald-400/35 bg-emerald-400/12 text-emerald-200" };
};

const getProductRisk = (product: string | null | undefined) => {
  const crude = ["crude", "sweet crude", "sour crude", "bonny light", "brent", "wti", "urals"];
  const refined = ["jet", "diesel", "d6", "d2", "gasoil", "lpg", "lng", "naphtha", "mazut", "fuel oil"];
  const normalized = (product ?? "").toLowerCase();
  if (crude.some((p) => normalized.includes(p))) return { label: "Crude Oil", sector: "Upstream" };
  if (refined.some((p) => normalized.includes(p))) return { label: "Refined Product", sector: "Downstream" };
  if (normalized.includes("gas")) return { label: "Gas", sector: "Midstream" };
  if (normalized) return { label: normalized.split(" ").slice(0, 3).join(" "), sector: "Commodity" };
  return { label: "Unspecified", sector: "Unknown" };
};

export default function AdminPage() {
  const [inquiries, setInquiries] = useState<InquiryRecord[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedInquiry, setSelectedInquiry] = useState<InquiryRecord | null>(null);
  const [draft, setDraft] = useState<InquiryDraft | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [panelOpen, setPanelOpen] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const [trustExpanded, setTrustExpanded] = useState(false);

  useEffect(() => {
    let isActive = true;

    const loadInquiries = async () => {
      try {
        setLoading(true);
        setError("");

        console.debug("[Admin] fetching inquiries from /api/admin/inquiries");
        const response = await fetch("/api/admin/inquiries", {
          method: "GET",
          cache: "no-store",
          headers: {
            "Content-Type": "application/json",
          },
        });

        const payload = await response.json();
        console.debug("[Admin] inquiries response", payload);

        if (!response.ok) {
          throw new Error(payload.error ?? "Failed to load inquiries.");
        }

        if (isActive) {
          setInquiries(payload.data ?? []);
        }
      } catch (err) {
        if (isActive) {
          const message = err instanceof Error ? err.message : "Unable to load inquiries.";
          console.error("[Admin] inquiries error", message);
          setError(message);
        }
      } finally {
        if (isActive) {
          setLoading(false);
        }
      }
    };

    loadInquiries();
    return () => {
      isActive = false;
    };
  }, []);

  useEffect(() => {
    if (!selectedInquiry) {
      setDraft(null);
      return;
    }

    setDraft({
      status: normalizeStatusValue(selectedInquiry.status),
      priority: normalizePriorityValue(selectedInquiry.priority),
      assigned_broker: selectedInquiry.assigned_broker ?? "",
      broker_notes: selectedInquiry.broker_notes ?? "",
    });
  }, [selectedInquiry]);

  const filteredInquiries = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();
    if (!normalizedSearch) return inquiries;

    return inquiries.filter((item) => {
      const values = [
        item.name,
        item.company_name,
        item.contact_name,
        item.email,
        item.inquiry_type,
        item.product,
        item.quantity,
        item.country,
        item.status,
        item.priority,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return values.includes(normalizedSearch);
    });
  }, [inquiries, search]);

  const totals = useMemo(() => {
    const total = inquiries.length;
    const newCount = inquiries.filter((item) => normalizeStatusValue(item.status) === "new").length;
    const highPriorityCount = inquiries.filter(isHighPriority).length;
    const closedCount = inquiries.filter((item) => normalizeStatusValue(item.status) === "closed").length;

    return { total, newCount, highPriorityCount, closedCount };
  }, [inquiries]);

  const openInquiry = (inquiry: InquiryRecord) => {
    setSelectedInquiry(inquiry);
    setPanelOpen(true);
    setIsClosing(false);
    setSaveError("");
  };

  const closeInquiry = () => {
    setIsClosing(true);

    window.setTimeout(() => {
      setSelectedInquiry(null);
      setDraft(null);
      setSaveError("");
      setPanelOpen(false);
      setIsClosing(false);
    }, 220);
  };

  const updateDraftField = <K extends keyof InquiryDraft>(field: K, value: InquiryDraft[K]) => {
    setDraft((current) => (current ? { ...current, [field]: value } : current));
  };

  const saveInquiry = async () => {
    if (!selectedInquiry?.id || !draft) {
      return;
    }

    try {
      setSaving(true);
      setSaveError("");

      const response = await fetch("/api/admin/inquiries", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id: selectedInquiry.id,
          status: draft.status,
          priority: draft.priority,
          assigned_broker: draft.assigned_broker,
          broker_notes: draft.broker_notes,
        }),
      });

      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error ?? "Unable to save inquiry updates.");
      }

      const updatedInquiry = payload.data ?? {
        ...selectedInquiry,
        status: draft.status,
        priority: draft.priority,
        assigned_broker: draft.assigned_broker,
        broker_notes: draft.broker_notes,
      };

      setInquiries((current) => current.map((item) => (item.id === selectedInquiry.id ? { ...item, ...updatedInquiry } : item)));
      setSelectedInquiry(updatedInquiry);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to save inquiry updates.";
      setSaveError(message);
    } finally {
      setSaving(false);
    }
  };

  const priorityTasks = useMemo(() => {
    return inquiries
      .filter((item) => isHighPriority(item) || normalizeStatusValue(item.status) === "reviewing")
      .slice(0, 4)
      .map((item) => ({
        id: item.id ?? `${item.email}-${item.created_at}`,
        company: item.company_name ?? item.name ?? "Unnamed inquiry",
        action: parseDocumentAction(item),
        priority: normalizePriorityValue(item.priority),
        due: item.delivery_window ? item.delivery_window : formatDate(item.created_at) || "Today",
      }));
  }, [inquiries]);

  const recentActivity = useMemo(() => {
    const events = inquiries.flatMap((item) => {
      const company = item.company_name ?? item.name ?? "Unknown inquiry";
      const timeline = [
        {
          id: `${item.id ?? item.email}-submitted`,
          label: "Inquiry submitted",
          detail: `${company} entered the pipeline`,
          timestamp: item.created_at ?? "",
        },
      ];

      if (item.updated_at && item.updated_at !== item.created_at) {
        timeline.push({
          id: `${item.id ?? item.email}-status`,
          label: "Status updated",
          detail: `${company} moved to ${formatStatusLabel(item.status)}`,
          timestamp: item.updated_at,
        });
      }

      if (item.priority) {
        timeline.push({
          id: `${item.id ?? item.email}-priority`,
          label: "Priority changed",
          detail: `${company} is now flagged ${normalizePriorityValue(item.priority)}`,
          timestamp: item.updated_at ?? item.created_at ?? "",
        });
      }

      if (item.documents_available) {
        timeline.push({
          id: `${item.id ?? item.email}-documents`,
          label: "Documents received",
          detail: `${company} uploaded supporting documents`,
          timestamp: item.updated_at ?? item.created_at ?? "",
        });
      }

      if (item.assigned_broker) {
        timeline.push({
          id: `${item.id ?? item.email}-broker`,
          label: "Broker assigned",
          detail: `${item.assigned_broker} is now managing ${company}`,
          timestamp: item.updated_at ?? item.created_at ?? "",
        });
      }

      if (item.broker_notes) {
        timeline.push({
          id: `${item.id ?? item.email}-notes`,
          label: "Notes added",
          detail: `${company} has fresh broker notes`,
          timestamp: item.updated_at ?? item.created_at ?? "",
        });
      }

      return timeline;
    });

    return events
      .sort((a, b) => new Date(b.timestamp || 0).getTime() - new Date(a.timestamp || 0).getTime())
      .slice(0, 6);
  }, [inquiries]);

  const recommendations = useMemo(() => getInferenceRecommendations(inquiries), [inquiries]);

  const attentionQueue = useMemo(() => {
    return inquiries
      .map((item) => {
        const waitingHours = item.updated_at ? Math.max(0, Math.round((Date.now() - new Date(item.updated_at).getTime()) / 3600000)) : 0;
        const missingDocuments = getMissingDocumentCount(item);
        const priorityWeight = normalizePriorityValue(item.priority) === "high" ? 3 : normalizePriorityValue(item.priority) === "medium" ? 2 : 1;
        const statusWeight = normalizeStatusValue(item.status) === "reviewing" ? 3 : normalizeStatusValue(item.status) === "awaiting documents" ? 2 : 1;
        const urgencyScore = priorityWeight * 18 + missingDocuments * 8 + Math.min(waitingHours / 4, 20) + statusWeight * 7;

        return { ...item, urgencyScore, readinessScore: getReadinessScore(item) };
      })
      .sort((a, b) => b.urgencyScore - a.urgencyScore)
      .slice(0, 5);
  }, [inquiries]);

  const brokerSnapshot = useMemo(() => {
    const followUpsDueToday = inquiries.filter((item) => normalizeStatusValue(item.status) === "reviewing").length;
    const activeDeals = inquiries.filter((item) => normalizeStatusValue(item.status) !== "closed").length;
    const highPriorityDeals = inquiries.filter((item) => normalizePriorityValue(item.priority) === "high").length;
    const missingDocuments = inquiries.reduce((total, item) => total + getMissingDocumentCount(item), 0);
    const pipelineValue = inquiries.reduce((total, item) => total + parseCurrencyValue(item.target_price), 0);
    const averageResponseHours = inquiries.length
      ? Math.max(1, Math.round(inquiries.reduce((sum, item) => {
          const start = new Date(item.created_at ?? item.updated_at ?? "").getTime();
          const end = new Date(item.updated_at ?? item.created_at ?? "").getTime();
          return sum + (Number.isNaN(start) || Number.isNaN(end) ? 0 : Math.max(0, end - start) / 3600000);
        }, 0) / inquiries.length))
      : 1;

    return {
      activeDeals,
      highPriorityDeals,
      followUpsDueToday,
      missingDocuments,
      pipelineValue,
      averageResponseTime: `${averageResponseHours}h`,
    };
  }, [inquiries]);

  const insights = useMemo(() => {
    const readyForIntroduction = inquiries.filter((item) => getReadinessScore(item) >= 90).length;
    const pipelineValue = inquiries.reduce((total, item) => total + parseCurrencyValue(item.target_price), 0);
    const uncontactedHighPriority = inquiries.filter((item) => normalizePriorityValue(item.priority) === "high" && !item.assigned_broker && normalizeStatusValue(item.status) !== "closed").length;

    return [
      { title: "Deal readiness", detail: `${readyForIntroduction} inquiry${readyForIntroduction === 1 ? "" : "ies"} are ready for buyer introduction.` },
      { title: "Pipeline outlook", detail: `Estimated pipeline exceeds ${formatCurrencyValue(pipelineValue)}.` },
      { title: "Follow-up gap", detail: `${uncontactedHighPriority} high priority inquiry${uncontactedHighPriority === 1 ? "" : "ies"} have not been contacted.` },
      { title: "Response efficiency", detail: `Average broker response time is tracking at ${brokerSnapshot.averageResponseTime}.` },
    ];
  }, [brokerSnapshot.averageResponseTime, inquiries]);

  const panelVisible = Boolean(selectedInquiry || panelOpen);
    const commercialIntelligence = useMemo(() => {
      if (!selectedInquiry) return null;

      const rawPrice = parseCurrencyValue(selectedInquiry.target_price);
      const rawQty = Number((selectedInquiry.quantity ?? "").replace(/[^0-9.]+/g, "")) || 0;
      const rawUnit = (selectedInquiry.unit ?? "").toLowerCase();
      const barrelEquivalent =
        rawUnit.includes("barrel") || rawUnit.includes("bbl")
          ? rawQty
          : rawUnit.includes("mt") || rawUnit.includes("metric ton")
            ? rawQty * 7.3
            : rawQty;
      const dealValue = rawPrice > 0 && rawQty > 0 ? rawPrice * barrelEquivalent : rawPrice > 0 ? rawPrice : 0;

      const commissionText = (selectedInquiry.commission ?? "").toLowerCase();
      const commissionMatch = commissionText.match(/([0-9.]+)%/);
      const commissionPct = commissionMatch ? Number(commissionMatch[1]) : 0;
      const commissionValue = commissionPct > 0 && dealValue > 0 ? (commissionPct / 100) * dealValue : 0;

      const velocity = getDealVelocity(selectedInquiry);
      const geoRisk = getGeographicRisk(selectedInquiry.destination_country ?? selectedInquiry.country);
      const product = getProductRisk(selectedInquiry.product);

      const daysSinceUpdate = selectedInquiry.updated_at
        ? Math.round((Date.now() - new Date(selectedInquiry.updated_at).getTime()) / 86400000)
        : 0;

      const commercialFlags: Array<{ label: string; detail: string; severity: string }> = [];
      if (!selectedInquiry.target_price) {
        commercialFlags.push({ label: "No target price set", detail: "Commercial value is undefined — establish pricing before advancing.", severity: "High" });
      }
      if (!selectedInquiry.incoterms) {
        commercialFlags.push({ label: "Incoterms missing", detail: "Delivery risk allocation is unresolved.", severity: "Medium" });
      }
      if (!selectedInquiry.payment_method) {
        commercialFlags.push({ label: "Payment terms undefined", detail: "Settlement risk needs to be established before matching.", severity: "Medium" });
      }
      if (velocity.score < 40) {
        commercialFlags.push({ label: "Deal velocity low", detail: `Last activity was ${daysSinceUpdate} day${daysSinceUpdate === 1 ? "" : "s"} ago — re-engage to avoid cold pipeline.`, severity: "Medium" });
      }
      if ((selectedInquiry.financing_needed ?? "").toLowerCase().includes("yes")) {
        commercialFlags.push({ label: "Financing required", detail: "Buyer has indicated financing will be needed — factor into timeline.", severity: "Low" });
      }

      const tradeStructure = [
        { label: "Inquiry Type", value: selectedInquiry.inquiry_type ?? "—" },
        { label: "Product", value: `${product.label} — ${product.sector}` },
        { label: "Quantity", value: selectedInquiry.quantity && selectedInquiry.unit ? `${selectedInquiry.quantity} ${selectedInquiry.unit}` : "—" },
        { label: "Incoterms", value: selectedInquiry.incoterms ?? "—" },
        { label: "Payment Terms", value: selectedInquiry.payment_method ?? "—" },
        { label: "Delivery Window", value: selectedInquiry.delivery_window ?? "—" },
        { label: "Origin", value: selectedInquiry.origin_country ?? selectedInquiry.loading_port ?? "—" },
        { label: "Destination", value: selectedInquiry.destination_country ?? selectedInquiry.destination_port ?? "—" },
      ];

      return { dealValue, commissionValue, commissionPct, velocity, geoRisk, product, daysSinceUpdate, commercialFlags, tradeStructure };
    }, [selectedInquiry]);

  const documentEntries = useMemo(() => getDocumentEntries(selectedInquiry?.documents_available), [selectedInquiry]);
  const trustProfile = useMemo(() => {
    const docsText = (selectedInquiry?.documents_available ?? "").toLowerCase();
    const specialText = `${selectedInquiry?.message ?? ""} ${selectedInquiry?.special_instructions ?? ""}`.toLowerCase();

    const companyVerificationItems = [
      { label: "Company Name", verified: Boolean(selectedInquiry?.company_name) },
      { label: "Registration No.", verified: Boolean(selectedInquiry?.company_registration_number) },
      { label: "Corporate Website", verified: Boolean(selectedInquiry?.company_website) },
      { label: "Registered Address", verified: Boolean(selectedInquiry?.address) },
    ];
    const companyVerification = {
      score: Math.round((companyVerificationItems.filter((i) => i.verified).length / companyVerificationItems.length) * 100),
      items: companyVerificationItems,
    };

    const contactVerificationItems = [
      { label: "Contact Name", verified: Boolean(selectedInquiry?.contact_name) },
      { label: "Corporate Email", verified: Boolean(selectedInquiry?.email?.includes("@")) },
      { label: "Phone Number", verified: Boolean(selectedInquiry?.phone) },
      { label: "WhatsApp Contact", verified: Boolean(selectedInquiry?.whatsapp) },
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
          Math.max(1, documentCompletenessItems.filter((i) => i.critical).length)) *
          100
      ),
      items: documentCompletenessItems,
    };

    const tradeReadinessItems = [
      { label: "Product Specified", verified: Boolean(selectedInquiry?.product) },
      { label: "Quantity Defined", verified: Boolean(selectedInquiry?.quantity) },
      { label: "Incoterms Set", verified: Boolean(selectedInquiry?.incoterms) },
      { label: "Payment Method", verified: Boolean(selectedInquiry?.payment_method) },
      { label: "Delivery Window", verified: Boolean(selectedInquiry?.delivery_window) },
      { label: "Destination", verified: Boolean(selectedInquiry?.destination_country || selectedInquiry?.destination_port) },
    ];
    const tradeReadiness = {
      score: Math.round((tradeReadinessItems.filter((i) => i.verified).length / tradeReadinessItems.length) * 100),
      items: tradeReadinessItems,
    };

    const riskIndicators: Array<{ label: string; severity: "High" | "Medium" | "Low"; detail: string }> = [];
    if (!selectedInquiry?.company_registration_number) {
      riskIndicators.push({ label: "No company registration", severity: "High", detail: "Company has not provided registration details" });
    }
    if (!docsText.includes("loi")) {
      riskIndicators.push({ label: "LOI missing", severity: "High", detail: "Letter of Intent has not been submitted" });
    }
    if (!docsText.includes("passport")) {
      riskIndicators.push({ label: "Passport pending", severity: "Medium", detail: "Identity document required before proceeding" });
    }
    if (!selectedInquiry?.assigned_broker) {
      riskIndicators.push({ label: "No broker assigned", severity: "Medium", detail: "Inquiry lacks dedicated broker oversight" });
    }
    if (!selectedInquiry?.company_website) {
      riskIndicators.push({ label: "Website unverified", severity: "Low", detail: "Corporate web presence has not been confirmed" });
    }
    if (!selectedInquiry?.target_price) {
      riskIndicators.push({ label: "No target price", severity: "Low", detail: "Commercial value is not yet established" });
    }

    const significantFields = [
      selectedInquiry?.company_name, selectedInquiry?.company_registration_number, selectedInquiry?.company_website,
      selectedInquiry?.address, selectedInquiry?.contact_name, selectedInquiry?.email, selectedInquiry?.phone,
      selectedInquiry?.product, selectedInquiry?.quantity, selectedInquiry?.incoterms, selectedInquiry?.payment_method,
      selectedInquiry?.delivery_window, selectedInquiry?.target_price, selectedInquiry?.destination_country,
      selectedInquiry?.documents_available, selectedInquiry?.assigned_broker,
      docsText.includes("loi") ? "loi" : null,
      docsText.includes("passport") ? "passport" : null,
      docsText.includes("icpo") ? "icpo" : null,
      selectedInquiry?.broker_notes,
    ];
    const aiConfidenceScore = Math.round((significantFields.filter(Boolean).length / significantFields.length) * 100);

    const nextSteps: Array<{ step: string; priority: "Critical" | "High" | "Medium" | "Low" }> = [];
    if (!selectedInquiry?.company_registration_number) {
      nextSteps.push({ step: "Collect company registration number", priority: "Critical" });
    }
    if (!docsText.includes("loi")) {
      nextSteps.push({ step: "Request Letter of Intent (LOI)", priority: "Critical" });
    }
    if (!docsText.includes("passport")) {
      nextSteps.push({ step: "Request passport from primary contact", priority: "High" });
    }
    if (!docsText.includes("icpo")) {
      nextSteps.push({ step: "Obtain ICPO document", priority: "High" });
    }
    if (!selectedInquiry?.assigned_broker) {
      nextSteps.push({ step: "Assign a dedicated broker", priority: "Medium" });
    }
    if (!selectedInquiry?.target_price) {
      nextSteps.push({ step: "Establish target price and commercial terms", priority: "Medium" });
    }
    if (nextSteps.length === 0) {
      nextSteps.push({ step: "Proceed to buyer introduction", priority: "Low" });
    }

    if (!selectedInquiry) {
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

    if (selectedInquiry.company_registration_number) {
      score += 20;
      breakdown.push({ label: "Company registration", points: 20, reason: "Corporate registration data is present" });
    } else {
      breakdown.push({ label: "Company registration", points: 0, reason: "Registration information is missing" });
    }

    if (selectedInquiry.email?.includes("@")) {
      score += 15;
      breakdown.push({ label: "Corporate email", points: 15, reason: "Direct corporate email is on file" });
    } else {
      breakdown.push({ label: "Corporate email", points: 0, reason: "Corporate email is not available" });
    }

    if (selectedInquiry.company_website) {
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

    if (selectedInquiry.product || selectedInquiry.quantity || selectedInquiry.incoterms || selectedInquiry.payment_method) {
      score += 10;
      breakdown.push({ label: "Commercial terms", points: 10, reason: "Core commercial terms are captured" });
    } else {
      breakdown.push({ label: "Commercial terms", points: 0, reason: "Commercial terms remain incomplete" });
    }

    if (selectedInquiry.assigned_broker || selectedInquiry.broker_notes) {
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
    else if (!selectedInquiry.assigned_broker) nextAction = "Schedule Broker Call";

    return { score, risk, nextAction, breakdown, companyVerification, contactVerification, documentCompleteness, tradeReadiness, riskIndicators, aiConfidenceScore, nextSteps };
  }, [selectedInquiry]);

  const timelineEntries = [
    { label: "Inquiry Submitted", value: selectedInquiry?.created_at },
    { label: "Assigned", value: selectedInquiry?.updated_at },
    { label: "Reviewed", value: selectedInquiry?.reviewed_at },
    { label: "Qualified", value: selectedInquiry?.qualified_at },
    { label: "Matched", value: selectedInquiry?.matched_at },
    { label: "Closed", value: selectedInquiry?.closed_at },
    { label: "Last Updated", value: selectedInquiry?.updated_at ?? selectedInquiry?.created_at },
  ];

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(200,162,77,0.13),_transparent_28%),linear-gradient(135deg,_#03070D_0%,_#071A2D_65%,_#02060D_100%)] px-4 py-8 text-slate-100 sm:px-6 lg:px-8">
      <div className="mx-auto flex max-w-7xl flex-col gap-6">
        <header className="rounded-[28px] border border-white/10 bg-[#050B16]/90 p-6 shadow-[0_20px_80px_rgba(0,0,0,0.5)] backdrop-blur">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="space-y-3">
              <p className="text-sm uppercase tracking-[0.35em] text-[#C8A24D]">Amber Global Energy</p>
              <h1 className="text-3xl font-semibold tracking-tight text-white sm:text-4xl">Internal inquiry operations dashboard</h1>
              <p className="max-w-2xl text-sm leading-7 text-slate-400 sm:text-base">
                A secure operating foundation for monitoring trade inquiries, prioritizing opportunities, and tracking follow-up status across the network.
              </p>
            </div>
            <div className="rounded-2xl border border-[#C8A24D]/20 bg-[#C8A24D]/10 px-4 py-3 text-sm text-slate-300">
              <div className="font-medium text-white">No authentication enabled</div>
              <div className="mt-1 text-slate-400">Internal foundation only — access remains open for now.</div>
            </div>
          </div>
        </header>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {[
            { label: "Total inquiries", value: totals.total, tone: "text-white" },
            { label: "New inquiries", value: totals.newCount, tone: "text-[#F0D38A]" },
            { label: "High priority inquiries", value: totals.highPriorityCount, tone: "text-sky-200" },
            { label: "Closed inquiries", value: totals.closedCount, tone: "text-emerald-200" },
          ].map((card) => (
            <div key={card.label} className="rounded-[24px] border border-white/10 bg-[#071A2D]/90 p-5 shadow-[0_12px_40px_rgba(0,0,0,0.32)]">
              <p className="text-sm uppercase tracking-[0.25em] text-slate-400">{card.label}</p>
              <p className={`mt-3 text-3xl font-semibold ${card.tone}`}>{card.value}</p>
            </div>
          ))}
        </section>

        <section className="rounded-[28px] border border-white/10 bg-[#050B16]/90 p-4 shadow-[0_20px_80px_rgba(0,0,0,0.45)] backdrop-blur sm:p-6">
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-xl font-semibold text-white">Today's Operations</h2>
              <p className="mt-1 text-sm text-slate-400">Broker command center for the desk’s highest priority actions and live operations insight.</p>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {[
              { label: "Active Deals", value: brokerSnapshot.activeDeals, tone: "text-white" },
              { label: "Deals Awaiting Documents", value: brokerSnapshot.missingDocuments, tone: "text-[#F0D38A]" },
              { label: "High Priority Opportunities", value: brokerSnapshot.highPriorityDeals, tone: "text-sky-200" },
              { label: "Deals Ready for Introduction", value: inquiries.filter((item) => getReadinessScore(item) >= 90).length, tone: "text-emerald-200" },
              { label: "Estimated Pipeline Value", value: formatCurrencyValue(brokerSnapshot.pipelineValue), tone: "text-white" },
              { label: "Average Response Time", value: brokerSnapshot.averageResponseTime, tone: "text-[#F0D38A]" },
            ].map((card) => (
              <div key={card.label} className="rounded-[24px] border border-white/10 bg-[#071A2D]/90 p-5 shadow-[0_12px_40px_rgba(0,0,0,0.32)]">
                <p className="text-sm uppercase tracking-[0.25em] text-slate-400">{card.label}</p>
                <p className={`mt-3 text-3xl font-semibold ${card.tone}`}>{card.value}</p>
              </div>
            ))}
          </div>

          <div className="mt-4 grid gap-4 xl:grid-cols-2">
            <div className="rounded-[24px] border border-white/10 bg-[#071A2D]/90 p-5 shadow-[0_12px_40px_rgba(0,0,0,0.32)]">
              <p className="text-sm uppercase tracking-[0.25em] text-slate-400">AI Recommended Actions</p>
              <div className="mt-4 space-y-3">
                {recommendations.map((recommendation) => (
                  <div key={recommendation.id} className="rounded-2xl border border-white/10 bg-[#050B16]/70 px-4 py-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3">
                        <span className="mt-0.5 text-lg">{recommendation.icon}</span>
                        <div>
                          <p className="text-sm font-semibold text-white">{recommendation.title}</p>
                          <p className="mt-1 text-sm text-slate-300">{recommendation.detail}</p>
                        </div>
                      </div>
                      <span className={`rounded-full px-2.5 py-1 text-[10px] uppercase tracking-[0.2em] ${recommendation.priority === "High" ? "bg-rose-500/15 text-rose-200" : recommendation.priority === "Medium" ? "bg-[#C8A24D]/15 text-[#F0D38A]" : "bg-emerald-500/15 text-emerald-200"}`}>
                        {recommendation.priority}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-[24px] border border-white/10 bg-[#071A2D]/90 p-5 shadow-[0_12px_40px_rgba(0,0,0,0.32)]">
              <p className="text-sm uppercase tracking-[0.25em] text-slate-400">Deals Requiring Attention</p>
              <div className="mt-4 space-y-3">
                {attentionQueue.length ? (
                  attentionQueue.map((item) => {
                    const readinessScore = getReadinessScore(item);
                    const readinessBand = getReadinessBand(readinessScore);

                    return (
                      <div key={item.id ?? `${item.email}-${item.created_at}`} className="rounded-2xl border border-white/10 bg-[#050B16]/70 px-4 py-3">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="text-sm font-semibold text-white">{item.company_name ?? item.name ?? "Unnamed inquiry"}</p>
                            <p className="mt-1 text-sm text-slate-300">{parseDocumentAction(item)} • {formatStatusLabel(item.status)}</p>
                          </div>
                          <span className={`rounded-full px-2.5 py-1 text-[10px] uppercase tracking-[0.2em] ${normalizePriorityValue(item.priority) === "high" ? "bg-rose-500/15 text-rose-200" : normalizePriorityValue(item.priority) === "medium" ? "bg-[#C8A24D]/15 text-[#F0D38A]" : "bg-emerald-500/15 text-emerald-200"}`}>
                            {normalizePriorityValue(item.priority)}
                          </span>
                        </div>
                        <div className="mt-3 flex items-center justify-between gap-3 text-xs uppercase tracking-[0.2em] text-slate-500">
                          <span>{readinessScore}/100</span>
                          <span className={readinessBand.tone}>{readinessBand.label}</span>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="rounded-2xl border border-white/10 bg-[#050B16]/70 px-4 py-7 text-center text-sm text-slate-400">No urgent deals require broker attention.</div>
                )}
              </div>
            </div>
          </div>

          <div className="mt-4 grid gap-4 xl:grid-cols-2">
            <div className="rounded-[24px] border border-white/10 bg-[#071A2D]/90 p-5 shadow-[0_12px_40px_rgba(0,0,0,0.32)]">
              <p className="text-sm uppercase tracking-[0.25em] text-slate-400">Recent Activity</p>
              <div className="mt-4 space-y-3">
                {recentActivity.length ? (
                  recentActivity.map((activity) => (
                    <div key={activity.id} className="rounded-2xl border border-white/10 bg-[#050B16]/70 px-4 py-3">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-semibold text-white">{activity.label}</p>
                          <p className="mt-2 text-sm text-slate-300">{activity.detail}</p>
                        </div>
                        <span className="text-xs uppercase tracking-[0.2em] text-slate-500">{getRelativeTime(activity.timestamp)}</span>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="rounded-2xl border border-white/10 bg-[#050B16]/70 px-4 py-7 text-center text-sm text-slate-400">No recent activity yet.</div>
                )}
              </div>
            </div>

            <div className="rounded-[24px] border border-white/10 bg-[#071A2D]/90 p-5 shadow-[0_12px_40px_rgba(0,0,0,0.32)]">
              <p className="text-sm uppercase tracking-[0.25em] text-slate-400">Executive Insights</p>
              <div className="mt-4 space-y-3">
                {insights.map((insight) => (
                  <div key={insight.title} className="rounded-2xl border border-white/10 bg-[#050B16]/70 px-4 py-4">
                    <p className="text-xs uppercase tracking-[0.25em] text-[#C8A24D]">{insight.title}</p>
                    <p className="mt-2 text-sm text-slate-200">{insight.detail}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="rounded-[28px] border border-white/10 bg-[#050B16]/90 p-4 shadow-[0_20px_80px_rgba(0,0,0,0.45)] backdrop-blur sm:p-6">
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-xl font-semibold text-white">Inquiry pipeline</h2>
              <p className="mt-1 text-sm text-slate-400">Monitor all inbound trade opportunities and their current workflow state.</p>
            </div>
            <label className="w-full sm:w-80">
              <span className="mb-2 block text-sm text-slate-400">Search inquiries</span>
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search by name, company, product, country..."
                className="w-full rounded-xl border border-white/10 bg-[#071A2D] px-4 py-3 text-sm text-white outline-none transition focus:border-[#C8A24D] focus:ring-2 focus:ring-[#C8A24D]/30"
              />
            </label>
          </div>

          {loading ? (
            <div className="rounded-2xl border border-white/10 bg-[#071A2D]/70 px-5 py-10 text-center text-slate-400">
              Loading inquiries from Supabase...
            </div>
          ) : error ? (
            <div className="rounded-2xl border border-rose-400/20 bg-rose-500/10 px-5 py-10 text-center text-rose-200">
              {error}
            </div>
          ) : filteredInquiries.length === 0 ? (
            <div className="rounded-2xl border border-white/10 bg-[#071A2D]/70 px-5 py-10 text-center text-slate-400">
              No inquiries match this search.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full border-separate border-spacing-y-2 text-left text-sm">
                <thead>
                  <tr className="text-slate-400">
                    <th className="px-3 py-2 font-medium">Name</th>
                    <th className="px-3 py-2 font-medium">Company</th>
                    <th className="px-3 py-2 font-medium">Email</th>
                    <th className="px-3 py-2 font-medium">Inquiry Type</th>
                    <th className="px-3 py-2 font-medium">Product</th>
                    <th className="px-3 py-2 font-medium">Quantity</th>
                    <th className="px-3 py-2 font-medium">Country</th>
                    <th className="px-3 py-2 font-medium">Status</th>
                    <th className="px-3 py-2 font-medium">Readiness</th>
                    <th className="px-3 py-2 font-medium">Created</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredInquiries.map((item) => {
                    const statusClass = statusStyles[normalizeStatusValue(item.status)] ?? statusStyles.new;
                    const readinessScore = getReadinessScore(item);
                    const readinessBand = getReadinessBand(readinessScore);

                    return (
                      <tr
                        key={item.id ?? `${item.email}-${item.created_at}`}
                        role="button"
                        tabIndex={0}
                        onClick={() => openInquiry(item)}
                        onKeyDown={(event) => {
                          if (event.key === "Enter" || event.key === " ") {
                            event.preventDefault();
                            openInquiry(item);
                          }
                        }}
                        className="cursor-pointer rounded-2xl bg-[#071A2D]/80 text-slate-300 outline-none transition hover:bg-[#0B1830] focus:bg-[#0B1830]"
                      >
                        <td className="rounded-l-2xl px-3 py-3 font-medium text-white">{formatValue(item.contact_name ?? item.name)}</td>
                        <td className="px-3 py-3">{formatValue(item.company_name)}</td>
                        <td className="px-3 py-3">{formatValue(item.email)}</td>
                        <td className="px-3 py-3">{formatValue(item.inquiry_type)}</td>
                        <td className="px-3 py-3">{formatValue(item.product)}</td>
                        <td className="px-3 py-3">{formatValue(item.quantity)}</td>
                        <td className="px-3 py-3">{formatValue(item.country)}</td>
                        <td className="px-3 py-3">
                          <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs uppercase tracking-[0.2em] ${statusClass}`}>
                            {formatStatusLabel(item.status)}
                          </span>
                        </td>
                        <td className="px-3 py-3">
                          <div className="flex flex-col gap-1">
                            <span className="text-sm font-medium text-white">{readinessScore}/100</span>
                            <span className={`text-[10px] uppercase tracking-[0.2em] ${readinessBand.tone}`}>{readinessBand.label}</span>
                          </div>
                        </td>
                        <td className="rounded-r-2xl px-3 py-3">{formatDate(item.created_at)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>

      {panelVisible ? (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/70 backdrop-blur-sm" onClick={closeInquiry}>
          <div
            className={`h-full w-full max-w-3xl overflow-y-auto border-l border-white/10 bg-[#050B16]/95 p-6 shadow-[0_30px_100px_rgba(0,0,0,0.7)] transition-transform duration-300 ease-out ${isClosing ? "translate-x-full" : "translate-x-0"}`}
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex flex-col gap-4 border-b border-white/10 pb-4 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="text-sm uppercase tracking-[0.3em] text-[#C8A24D]">Executive Deal Workspace</p>
                <h3 className="mt-2 text-2xl font-semibold text-white">{formatValue(selectedInquiry?.contact_name ?? selectedInquiry?.name)}</h3>
                <p className="mt-1 text-sm text-slate-400">{formatValue(selectedInquiry?.company_name)}</p>
              </div>
              <button
                type="button"
                onClick={closeInquiry}
                className="rounded-full border border-white/10 bg-[#071A2D] px-3 py-2 text-sm text-slate-300 transition hover:border-[#C8A24D]/40 hover:text-white"
              >
                ×
              </button>
            </div>

            <div className="mt-6 space-y-4">
              <div className="rounded-[24px] border border-white/10 bg-[#071A2D]/90 p-4">
                <p className="text-sm uppercase tracking-[0.25em] text-slate-400">Company Information</p>
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  {[
                    ["Company Name", selectedInquiry?.company_name],
                    ["Company Registration", selectedInquiry?.company_registration_number],
                    ["Company Website", selectedInquiry?.company_website],
                    ["Country", selectedInquiry?.country],
                    ["Address", selectedInquiry?.address],
                  ].map(([label, value]) => (
                    <div key={label}>
                      <p className="text-xs uppercase tracking-[0.2em] text-slate-500">{label}</p>
                      <p className="mt-1 text-sm text-slate-200">{formatValue(value as string | null | undefined)}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-[24px] border border-white/10 bg-[#071A2D]/90 p-4">
                <p className="text-sm uppercase tracking-[0.25em] text-slate-400">Trust Profile</p>

                <div className="mt-4 grid gap-4 lg:grid-cols-[220px_1fr] lg:items-start">
                  <div className="flex flex-col items-center rounded-[24px] border border-white/10 bg-[#050B16]/70 p-4">
                    <div className="relative flex h-32 w-32 items-center justify-center">
                      <svg viewBox="0 0 120 120" className="h-32 w-32 -rotate-90">
                        <circle cx="60" cy="60" r="48" stroke="rgba(255,255,255,0.12)" strokeWidth="10" fill="none" />
                        <circle
                          cx="60"
                          cy="60"
                          r="48"
                          stroke="#C8A24D"
                          strokeWidth="10"
                          strokeLinecap="round"
                          fill="none"
                          strokeDasharray={2 * Math.PI * 48}
                          strokeDashoffset={2 * Math.PI * 48 * (1 - trustProfile.score / 100)}
                        />
                      </svg>
                      <div className="absolute flex flex-col items-center text-center">
                        <span className="text-3xl font-semibold text-white">{trustProfile.score}</span>
                        <span className="text-[10px] uppercase tracking-[0.25em] text-slate-400">/100</span>
                      </div>
                    </div>
                    <p className="mt-3 text-sm font-medium text-white">Overall Trust Score</p>
                    <span className={`mt-2 inline-flex rounded-full border px-2.5 py-1 text-[10px] uppercase tracking-[0.2em] ${getTrustRiskTone(trustProfile.risk)}`}>
                      {trustProfile.risk}
                    </span>
                    <div className="mt-4 w-full rounded-[18px] border border-[#C8A24D]/20 bg-[#C8A24D]/6 p-3 text-center">
                      <p className="text-[10px] uppercase tracking-[0.2em] text-slate-500">AI Confidence</p>
                      <p className="mt-1 text-2xl font-semibold text-[#F0D38A]">{trustProfile.aiConfidenceScore}%</p>
                      <p className="mt-0.5 text-[10px] text-slate-600">Data completeness</p>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      {[
                        { title: "Company", data: trustProfile.companyVerification },
                        { title: "Contact", data: trustProfile.contactVerification },
                        { title: "Documents", data: { score: trustProfile.documentCompleteness.score, items: trustProfile.documentCompleteness.items.map((i) => ({ label: i.label, verified: i.verified, critical: i.critical })) } },
                        { title: "Trade", data: trustProfile.tradeReadiness },
                      ].map(({ title, data }) => (
                        <div key={title} className="rounded-[20px] border border-white/10 bg-[#050B16]/70 p-3">
                          <div className="flex items-center justify-between">
                            <p className="text-[10px] uppercase tracking-[0.2em] text-slate-500">{title}</p>
                            <span className={`text-xs font-semibold ${data.score >= 75 ? "text-emerald-300" : data.score >= 40 ? "text-[#F0D38A]" : "text-rose-300"}`}>
                              {data.score}%
                            </span>
                          </div>
                          <div className="mt-2 space-y-1">
                            {data.items.map((item) => (
                              <div key={item.label} className="flex items-center gap-1.5">
                                <span className={`shrink-0 text-[9px] ${"critical" in item && item.critical && !item.verified ? "text-rose-500" : item.verified ? "text-emerald-400" : "text-slate-700"}`}>
                                  {item.verified ? "●" : "○"}
                                </span>
                                <span className={`text-[10px] leading-tight ${"critical" in item && item.critical && !item.verified ? "text-slate-400" : item.verified ? "text-slate-300" : "text-slate-600"}`}>
                                  {item.label}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="rounded-[20px] border border-white/10 bg-[#050B16]/70 p-4">
                      <p className="text-[10px] uppercase tracking-[0.2em] text-slate-500">Recommended Next Action</p>
                      <p className="mt-2 text-sm font-medium text-white">{trustProfile.nextAction}</p>
                    </div>
                  </div>
                </div>

                {trustProfile.riskIndicators.length > 0 && (
                  <div className="mt-4 rounded-[20px] border border-rose-400/20 bg-rose-400/5 p-4">
                    <p className="text-[10px] uppercase tracking-[0.2em] text-slate-500">Risk Indicators</p>
                    <div className="mt-3 space-y-2">
                      {trustProfile.riskIndicators.map((risk) => (
                        <div key={risk.label} className="flex items-start justify-between gap-3 rounded-xl border border-white/10 bg-[#071A2D]/80 px-3 py-2">
                          <div>
                            <p className="text-sm font-medium text-white">{risk.label}</p>
                            <p className="mt-0.5 text-xs text-slate-500">{risk.detail}</p>
                          </div>
                          <span className={`shrink-0 rounded-full border px-2.5 py-1 text-[10px] uppercase tracking-[0.2em] ${risk.severity === "High" ? "border-rose-400/35 bg-rose-400/12 text-rose-200" : risk.severity === "Medium" ? "border-[#C8A24D]/35 bg-[#C8A24D]/12 text-[#F0D38A]" : "border-slate-400/35 bg-slate-400/12 text-slate-300"}`}>
                            {risk.severity}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="mt-4 rounded-[20px] border border-white/10 bg-[#050B16]/70 p-4">
                  <p className="text-[10px] uppercase tracking-[0.2em] text-slate-500">Next Verification Steps</p>
                  <div className="mt-3 space-y-2">
                    {trustProfile.nextSteps.map((item, index) => (
                      <div key={item.step} className="flex items-start gap-3">
                        <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-[#C8A24D]/40 bg-[#C8A24D]/12 text-[10px] font-medium text-[#F0D38A]">
                          {index + 1}
                        </span>
                        <div className="flex flex-1 items-start justify-between gap-2">
                          <p className="text-sm text-slate-200">{item.step}</p>
                          <span className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] uppercase tracking-[0.2em] ${item.priority === "Critical" ? "border-rose-400/35 bg-rose-400/12 text-rose-200" : item.priority === "High" ? "border-[#C8A24D]/35 bg-[#C8A24D]/12 text-[#F0D38A]" : item.priority === "Medium" ? "border-sky-400/35 bg-sky-400/12 text-sky-200" : "border-emerald-400/35 bg-emerald-400/12 text-emerald-200"}`}>
                            {item.priority}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="mt-4 rounded-[20px] border border-white/10 bg-[#050B16]/70 p-4">
                  <button
                    type="button"
                    onClick={() => setTrustExpanded((value) => !value)}
                    className="flex w-full items-center justify-between text-left text-sm font-medium text-white"
                  >
                    <span>Why this score?</span>
                    <span className="text-[#C8A24D]">{trustExpanded ? "−" : "+"}</span>
                  </button>
                  {trustExpanded ? (
                    <div className="mt-3 space-y-2">
                      {trustProfile.breakdown.map((item) => (
                        <div key={item.label} className="flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-[#071A2D]/80 px-3 py-2 text-sm text-slate-300">
                          <div>
                            <p className="font-medium text-white">{item.label}</p>
                            <p className="mt-1 text-xs text-slate-500">{item.reason}</p>
                          </div>
                          <span className={`text-sm font-medium ${item.points >= 0 ? "text-[#F0D38A]" : "text-rose-200"}`}>
                            {item.points >= 0 ? `+${item.points}` : item.points}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : null}
                </div>
              </div>

              <div className="rounded-[24px] border border-white/10 bg-[#071A2D]/90 p-4">
                <p className="text-sm uppercase tracking-[0.25em] text-slate-400">Primary Contact</p>
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  {[
                    ["Full Name", selectedInquiry?.contact_name],
                    ["Email", selectedInquiry?.email],
                    ["Phone", selectedInquiry?.phone],
                    ["WhatsApp", selectedInquiry?.whatsapp],
                  ].map(([label, value]) => (
                    <div key={label}>
                      <p className="text-xs uppercase tracking-[0.2em] text-slate-500">{label}</p>
                      <p className="mt-1 text-sm text-slate-200">{formatValue(value as string | null | undefined)}</p>
                    </div>
                  ))}
                </div>
              </div>

              {commercialIntelligence ? (
                <div className="rounded-[24px] border border-white/10 bg-[#071A2D]/90 p-4">
                  <p className="text-sm uppercase tracking-[0.25em] text-slate-400">Commercial Intelligence</p>

                  <div className="mt-4 grid gap-3 sm:grid-cols-3">
                    <div className="rounded-[20px] border border-white/10 bg-[#050B16]/70 p-4">
                      <p className="text-[10px] uppercase tracking-[0.2em] text-slate-500">Est. Deal Value</p>
                      <p className="mt-2 text-2xl font-semibold text-white">
                        {commercialIntelligence.dealValue > 0 ? formatCurrencyValue(commercialIntelligence.dealValue) : "—"}
                      </p>
                      <p className="mt-1 text-[10px] text-slate-600">
                        {selectedInquiry?.quantity && selectedInquiry?.unit
                          ? `${selectedInquiry.quantity} ${selectedInquiry.unit}`
                          : "Quantity not specified"}
                      </p>
                    </div>
                    <div className="rounded-[20px] border border-white/10 bg-[#050B16]/70 p-4">
                      <p className="text-[10px] uppercase tracking-[0.2em] text-slate-500">Commission Est.</p>
                      <p className="mt-2 text-2xl font-semibold text-[#F0D38A]">
                        {commercialIntelligence.commissionValue > 0
                          ? formatCurrencyValue(commercialIntelligence.commissionValue)
                          : commercialIntelligence.commissionPct > 0
                            ? `${commercialIntelligence.commissionPct}%`
                            : "—"}
                      </p>
                      <p className="mt-1 text-[10px] text-slate-600">
                        {commercialIntelligence.commissionPct > 0
                          ? `${commercialIntelligence.commissionPct}% of deal value`
                          : "Commission not specified"}
                      </p>
                    </div>
                    <div className="rounded-[20px] border border-white/10 bg-[#050B16]/70 p-4">
                      <p className="text-[10px] uppercase tracking-[0.2em] text-slate-500">Deal Velocity</p>
                      <p className={`mt-2 text-2xl font-semibold ${commercialIntelligence.velocity.tone}`}>
                        {commercialIntelligence.velocity.label}
                      </p>
                      <p className="mt-1 text-[10px] text-slate-600">
                        {commercialIntelligence.daysSinceUpdate === 0
                          ? "Updated today"
                          : `Last activity ${commercialIntelligence.daysSinceUpdate}d ago`}
                      </p>
                    </div>
                  </div>

                  <div className="mt-3 grid gap-3 sm:grid-cols-2">
                    <div className="rounded-[20px] border border-white/10 bg-[#050B16]/70 p-4">
                      <p className="text-[10px] uppercase tracking-[0.2em] text-slate-500">Product Classification</p>
                      <p className="mt-2 text-sm font-semibold text-white">{commercialIntelligence.product.label}</p>
                      <p className="mt-1 text-[10px] text-slate-500">{commercialIntelligence.product.sector} market segment</p>
                    </div>
                    <div className="rounded-[20px] border border-white/10 bg-[#050B16]/70 p-4">
                      <p className="text-[10px] uppercase tracking-[0.2em] text-slate-500">Geographic Risk</p>
                      <span className={`mt-2 inline-flex rounded-full border px-2.5 py-1 text-[10px] uppercase tracking-[0.2em] ${commercialIntelligence.geoRisk.tone}`}>
                        {commercialIntelligence.geoRisk.label}
                      </span>
                      <p className="mt-2 text-[10px] text-slate-500">
                        {selectedInquiry?.destination_country ?? selectedInquiry?.country ?? "Destination unspecified"}
                      </p>
                    </div>
                  </div>

                  <div className="mt-3 rounded-[20px] border border-white/10 bg-[#050B16]/70 p-4">
                    <p className="text-[10px] uppercase tracking-[0.2em] text-slate-500">Trade Structure</p>
                    <div className="mt-3 grid gap-2 sm:grid-cols-2">
                      {commercialIntelligence.tradeStructure.map((row) => (
                        <div key={row.label}>
                          <p className="text-[10px] uppercase tracking-[0.18em] text-slate-600">{row.label}</p>
                          <p className="mt-0.5 text-sm text-slate-200">{row.value}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {commercialIntelligence.commercialFlags.length > 0 ? (
                    <div className="mt-3 rounded-[20px] border border-[#C8A24D]/20 bg-[#C8A24D]/5 p-4">
                      <p className="text-[10px] uppercase tracking-[0.2em] text-slate-500">Commercial Risk Flags</p>
                      <div className="mt-3 space-y-2">
                        {commercialIntelligence.commercialFlags.map((flag) => (
                          <div key={flag.label} className="flex items-start justify-between gap-3 rounded-xl border border-white/10 bg-[#071A2D]/80 px-3 py-2">
                            <div>
                              <p className="text-sm font-medium text-white">{flag.label}</p>
                              <p className="mt-0.5 text-xs text-slate-500">{flag.detail}</p>
                            </div>
                            <span className={`shrink-0 rounded-full border px-2.5 py-1 text-[10px] uppercase tracking-[0.2em] ${flag.severity === "High" ? "border-rose-400/35 bg-rose-400/12 text-rose-200" : flag.severity === "Medium" ? "border-[#C8A24D]/35 bg-[#C8A24D]/12 text-[#F0D38A]" : "border-slate-400/35 bg-slate-400/12 text-slate-300"}`}>
                              {flag.severity}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="mt-3 rounded-[20px] border border-emerald-400/20 bg-emerald-400/5 px-4 py-3 text-sm text-emerald-200">
                      No commercial risk flags detected. Deal structure is clean.
                    </div>
                  )}
                </div>
              ) : null}

              <div className="rounded-[24px] border border-white/10 bg-[#071A2D]/90 p-4">
                <p className="text-sm uppercase tracking-[0.25em] text-slate-400">Trade Information</p>
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  {[
                    ["Inquiry Type", selectedInquiry?.inquiry_type],
                    ["Product", selectedInquiry?.product],
                    ["Grade", selectedInquiry?.grade],
                    ["Quantity", selectedInquiry?.quantity],
                    ["Unit", selectedInquiry?.unit],
                    ["Destination Port", selectedInquiry?.destination_port],
                    ["Destination Country", selectedInquiry?.destination_country],
                    ["Delivery Window", selectedInquiry?.delivery_window],
                  ].map(([label, value]) => (
                    <div key={label}>
                      <p className="text-xs uppercase tracking-[0.2em] text-slate-500">{label}</p>
                      <p className="mt-1 text-sm text-slate-200">{formatValue(value as string | null | undefined)}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-[24px] border border-white/10 bg-[#071A2D]/90 p-4">
                <p className="text-sm uppercase tracking-[0.25em] text-slate-400">Commercial Terms</p>
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  {[
                    ["Payment Terms", selectedInquiry?.payment_method],
                    ["Incoterms", selectedInquiry?.incoterms],
                    ["Target Price", selectedInquiry?.target_price],
                    ["Commission", selectedInquiry?.commission],
                    ["Financing Needed", selectedInquiry?.financing_needed],
                  ].map(([label, value]) => (
                    <div key={label}>
                      <p className="text-xs uppercase tracking-[0.2em] text-slate-500">{label}</p>
                      <p className="mt-1 text-sm text-slate-200">{formatValue(value as string | null | undefined)}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-[24px] border border-white/10 bg-[#071A2D]/90 p-4">
                <p className="text-sm uppercase tracking-[0.25em] text-slate-400">Documents</p>
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  {documentEntries.map((document) => (
                    <div key={document.label} className="rounded-2xl border border-white/10 bg-[#050B16]/70 px-3 py-3">
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-sm text-slate-200">{document.label}</p>
                        <span className="rounded-full border border-[#C8A24D]/25 bg-[#C8A24D]/12 px-2.5 py-1 text-[10px] uppercase tracking-[0.2em] text-[#F0D38A]">
                          {document.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-[24px] border border-white/10 bg-[#071A2D]/90 p-4">
                <p className="text-sm uppercase tracking-[0.25em] text-slate-400">Special Instructions</p>
                <p className="mt-3 whitespace-pre-wrap text-sm text-slate-200">{formatValue(selectedInquiry?.special_instructions)}</p>
              </div>

              <div className="rounded-[24px] border border-white/10 bg-[#071A2D]/90 p-4">
                <p className="text-sm uppercase tracking-[0.25em] text-slate-400">Broker Workflow</p>
                <div className="mt-4 grid gap-4">
                  <div className="grid gap-4 md:grid-cols-2">
                    <label>
                      <span className="mb-2 block text-xs uppercase tracking-[0.2em] text-slate-500">Status</span>
                      <select
                        value={draft?.status ?? "new"}
                        onChange={(event) => updateDraftField("status", event.target.value)}
                        className="w-full rounded-xl border border-white/10 bg-[#050B16] px-4 py-3 text-sm text-white outline-none transition focus:border-[#C8A24D] focus:ring-2 focus:ring-[#C8A24D]/30"
                      >
                        {statusOptions.map((option) => (
                          <option key={option.value} value={option.value} className="bg-[#050B16] text-white">
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label>
                      <span className="mb-2 block text-xs uppercase tracking-[0.2em] text-slate-500">Priority</span>
                      <select
                        value={draft?.priority ?? "medium"}
                        onChange={(event) => updateDraftField("priority", event.target.value)}
                        className="w-full rounded-xl border border-white/10 bg-[#050B16] px-4 py-3 text-sm text-white outline-none transition focus:border-[#C8A24D] focus:ring-2 focus:ring-[#C8A24D]/30"
                      >
                        {priorityOptions.map((option) => (
                          <option key={option.value} value={option.value} className="bg-[#050B16] text-white">
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>

                  <label>
                    <span className="mb-2 block text-xs uppercase tracking-[0.2em] text-slate-500">Assigned Broker</span>
                    <input
                      value={draft?.assigned_broker ?? ""}
                      onChange={(event) => updateDraftField("assigned_broker", event.target.value)}
                      placeholder="Assign a broker"
                      className="w-full rounded-xl border border-white/10 bg-[#050B16] px-4 py-3 text-sm text-white outline-none transition focus:border-[#C8A24D] focus:ring-2 focus:ring-[#C8A24D]/30"
                    />
                  </label>

                  <label>
                    <span className="mb-2 block text-xs uppercase tracking-[0.2em] text-slate-500">Internal Broker Notes</span>
                    <textarea
                      value={draft?.broker_notes ?? ""}
                      onChange={(event) => updateDraftField("broker_notes", event.target.value)}
                      rows={7}
                      placeholder="Add private notes for the internal deal team..."
                      className="w-full rounded-xl border border-white/10 bg-[#050B16] px-4 py-3 text-sm text-white outline-none transition focus:border-[#C8A24D] focus:ring-2 focus:ring-[#C8A24D]/30"
                    />
                  </label>

                  <div className="rounded-[24px] border border-white/10 bg-[#050B16]/70 p-4">
                    <p className="text-sm uppercase tracking-[0.25em] text-slate-400">Workflow Timeline</p>
                    <div className="mt-3 grid gap-3 sm:grid-cols-2">
                      {timelineEntries.map((entry) => (
                        <div key={entry.label}>
                          <p className="text-xs uppercase tracking-[0.2em] text-slate-500">{entry.label}</p>
                          <p className="mt-1 text-sm text-slate-200">{formatDate(entry.value)}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {saveError ? <p className="mt-3 text-sm text-rose-200">{saveError}</p> : null}

                <button
                  type="button"
                  onClick={saveInquiry}
                  disabled={saving}
                  className="mt-4 w-full rounded-xl border border-[#C8A24D]/35 bg-[#C8A24D]/16 px-4 py-3 text-sm font-medium text-[#F0D38A] transition hover:bg-[#C8A24D]/24 disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {saving ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </main>
  );
}
