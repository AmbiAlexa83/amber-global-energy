import Link from "next/link";
import { notFound } from "next/navigation";
import {
  getProjectByIdServer,
  getCompaniesServer,
  getBrokersServer,
  getInquiriesServer,
  getContractsServer,
} from "@/lib/supabase-server";
import { formatProjectStageLabel, projectStageStyles } from "@/lib/project-helpers";
import { formatContractStatusLabel, contractStatusStyles } from "@/lib/contract-helpers";
import ProjectForm from "./project-form";
import DocumentUploader from "../../_components/document-uploader";

export default async function ProjectDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const project = await getProjectByIdServer(id);

  if (!project) {
    notFound();
  }

  const [companies, brokers, inquiries, contracts] = await Promise.all([
    getCompaniesServer().catch(() => []),
    getBrokersServer().catch(() => []),
    getInquiriesServer().catch(() => []),
    getContractsServer().catch(() => []),
  ]);
  const relatedContracts = contracts.filter((contract) => contract.project_id === id);

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(200,162,77,0.13),_transparent_28%),linear-gradient(135deg,_#03070D_0%,_#071A2D_65%,_#02060D_100%)] px-4 py-8 text-slate-100 sm:px-6 lg:px-8">
      <div className="mx-auto flex max-w-5xl flex-col gap-6">
        <div>
          <Link
            href="/admin/projects"
            className="inline-flex items-center gap-2 text-sm font-medium text-slate-400 transition hover:text-white"
          >
            ← Back to pipeline board
          </Link>
        </div>

        <header className="rounded-[28px] border border-white/10 bg-[#050B16]/90 p-6 shadow-[0_20px_80px_rgba(0,0,0,0.5)] backdrop-blur">
          <p className="text-sm uppercase tracking-[0.3em] text-[#C8A24D]">Project Profile</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-white sm:text-4xl">{project.name}</h1>
          <span className={`mt-3 inline-flex rounded-full border px-2.5 py-1 text-xs uppercase tracking-[0.2em] ${projectStageStyles[project.stage]}`}>
            {formatProjectStageLabel(project.stage)}
          </span>
        </header>

        <div className="space-y-4">
          <ProjectForm project={project} companies={companies} brokers={brokers} inquiries={inquiries} />

          <DocumentUploader entityType="project" entityId={project.id} />

          <div className="rounded-[24px] border border-white/10 bg-[#071A2D]/90 p-4">
            <p className="text-sm uppercase tracking-[0.25em] text-slate-400">
              Related Contracts ({relatedContracts.length})
            </p>
            {relatedContracts.length === 0 ? (
              <p className="mt-3 text-sm text-slate-500">No contracts are linked to this project yet.</p>
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

          {project.company_id ? (
            <Link
              href={`/admin/companies/${project.company_id}`}
              className="block rounded-[24px] border border-white/10 bg-[#071A2D]/90 p-4 transition hover:border-[#C8A24D]/40"
            >
              <p className="text-sm uppercase tracking-[0.25em] text-slate-400">Linked Company</p>
              <p className="mt-2 text-sm font-medium text-[#F0D38A]">{project.companies?.name ?? "View company profile"} →</p>
            </Link>
          ) : null}

          {project.inquiry_id ? (
            <Link
              href={`/admin/customers/${project.inquiry_id}`}
              className="block rounded-[24px] border border-white/10 bg-[#071A2D]/90 p-4 transition hover:border-[#C8A24D]/40"
            >
              <p className="text-sm uppercase tracking-[0.25em] text-slate-400">Originating Inquiry</p>
              <p className="mt-2 text-sm font-medium text-[#F0D38A]">
                {project.inquiries?.contact_name ?? project.inquiries?.name ?? "View customer profile"} →
              </p>
            </Link>
          ) : null}
        </div>
      </div>
    </main>
  );
}
