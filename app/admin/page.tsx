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

const formatCurrencyValue = (value: string | null | undefined) => {
  if (!value) return "—";
  const numeric = Number(value.replace(/[^0-9.-]+/g, ""));
  if (Number.isNaN(numeric)) return "—";
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(numeric);
};

const getMissingDocumentCount = (inquiry: InquiryRecord) => {
  const docs = (inquiry.documents_available ?? "").toLowerCase();
  if (!docs) return 3;
  const missing = ["passport", "loi", "icpo", "company registration"].filter((doc) => !docs.includes(doc));
  return missing.length;
};

const getInferenceRecommendations = (inquiries: InquiryRecord[]) => {
  const recommendations: string[] = [];
  const openHighValue = inquiries.some((item) => normalizePriorityValue(item.priority) === "high" && normalizeStatusValue(item.status) !== "matched");
  const unassigned = inquiries.some((item) => !item.broker_notes && normalizeStatusValue(item.status) !== "closed");
  const missingPassport = inquiries.some((item) => !(item.documents_available ?? "").toLowerCase().includes("passport") && normalizeStatusValue(item.status) !== "closed");
  const missingLOI = inquiries.some((item) => !(item.documents_available ?? "").toLowerCase().includes("loi") && normalizeStatusValue(item.status) !== "closed");

  if (openHighValue) recommendations.push("High-value inquiry awaiting broker assignment.");
  if (missingPassport) recommendations.push("Missing passport detected.");
  if (missingLOI) recommendations.push("Recommend requesting LOI.");
  if (unassigned) recommendations.push("Potential duplicate inquiry detected.");
  if (recommendations.length === 0) {
    recommendations.push("Buyer appears ready for matching.");
    recommendations.push("Opportunity looks strong for today’s desk.");
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
    const activities = inquiries
      .slice()
      .sort((a, b) => (new Date(b.updated_at ?? b.created_at ?? "").getTime() - new Date(a.updated_at ?? a.created_at ?? "").getTime()))
      .slice(0, 4)
      .map((item) => ({
        id: item.id ?? `${item.email}-${item.created_at}`,
        label: `${formatStatusLabel(item.status)} • ${item.product ?? item.inquiry_type ?? "Inquiry"}`,
        timestamp: item.updated_at ?? item.created_at ?? "",
        detail: `${item.company_name ?? item.name ?? "Unknown"} ${item.product ? `for ${item.product}` : ""}`.trim(),
      }));

    return activities;
  }, [inquiries]);

  const recommendations = useMemo(() => getInferenceRecommendations(inquiries), [inquiries]);

  const brokerSnapshot = useMemo(() => {
    const followUpsDueToday = inquiries.filter((item) => normalizeStatusValue(item.status) === "reviewing").length;
    const activeDeals = inquiries.filter((item) => normalizeStatusValue(item.status) !== "closed").length;
    const highPriorityDeals = inquiries.filter((item) => normalizePriorityValue(item.priority) === "high").length;
    const missingDocuments = inquiries.reduce((total, item) => total + getMissingDocumentCount(item), 0);
    const pipelineValue = formatCurrencyValue(inquiries.reduce((total, item) => total + Number(item.target_price ?? 0), 0).toString());

    return {
      activeDeals,
      highPriorityDeals,
      followUpsDueToday,
      missingDocuments,
      pipelineValue,
      averageResponseTime: `${Math.max(1, Math.round(inquiries.length ? inquiries.reduce((sum, item) => sum + (new Date(item.updated_at ?? item.created_at ?? "").getTime() - new Date(item.created_at ?? item.updated_at ?? "").getTime()), 0) / inquiries.length / 3600000 : 1))}h`,
    };
  }, [inquiries]);

  const panelVisible = Boolean(selectedInquiry || panelOpen);
  const documentEntries = useMemo(() => getDocumentEntries(selectedInquiry?.documents_available), [selectedInquiry]);
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

          <div className="grid gap-4 xl:grid-cols-4">
            <div className="rounded-[24px] border border-white/10 bg-[#071A2D]/90 p-5 shadow-[0_12px_40px_rgba(0,0,0,0.32)]">
              <p className="text-sm uppercase tracking-[0.25em] text-slate-400">Today's Priorities</p>
              <div className="mt-4 space-y-3">
                {priorityTasks.length ? (
                  priorityTasks.map((task) => (
                    <div key={task.id} className="rounded-2xl border border-white/10 bg-[#050B16]/70 px-4 py-3">
                      <div className="flex items-center justify-between gap-3">
                        <span className={`inline-flex items-center gap-2 rounded-full px-2.5 py-1 text-xs font-semibold uppercase tracking-[0.2em] ${getPriorityIndicator(task.priority)}`}>
                          <span className="h-2.5 w-2.5 rounded-full bg-current" />
                          {task.priority}
                        </span>
                        <span className="text-xs uppercase tracking-[0.2em] text-slate-500">{task.due}</span>
                      </div>
                      <p className="mt-3 text-sm font-semibold text-white">{task.company}</p>
                      <p className="mt-1 text-sm text-slate-300">{task.action}</p>
                    </div>
                  ))
                ) : (
                  <div className="rounded-2xl border border-white/10 bg-[#050B16]/70 px-4 py-7 text-center text-sm text-slate-400">No priority actions available.</div>
                )}
              </div>
            </div>

            <div className="rounded-[24px] border border-white/10 bg-[#071A2D]/90 p-5 shadow-[0_12px_40px_rgba(0,0,0,0.32)]">
              <p className="text-sm uppercase tracking-[0.25em] text-slate-400">Recent Activity</p>
              <div className="mt-4 space-y-3">
                {recentActivity.length ? (
                  recentActivity.map((activity) => (
                    <div key={activity.id} className="rounded-2xl border border-white/10 bg-[#050B16]/70 px-4 py-3">
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-sm font-semibold text-white">{activity.label}</p>
                        <span className="text-xs uppercase tracking-[0.2em] text-slate-500">{getRelativeTime(activity.timestamp)}</span>
                      </div>
                      <p className="mt-2 text-sm text-slate-300">{activity.detail}</p>
                    </div>
                  ))
                ) : (
                  <div className="rounded-2xl border border-white/10 bg-[#050B16]/70 px-4 py-7 text-center text-sm text-slate-400">No recent activity yet.</div>
                )}
              </div>
            </div>

            <div className="rounded-[24px] border border-white/10 bg-[#071A2D]/90 p-5 shadow-[0_12px_40px_rgba(0,0,0,0.32)]">
              <p className="text-sm uppercase tracking-[0.25em] text-slate-400">AI Recommendations</p>
              <div className="mt-4 space-y-3">
                {recommendations.map((recommendation) => (
                  <div key={recommendation} className="rounded-2xl border border-white/10 bg-[#050B16]/70 px-4 py-4">
                    <p className="text-sm font-semibold text-white">{recommendation}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-[24px] border border-white/10 bg-[#071A2D]/90 p-5 shadow-[0_12px_40px_rgba(0,0,0,0.32)]">
              <p className="text-sm uppercase tracking-[0.25em] text-slate-400">Broker Snapshot</p>
              <div className="mt-4 grid gap-3">
                {[
                  { label: "Active Deals", value: brokerSnapshot.activeDeals },
                  { label: "High Priority Deals", value: brokerSnapshot.highPriorityDeals },
                  { label: "Follow-Ups Due Today", value: brokerSnapshot.followUpsDueToday },
                  { label: "Missing Documents", value: brokerSnapshot.missingDocuments },
                  { label: "Pipeline Value", value: brokerSnapshot.pipelineValue },
                  { label: "Average Response Time", value: brokerSnapshot.averageResponseTime },
                ].map((item) => (
                  <div key={item.label} className="rounded-2xl border border-white/10 bg-[#050B16]/70 px-4 py-3">
                    <p className="text-xs uppercase tracking-[0.2em] text-slate-500">{item.label}</p>
                    <p className="mt-2 text-2xl font-semibold text-white">{item.value}</p>
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
                    <th className="px-3 py-2 font-medium">Created</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredInquiries.map((item) => {
                    const statusClass = statusStyles[normalizeStatusValue(item.status)] ?? statusStyles.new;

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
