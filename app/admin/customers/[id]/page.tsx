import Link from "next/link";
import { notFound } from "next/navigation";
import { getInquiryByIdServer, getInquiryHistory, getBrokersServer, getCompaniesServer, getProjectsServer } from "@/lib/supabase-server";
import { formatProjectStageLabel, projectStageStyles } from "@/lib/project-helpers";
import {
  formatValue,
  formatDate,
  formatStatusLabel,
  formatCurrencyValue,
  formatHistoryField,
  getDocumentEntries,
  getTrustRiskTone,
  getVerificationBadges,
  computeCommercialIntelligence,
  computeTrustProfile,
  badgeStatusStyles,
} from "@/lib/inquiry-helpers";
import CustomerWorkflowForm from "./workflow-form";
import DocumentUploader from "../../_components/document-uploader";

export default async function CustomerDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const inquiry = await getInquiryByIdServer(id);

  if (!inquiry) {
    notFound();
  }

  const [history, brokers, companies, projects] = await Promise.all([
    getInquiryHistory(id),
    getBrokersServer().catch(() => []),
    getCompaniesServer().catch(() => []),
    getProjectsServer().catch(() => []),
  ]);
  const matchedCompany = inquiry.company_name
    ? companies.find((company) => company.name.trim().toLowerCase() === inquiry.company_name!.trim().toLowerCase())
    : undefined;
  const relatedProjects = projects.filter((project) => project.inquiry_id === id);
  const trustProfile = computeTrustProfile(inquiry);
  const commercialIntelligence = computeCommercialIntelligence(inquiry);
  const documentEntries = getDocumentEntries(inquiry.documents_available);
  const verificationBadges = getVerificationBadges(inquiry);

  const timelineEntries = [
    { label: "Inquiry Submitted", value: inquiry.created_at },
    { label: "Assigned", value: inquiry.updated_at },
    { label: "Reviewed", value: inquiry.reviewed_at },
    { label: "Qualified", value: inquiry.qualified_at },
    { label: "Matched", value: inquiry.matched_at },
    { label: "Closed", value: inquiry.closed_at },
    { label: "Last Updated", value: inquiry.updated_at ?? inquiry.created_at },
  ];

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(200,162,77,0.13),_transparent_28%),linear-gradient(135deg,_#03070D_0%,_#071A2D_65%,_#02060D_100%)] px-4 py-8 text-slate-100 sm:px-6 lg:px-8">
      <div className="mx-auto flex max-w-5xl flex-col gap-6">
        <div>
          <Link
            href="/admin"
            className="inline-flex items-center gap-2 text-sm font-medium text-slate-400 transition hover:text-white"
          >
            ← Back to dashboard
          </Link>
        </div>

        <header className="rounded-[28px] border border-white/10 bg-[#050B16]/90 p-6 shadow-[0_20px_80px_rgba(0,0,0,0.5)] backdrop-blur">
          <p className="text-sm uppercase tracking-[0.3em] text-[#C8A24D]">Customer Profile</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-white sm:text-4xl">
            {formatValue(inquiry.contact_name ?? inquiry.name)}
          </h1>
          <p className="mt-1 text-sm text-slate-400">{formatValue(inquiry.company_name)}</p>
          <p className="mt-3 text-xs uppercase tracking-[0.2em] text-slate-500">
            Status: {formatStatusLabel(inquiry.status)}
          </p>
        </header>

        <div className="space-y-4">
          <div className="rounded-[24px] border border-white/10 bg-[#071A2D]/90 p-4">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm uppercase tracking-[0.25em] text-slate-400">Company Information</p>
              {matchedCompany ? (
                <Link
                  href={`/admin/companies/${matchedCompany.id}`}
                  className="rounded-full border border-[#C8A24D]/35 bg-[#C8A24D]/12 px-3 py-1.5 text-xs font-medium uppercase tracking-[0.15em] text-[#F0D38A] transition hover:bg-[#C8A24D]/20"
                >
                  View Company Profile
                </Link>
              ) : null}
            </div>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              {[
                ["Company Name", inquiry.company_name],
                ["Company Registration", inquiry.company_registration_number],
                ["Company Website", inquiry.company_website],
                ["Country", inquiry.country],
                ["Verification Status", inquiry.verification_status],
                ["Role Type", inquiry.role_type],
              ].map(([label, value]) => (
                <div key={label}>
                  <p className="text-xs uppercase tracking-[0.2em] text-slate-500">{label}</p>
                  <p className="mt-1 text-sm text-slate-200">{formatValue(value as string | null | undefined)}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-[24px] border border-white/10 bg-[#071A2D]/90 p-4">
            <p className="text-sm uppercase tracking-[0.25em] text-slate-400">
              Related Projects ({relatedProjects.length})
            </p>
            {relatedProjects.length === 0 ? (
              <p className="mt-3 text-sm text-slate-500">No pipeline project has been created for this inquiry yet.</p>
            ) : (
              <div className="mt-3 space-y-2">
                {relatedProjects.map((project) => (
                  <Link
                    key={project.id}
                    href={`/admin/projects/${project.id}`}
                    className="flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-[#050B16]/70 px-4 py-3 transition hover:border-[#C8A24D]/40"
                  >
                    <p className="text-sm font-medium text-white">{project.name}</p>
                    <span className={`shrink-0 rounded-full border px-2.5 py-1 text-[10px] uppercase tracking-[0.2em] ${projectStageStyles[project.stage]}`}>
                      {formatProjectStageLabel(project.stage)}
                    </span>
                  </Link>
                ))}
              </div>
            )}
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
          </div>

          <div className="rounded-[24px] border border-white/10 bg-[#071A2D]/90 p-4">
            <p className="text-sm uppercase tracking-[0.25em] text-slate-400">Primary Contact</p>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              {[
                ["Full Name", inquiry.contact_name],
                ["Email", inquiry.email],
                ["Phone", inquiry.phone],
                ["WhatsApp", inquiry.whatsapp],
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
                    {inquiry.quantity && inquiry.unit ? `${inquiry.quantity} ${inquiry.unit}` : "Quantity not specified"}
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
                    {inquiry.destination_country ?? inquiry.country ?? "Destination unspecified"}
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
                ["Inquiry Type", inquiry.inquiry_type],
                ["Product", inquiry.product],
                ["Loading Port", inquiry.loading_port],
                ["Quantity", inquiry.quantity],
                ["Unit", inquiry.unit],
                ["Destination Port", inquiry.destination_port],
                ["Destination Country", inquiry.destination_country],
                ["Delivery Frequency", inquiry.delivery_frequency],
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
                ["Payment Terms", inquiry.payment_method],
                ["Incoterms", inquiry.incoterms],
                ["Target Price", inquiry.target_price],
                ["Currency", inquiry.currency],
                ["Shipping Method", inquiry.shipping_method],
                ["Contract Length", inquiry.contract_length],
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

          <DocumentUploader entityType="inquiry" entityId={String(inquiry.id)} />

          <div className="rounded-[24px] border border-white/10 bg-[#071A2D]/90 p-4">
            <p className="text-sm uppercase tracking-[0.25em] text-slate-400">Special Instructions</p>
            <p className="mt-3 whitespace-pre-wrap text-sm text-slate-200">{formatValue(inquiry.special_instructions)}</p>
          </div>

          <CustomerWorkflowForm inquiry={inquiry} brokerNames={brokers.map((broker) => broker.name)} />

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

          <div className="rounded-[24px] border border-white/10 bg-[#071A2D]/90 p-4">
            <p className="text-sm uppercase tracking-[0.25em] text-slate-400">Audit History</p>
            {history.length === 0 ? (
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
    </main>
  );
}
