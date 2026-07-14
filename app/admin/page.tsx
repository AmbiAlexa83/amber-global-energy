"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  type HistoryRecord,
  type InquiryRecord,
  type InquiryDraft,
  statusStyles,
  badgeStatusStyles,
  statusOptions,
  priorityOptions,
  CLOSED_STATUSES,
  formatValue,
  formatDate,
  normalizeStatusValue,
  normalizePriorityValue,
  formatStatusLabel,
  isHighPriority,
  getRelativeTime,
  parseDocumentAction,
  formatCurrencyValue,
  parseCurrencyValue,
  getMissingDocumentCount,
  getReadinessScore,
  getReadinessBand,
  getInferenceRecommendations,
  getDocumentEntries,
  getTrustRiskTone,
  getVerificationBadges,
  formatHistoryField,
  toDateTimeLocal,
  computeCommercialIntelligence,
  computeTrustProfile,
} from "@/lib/inquiry-helpers";

export default function AdminPage() {
  const [inquiries, setInquiries] = useState<InquiryRecord[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [priorityFilter, setPriorityFilter] = useState("");
  const [productFilter, setProductFilter] = useState("");
  const [inquiryTypeFilter, setInquiryTypeFilter] = useState("");
  const [countryFilter, setCountryFilter] = useState("");
  const [sortOrder, setSortOrder] = useState("newest");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedInquiry, setSelectedInquiry] = useState<InquiryRecord | null>(null);
  const [draft, setDraft] = useState<InquiryDraft | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [panelOpen, setPanelOpen] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const [trustExpanded, setTrustExpanded] = useState(false);
  const [history, setHistory] = useState<HistoryRecord[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [brokerNames, setBrokerNames] = useState<string[]>([]);

  useEffect(() => {
    let isActive = true;

    const loadBrokers = async () => {
      try {
        const response = await fetch("/api/admin/brokers", { cache: "no-store" });
        const payload = await response.json();
        if (isActive && response.ok) {
          setBrokerNames((payload.data ?? []).map((broker: { name: string }) => broker.name));
        }
      } catch {
        // broker autocomplete is non-critical
      }
    };

    loadBrokers();
    return () => { isActive = false; };
  }, []);

  useEffect(() => {
    let isActive = true;

    const loadInquiries = async () => {
      try {
        setLoading(true);
        setError("");

        const response = await fetch("/api/admin/inquiries", {
          method: "GET",
          cache: "no-store",
          headers: { "Content-Type": "application/json" },
        });

        const payload = await response.json();

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
    return () => { isActive = false; };
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
      notes: selectedInquiry.notes ?? "",
      last_contacted_at: toDateTimeLocal(selectedInquiry.last_contacted_at),
    });
  }, [selectedInquiry]);

  const filterOptions = useMemo(() => {
    const products = [...new Set(inquiries.map((item) => item.product).filter(Boolean) as string[])].sort();
    const inquiryTypes = [...new Set(inquiries.map((item) => item.inquiry_type).filter(Boolean) as string[])].sort();
    const countries = [...new Set(inquiries.map((item) => item.country).filter(Boolean) as string[])].sort();
    return { products, inquiryTypes, countries };
  }, [inquiries]);

  const filteredInquiries = useMemo(() => {
    let result = inquiries;

    const normalizedSearch = search.trim().toLowerCase();
    if (normalizedSearch) {
      result = result.filter((item) => {
        const values = [item.name, item.company_name, item.contact_name, item.email, item.inquiry_type, item.product, item.country, item.status, item.priority]
          .filter(Boolean).join(" ").toLowerCase();
        return values.includes(normalizedSearch);
      });
    }

    if (statusFilter) result = result.filter((item) => normalizeStatusValue(item.status) === statusFilter);
    if (priorityFilter) result = result.filter((item) => normalizePriorityValue(item.priority) === priorityFilter);
    if (productFilter) result = result.filter((item) => (item.product ?? "").toLowerCase() === productFilter);
    if (inquiryTypeFilter) result = result.filter((item) => (item.inquiry_type ?? "").toLowerCase() === inquiryTypeFilter);
    if (countryFilter) result = result.filter((item) => (item.country ?? "").toLowerCase() === countryFilter);

    return [...result].sort((a, b) => {
      if (sortOrder === "oldest") return new Date(a.created_at ?? 0).getTime() - new Date(b.created_at ?? 0).getTime();
      if (sortOrder === "priority") {
        const rank = { urgent: 4, high: 3, normal: 2, low: 1 };
        const aPri = rank[normalizePriorityValue(a.priority) as keyof typeof rank] ?? 2;
        const bPri = rank[normalizePriorityValue(b.priority) as keyof typeof rank] ?? 2;
        return bPri - aPri;
      }
      if (sortOrder === "status") {
        const rank: Record<string, number> = { new: 9, "under review": 8, contacted: 7, negotiating: 6, matched: 5, "documents requested": 4, "compliance review": 3, "closed won": 2, "closed lost": 1 };
        return (rank[normalizeStatusValue(b.status)] ?? 9) - (rank[normalizeStatusValue(a.status)] ?? 9);
      }
      return new Date(b.created_at ?? 0).getTime() - new Date(a.created_at ?? 0).getTime();
    });
  }, [inquiries, search, statusFilter, priorityFilter, productFilter, inquiryTypeFilter, countryFilter, sortOrder]);

  const totals = useMemo(() => {
    const total = inquiries.length;
    const newCount = inquiries.filter((item) => normalizeStatusValue(item.status) === "new").length;
    const highPriorityCount = inquiries.filter(isHighPriority).length;
    const closedCount = inquiries.filter((item) => CLOSED_STATUSES.has(normalizeStatusValue(item.status))).length;
    return { total, newCount, highPriorityCount, closedCount };
  }, [inquiries]);

  const loadHistory = async (id: string | number) => {
    setHistoryLoading(true);
    setHistory([]);
    try {
      const response = await fetch(`/api/admin/inquiries/history?id=${encodeURIComponent(String(id))}`, { cache: "no-store" });
      const payload = await response.json();
      if (response.ok) setHistory(payload.data ?? []);
    } catch {
      // history is non-critical
    } finally {
      setHistoryLoading(false);
    }
  };

  const openInquiry = (inquiry: InquiryRecord) => {
    setSelectedInquiry(inquiry);
    setPanelOpen(true);
    setIsClosing(false);
    setSaveError("");
    if (inquiry.id) loadHistory(inquiry.id);
  };

  const closeInquiry = () => {
    setIsClosing(true);
    window.setTimeout(() => {
      setSelectedInquiry(null);
      setDraft(null);
      setSaveError("");
      setPanelOpen(false);
      setIsClosing(false);
      setHistory([]);
    }, 220);
  };

  const updateDraftField = <K extends keyof InquiryDraft>(field: K, value: InquiryDraft[K]) => {
    setDraft((current) => (current ? { ...current, [field]: value } : current));
  };

  const saveInquiry = async () => {
    if (!selectedInquiry?.id || !draft) return;

    try {
      setSaving(true);
      setSaveError("");

      const response = await fetch("/api/admin/inquiries", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: selectedInquiry.id,
          status: draft.status,
          priority: draft.priority,
          assigned_broker: draft.assigned_broker,
          broker_notes: draft.broker_notes,
          notes: draft.notes,
          last_contacted_at: draft.last_contacted_at || null,
        }),
      });

      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error ?? "Unable to save inquiry updates.");

      const updatedInquiry = payload.data ?? {
        ...selectedInquiry,
        status: draft.status,
        priority: draft.priority,
        assigned_broker: draft.assigned_broker,
        broker_notes: draft.broker_notes,
        notes: draft.notes,
        last_contacted_at: draft.last_contacted_at || null,
      };

      setInquiries((current) => current.map((item) => (item.id === selectedInquiry.id ? { ...item, ...updatedInquiry } : item)));
      setSelectedInquiry(updatedInquiry);
      await loadHistory(selectedInquiry.id);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unable to save inquiry updates.";
      setSaveError(message);
    } finally {
      setSaving(false);
    }
  };

  const resetFilters = () => {
    setStatusFilter("");
    setPriorityFilter("");
    setProductFilter("");
    setInquiryTypeFilter("");
    setCountryFilter("");
    setSortOrder("newest");
  };

  const hasActiveFilters = Boolean(statusFilter || priorityFilter || productFilter || inquiryTypeFilter || countryFilter || sortOrder !== "newest");

  const priorityTasks = useMemo(() => {
    return inquiries
      .filter((item) => isHighPriority(item) || normalizeStatusValue(item.status) === "under review")
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
        const p = normalizePriorityValue(item.priority);
        const s = normalizeStatusValue(item.status);
        const priorityWeight = p === "urgent" ? 4 : p === "high" ? 3 : p === "normal" ? 2 : 1;
        const statusWeight = s === "under review" ? 3 : s === "documents requested" ? 2 : 1;
        const urgencyScore = priorityWeight * 18 + missingDocuments * 8 + Math.min(waitingHours / 4, 20) + statusWeight * 7;
        return { ...item, urgencyScore, readinessScore: getReadinessScore(item) };
      })
      .sort((a, b) => b.urgencyScore - a.urgencyScore)
      .slice(0, 5);
  }, [inquiries]);

  const brokerSnapshot = useMemo(() => {
    const followUpsDueToday = inquiries.filter((item) => normalizeStatusValue(item.status) === "under review").length;
    const activeDeals = inquiries.filter((item) => !CLOSED_STATUSES.has(normalizeStatusValue(item.status))).length;
    const highPriorityDeals = inquiries.filter((item) => {
      const p = normalizePriorityValue(item.priority);
      return p === "high" || p === "urgent";
    }).length;
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
    const uncontactedHighPriority = inquiries.filter((item) => {
      const p = normalizePriorityValue(item.priority);
      return (p === "high" || p === "urgent") && !item.assigned_broker && !CLOSED_STATUSES.has(normalizeStatusValue(item.status));
    }).length;

    return [
      { title: "Deal readiness", detail: `${readyForIntroduction} inquiry${readyForIntroduction === 1 ? "" : "ies"} are ready for buyer introduction.` },
      { title: "Pipeline outlook", detail: `Estimated pipeline exceeds ${formatCurrencyValue(pipelineValue)}.` },
      { title: "Follow-up gap", detail: `${uncontactedHighPriority} high priority inquiry${uncontactedHighPriority === 1 ? "" : "ies"} have not been contacted.` },
      { title: "Response efficiency", detail: `Average broker response time is tracking at ${brokerSnapshot.averageResponseTime}.` },
    ];
  }, [brokerSnapshot.averageResponseTime, inquiries]);

  const panelVisible = Boolean(selectedInquiry || panelOpen);

  const commercialIntelligence = useMemo(() => computeCommercialIntelligence(selectedInquiry), [selectedInquiry]);

  const documentEntries = useMemo(() => getDocumentEntries(selectedInquiry?.documents_available), [selectedInquiry]);
  const verificationBadges = useMemo(() => (selectedInquiry ? getVerificationBadges(selectedInquiry) : []), [selectedInquiry]);

  const trustProfile = useMemo(() => computeTrustProfile(selectedInquiry), [selectedInquiry]);

  const timelineEntries = [
    { label: "Inquiry Submitted", value: selectedInquiry?.created_at },
    { label: "Assigned", value: selectedInquiry?.updated_at },
    { label: "Reviewed", value: selectedInquiry?.reviewed_at },
    { label: "Qualified", value: selectedInquiry?.qualified_at },
    { label: "Matched", value: selectedInquiry?.matched_at },
    { label: "Closed", value: selectedInquiry?.closed_at },
    { label: "Last Updated", value: selectedInquiry?.updated_at ?? selectedInquiry?.created_at },
  ];

  const selectClass = "w-full rounded-xl border border-white/10 bg-[#071A2D] px-3 py-2.5 text-sm text-white outline-none transition focus:border-[#C8A24D] focus:ring-2 focus:ring-[#C8A24D]/30 [&>option]:bg-[#050B16]";

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
            <div className="flex items-center gap-3">
              <Link
                href="/admin/calendar"
                className="rounded-2xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm font-medium text-slate-300 transition-colors hover:border-white/20 hover:bg-white/10 hover:text-white"
              >
                Calendar
              </Link>
              <Link
                href="/admin/activity"
                className="rounded-2xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm font-medium text-slate-300 transition-colors hover:border-white/20 hover:bg-white/10 hover:text-white"
              >
                Activity
              </Link>
              <Link
                href="/admin/users"
                className="rounded-2xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm font-medium text-slate-300 transition-colors hover:border-white/20 hover:bg-white/10 hover:text-white"
              >
                Team
              </Link>
              <Link
                href="/admin/search"
                className="rounded-2xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm font-medium text-slate-300 transition-colors hover:border-white/20 hover:bg-white/10 hover:text-white"
              >
                Search
              </Link>
              <Link
                href="/admin/analytics"
                className="rounded-2xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm font-medium text-slate-300 transition-colors hover:border-white/20 hover:bg-white/10 hover:text-white"
              >
                Analytics
              </Link>
              <Link
                href="/admin/contracts"
                className="rounded-2xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm font-medium text-slate-300 transition-colors hover:border-white/20 hover:bg-white/10 hover:text-white"
              >
                Contracts
              </Link>
              <Link
                href="/admin/projects"
                className="rounded-2xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm font-medium text-slate-300 transition-colors hover:border-white/20 hover:bg-white/10 hover:text-white"
              >
                Projects
              </Link>
              <Link
                href="/admin/companies"
                className="rounded-2xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm font-medium text-slate-300 transition-colors hover:border-white/20 hover:bg-white/10 hover:text-white"
              >
                Companies
              </Link>
              <Link
                href="/admin/brokers"
                className="rounded-2xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm font-medium text-slate-300 transition-colors hover:border-white/20 hover:bg-white/10 hover:text-white"
              >
                Brokers
              </Link>
              <a
                href="/admin/logout"
                aria-label="Log out of the admin dashboard"
                className="rounded-2xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm font-medium text-slate-300 transition-colors hover:border-white/20 hover:bg-white/10 hover:text-white"
              >
                Log out
              </a>
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
              <p className="mt-1 text-sm text-slate-400">Broker command center for the desk's highest priority actions and live operations insight.</p>
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
                          <span className={`rounded-full px-2.5 py-1 text-[10px] uppercase tracking-[0.2em] ${normalizePriorityValue(item.priority) === "urgent" || normalizePriorityValue(item.priority) === "high" ? "bg-rose-500/15 text-rose-200" : normalizePriorityValue(item.priority) === "normal" ? "bg-[#C8A24D]/15 text-[#F0D38A]" : "bg-emerald-500/15 text-emerald-200"}`}>
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
          <div className="mb-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-xl font-semibold text-white">Inquiry pipeline</h2>
                <p className="mt-1 text-sm text-slate-400">Monitor all inbound trade opportunities and their current workflow state.</p>
              </div>
              <label className="w-full sm:w-72">
                <span className="mb-2 block text-sm text-slate-400">Search inquiries</span>
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search by company, contact, product..."
                  className="w-full rounded-xl border border-white/10 bg-[#071A2D] px-4 py-3 text-sm text-white outline-none transition focus:border-[#C8A24D] focus:ring-2 focus:ring-[#C8A24D]/30"
                />
              </label>
            </div>

            <div className="mt-3 flex flex-wrap items-end gap-2">
              <div className="flex-1 min-w-[140px]">
                <label>
                  <span className="mb-1 block text-xs uppercase tracking-[0.2em] text-slate-500">Status</span>
                  <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className={selectClass}>
                    <option value="">All Statuses</option>
                    {statusOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                </label>
              </div>
              <div className="flex-1 min-w-[120px]">
                <label>
                  <span className="mb-1 block text-xs uppercase tracking-[0.2em] text-slate-500">Priority</span>
                  <select value={priorityFilter} onChange={(e) => setPriorityFilter(e.target.value)} className={selectClass}>
                    <option value="">All Priorities</option>
                    {priorityOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                </label>
              </div>
              <div className="flex-1 min-w-[140px]">
                <label>
                  <span className="mb-1 block text-xs uppercase tracking-[0.2em] text-slate-500">Product</span>
                  <select value={productFilter} onChange={(e) => setProductFilter(e.target.value)} className={selectClass}>
                    <option value="">All Products</option>
                    {filterOptions.products.map((p) => <option key={p} value={p.toLowerCase()}>{p}</option>)}
                  </select>
                </label>
              </div>
              <div className="flex-1 min-w-[140px]">
                <label>
                  <span className="mb-1 block text-xs uppercase tracking-[0.2em] text-slate-500">Inquiry Type</span>
                  <select value={inquiryTypeFilter} onChange={(e) => setInquiryTypeFilter(e.target.value)} className={selectClass}>
                    <option value="">All Types</option>
                    {filterOptions.inquiryTypes.map((t) => <option key={t} value={t.toLowerCase()}>{t}</option>)}
                  </select>
                </label>
              </div>
              <div className="flex-1 min-w-[130px]">
                <label>
                  <span className="mb-1 block text-xs uppercase tracking-[0.2em] text-slate-500">Country</span>
                  <select value={countryFilter} onChange={(e) => setCountryFilter(e.target.value)} className={selectClass}>
                    <option value="">All Countries</option>
                    {filterOptions.countries.map((c) => <option key={c} value={c.toLowerCase()}>{c}</option>)}
                  </select>
                </label>
              </div>
              <div className="flex-1 min-w-[120px]">
                <label>
                  <span className="mb-1 block text-xs uppercase tracking-[0.2em] text-slate-500">Sort By</span>
                  <select value={sortOrder} onChange={(e) => setSortOrder(e.target.value)} className={selectClass}>
                    <option value="newest">Newest</option>
                    <option value="oldest">Oldest</option>
                    <option value="priority">Priority</option>
                    <option value="status">Status</option>
                  </select>
                </label>
              </div>
              {hasActiveFilters && (
                <button
                  type="button"
                  onClick={resetFilters}
                  className="rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-xs font-medium text-slate-400 transition hover:border-white/20 hover:text-white"
                >
                  Reset
                </button>
              )}
            </div>
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
              No inquiries match the current filters.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full border-separate border-spacing-y-2 text-left text-sm">
                <thead>
                  <tr className="text-slate-400">
                    <th className="px-3 py-2 font-medium">Company</th>
                    <th className="px-3 py-2 font-medium">Contact</th>
                    <th className="px-3 py-2 font-medium">Product</th>
                    <th className="px-3 py-2 font-medium">Type</th>
                    <th className="px-3 py-2 font-medium">Status</th>
                    <th className="px-3 py-2 font-medium">Priority</th>
                    <th className="px-3 py-2 font-medium">Broker</th>
                    <th className="px-3 py-2 font-medium">Created</th>
                    <th className="px-3 py-2 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredInquiries.map((item) => {
                    const statusClass = statusStyles[normalizeStatusValue(item.status)] ?? statusStyles.new;
                    const p = normalizePriorityValue(item.priority);

                    return (
                      <tr
                        key={item.id ?? `${item.email}-${item.created_at}`}
                        className="rounded-2xl bg-[#071A2D]/80 text-slate-300"
                      >
                        <td className="rounded-l-2xl px-3 py-3 font-medium text-white">{formatValue(item.company_name)}</td>
                        <td className="px-3 py-3">{formatValue(item.contact_name ?? item.name)}</td>
                        <td className="px-3 py-3">{formatValue(item.product)}</td>
                        <td className="px-3 py-3">{formatValue(item.inquiry_type)}</td>
                        <td className="px-3 py-3">
                          <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs uppercase tracking-[0.2em] ${statusClass}`}>
                            {formatStatusLabel(item.status)}
                          </span>
                        </td>
                        <td className="px-3 py-3">
                          <span className={`inline-flex rounded-full px-2.5 py-1 text-[10px] uppercase tracking-[0.2em] ${p === "urgent" ? "bg-red-500/15 text-red-200" : p === "high" ? "bg-rose-500/15 text-rose-200" : p === "normal" ? "bg-[#C8A24D]/15 text-[#F0D38A]" : "bg-emerald-500/15 text-emerald-200"}`}>
                            {p}
                          </span>
                        </td>
                        <td className="px-3 py-3 text-slate-400">{formatValue(item.assigned_broker)}</td>
                        <td className="px-3 py-3 text-slate-400">{formatDate(item.created_at)}</td>
                        <td className="rounded-r-2xl px-3 py-3">
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => openInquiry(item)}
                              className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium text-slate-300 transition hover:border-[#C8A24D]/40 hover:text-white"
                            >
                              Open
                            </button>
                            {item.id ? (
                              <Link
                                href={`/admin/customers/${item.id}`}
                                className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium text-slate-300 transition hover:border-[#C8A24D]/40 hover:text-white"
                              >
                                Profile
                              </Link>
                            ) : null}
                          </div>
                        </td>
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
              <div className="flex items-center gap-2">
                {selectedInquiry?.id ? (
                  <Link
                    href={`/admin/customers/${selectedInquiry.id}`}
                    className="rounded-full border border-[#C8A24D]/35 bg-[#C8A24D]/12 px-3 py-2 text-xs font-medium uppercase tracking-[0.15em] text-[#F0D38A] transition hover:bg-[#C8A24D]/20"
                  >
                    View Full Profile
                  </Link>
                ) : null}
                <button
                  type="button"
                  onClick={closeInquiry}
                  className="rounded-full border border-white/10 bg-[#071A2D] px-3 py-2 text-sm text-slate-300 transition hover:border-[#C8A24D]/40 hover:text-white"
                >
                  ×
                </button>
              </div>
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
                    <div className="grid grid-cols-2 gap-2">
                      {verificationBadges.map((badge) => (
                        <div key={badge.label} className="flex items-center justify-between gap-2 rounded-2xl border border-white/10 bg-[#050B16]/70 px-3 py-2.5">
                          <p className="text-[11px] leading-snug text-slate-300">{badge.label}</p>
                          <span className={`shrink-0 rounded-full border px-2 py-0.5 text-[9px] uppercase tracking-[0.15em] ${badgeStatusStyles[badge.status]}`}>
                            {badge.status}
                          </span>
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
                        value={draft?.priority ?? "normal"}
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
                      list="broker-roster-options"
                      className="w-full rounded-xl border border-white/10 bg-[#050B16] px-4 py-3 text-sm text-white outline-none transition focus:border-[#C8A24D] focus:ring-2 focus:ring-[#C8A24D]/30"
                    />
                    <datalist id="broker-roster-options">
                      {brokerNames.map((name) => (
                        <option key={name} value={name} />
                      ))}
                    </datalist>
                  </label>

                  <label>
                    <span className="mb-2 block text-xs uppercase tracking-[0.2em] text-slate-500">Last Contacted</span>
                    <input
                      type="datetime-local"
                      value={draft?.last_contacted_at ?? ""}
                      onChange={(event) => updateDraftField("last_contacted_at", event.target.value)}
                      className="w-full rounded-xl border border-white/10 bg-[#050B16] px-4 py-3 text-sm text-white outline-none transition focus:border-[#C8A24D] focus:ring-2 focus:ring-[#C8A24D]/30 [color-scheme:dark]"
                    />
                  </label>

                  <label>
                    <span className="mb-2 block text-xs uppercase tracking-[0.2em] text-slate-500">Internal Notes</span>
                    <textarea
                      value={draft?.notes ?? ""}
                      onChange={(event) => updateDraftField("notes", event.target.value)}
                      rows={4}
                      placeholder="Add internal CRM notes for this inquiry..."
                      className="w-full rounded-xl border border-white/10 bg-[#050B16] px-4 py-3 text-sm text-white outline-none transition focus:border-[#C8A24D] focus:ring-2 focus:ring-[#C8A24D]/30"
                    />
                  </label>

                  <label>
                    <span className="mb-2 block text-xs uppercase tracking-[0.2em] text-slate-500">Internal Broker Notes</span>
                    <textarea
                      value={draft?.broker_notes ?? ""}
                      onChange={(event) => updateDraftField("broker_notes", event.target.value)}
                      rows={5}
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

              <div className="rounded-[24px] border border-white/10 bg-[#071A2D]/90 p-4">
                <p className="text-sm uppercase tracking-[0.25em] text-slate-400">Audit History</p>
                {historyLoading ? (
                  <p className="mt-3 text-sm text-slate-400">Loading history...</p>
                ) : history.length === 0 ? (
                  <p className="mt-3 text-sm text-slate-500">No changes recorded yet.</p>
                ) : (
                  <div className="mt-3 space-y-2">
                    {history.map((entry) => (
                      <div key={entry.id} className="rounded-2xl border border-white/10 bg-[#050B16]/70 px-4 py-3">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="text-sm font-medium text-white">{formatHistoryField(entry.field_changed)}</p>
                            <p className="mt-0.5 text-xs text-slate-400">
                              {entry.old_value ?? "—"} → {entry.new_value ?? "—"}
                            </p>
                          </div>
                          <span className="shrink-0 text-xs uppercase tracking-[0.2em] text-slate-500">{formatDate(entry.changed_at)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </main>
  );
}
