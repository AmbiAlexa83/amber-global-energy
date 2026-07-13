import Link from "next/link";
import { notFound } from "next/navigation";
import { getCompanyByIdServer, getInquiriesServer, getProjectsServer, getContractsServer } from "@/lib/supabase-server";
import { formatValue, formatDate, formatStatusLabel, normalizePriorityValue } from "@/lib/inquiry-helpers";
import { formatProjectStageLabel, projectStageStyles } from "@/lib/project-helpers";
import { formatContractStatusLabel, contractStatusStyles } from "@/lib/contract-helpers";
import CompanyForm from "./company-form";
import DocumentUploader from "../../_components/document-uploader";

export default async function CompanyDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const company = await getCompanyByIdServer(id);

  if (!company) {
    notFound();
  }

  const [inquiries, projects, contracts] = await Promise.all([
    getInquiriesServer().catch(() => []),
    getProjectsServer().catch(() => []),
    getContractsServer().catch(() => []),
  ]);
  const relatedInquiries = inquiries.filter(
    (inquiry) => (inquiry.company_name ?? "").trim().toLowerCase() === company.name.trim().toLowerCase(),
  );
  const relatedProjects = projects.filter((project) => project.company_id === id);
  const relatedContracts = contracts.filter((contract) => contract.company_id === id);

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(200,162,77,0.13),_transparent_28%),linear-gradient(135deg,_#03070D_0%,_#071A2D_65%,_#02060D_100%)] px-4 py-8 text-slate-100 sm:px-6 lg:px-8">
      <div className="mx-auto flex max-w-5xl flex-col gap-6">
        <div>
          <Link
            href="/admin/companies"
            className="inline-flex items-center gap-2 text-sm font-medium text-slate-400 transition hover:text-white"
          >
            ← Back to company directory
          </Link>
        </div>

        <header className="rounded-[28px] border border-white/10 bg-[#050B16]/90 p-6 shadow-[0_20px_80px_rgba(0,0,0,0.5)] backdrop-blur">
          <p className="text-sm uppercase tracking-[0.3em] text-[#C8A24D]">Company Profile</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-white sm:text-4xl">{company.name}</h1>
          <p className="mt-1 text-sm text-slate-400">{formatValue(company.country)}</p>
        </header>

        <div className="space-y-4">
          <CompanyForm company={company} />

          <DocumentUploader entityType="company" entityId={company.id} />

          <div className="rounded-[24px] border border-white/10 bg-[#071A2D]/90 p-4">
            <p className="text-sm uppercase tracking-[0.25em] text-slate-400">
              Related Contracts ({relatedContracts.length})
            </p>
            {relatedContracts.length === 0 ? (
              <p className="mt-3 text-sm text-slate-500">No contracts are linked to this company yet.</p>
            ) : (
              <div className="mt-3 space-y-2">
                {relatedContracts.map((contract) => (
                  <Link
                    key={contract.id}
                    href={`/admin/contracts/${contract.id}`}
                    className="flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-[#050B16]/70 px-4 py-3 transition hover:border-[#C8A24D]/40"
                  >
                    <p className="text-sm font-medium text-white">{contract.title}</p>
                    <span className={`shrink-0 rounded-full border px-2.5 py-1 text-[10px] uppercase tracking-[0.2em] ${contractStatusStyles[contract.status]}`}>
                      {formatContractStatusLabel(contract.status)}
                    </span>
                  </Link>
                ))}
              </div>
            )}
          </div>

          <div className="rounded-[24px] border border-white/10 bg-[#071A2D]/90 p-4">
            <p className="text-sm uppercase tracking-[0.25em] text-slate-400">
              Related Projects ({relatedProjects.length})
            </p>
            {relatedProjects.length === 0 ? (
              <p className="mt-3 text-sm text-slate-500">No pipeline projects are linked to this company yet.</p>
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
            <p className="text-sm uppercase tracking-[0.25em] text-slate-400">
              Related Inquiries ({relatedInquiries.length})
            </p>

            {relatedInquiries.length === 0 ? (
              <p className="mt-3 text-sm text-slate-500">No inquiries are linked to this company yet.</p>
            ) : (
              <div className="mt-3 space-y-2">
                {relatedInquiries.map((inquiry) => (
                  <Link
                    key={inquiry.id}
                    href={`/admin/customers/${inquiry.id}`}
                    className="flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-[#050B16]/70 px-4 py-3 transition hover:border-[#C8A24D]/40"
                  >
                    <div>
                      <p className="text-sm font-medium text-white">{formatValue(inquiry.contact_name ?? inquiry.name)}</p>
                      <p className="mt-0.5 text-xs text-slate-500">
                        {formatStatusLabel(inquiry.status)} • {normalizePriorityValue(inquiry.priority)} priority
                      </p>
                    </div>
                    <span className="shrink-0 text-xs uppercase tracking-[0.2em] text-slate-500">{formatDate(inquiry.created_at)}</span>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
