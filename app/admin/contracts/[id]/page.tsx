import Link from "next/link";
import { notFound } from "next/navigation";
import {
  getContractByIdServer,
  getCompaniesServer,
  getProjectsServer,
  getBrokersServer,
} from "@/lib/supabase-server";
import { formatContractStatusLabel, contractStatusStyles } from "@/lib/contract-helpers";
import ContractForm from "./contract-form";
import DocumentUploader from "../../_components/document-uploader";
import EmailTimeline from "../../_components/email-timeline";
import ReminderList from "../../_components/reminder-list";

export default async function ContractDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const contract = await getContractByIdServer(id);

  if (!contract) {
    notFound();
  }

  const [companies, projects, brokers] = await Promise.all([
    getCompaniesServer().catch(() => []),
    getProjectsServer().catch(() => []),
    getBrokersServer().catch(() => []),
  ]);

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(200,162,77,0.13),_transparent_28%),linear-gradient(135deg,_#03070D_0%,_#071A2D_65%,_#02060D_100%)] px-4 py-8 text-slate-100 sm:px-6 lg:px-8">
      <div className="mx-auto flex max-w-5xl flex-col gap-6">
        <div>
          <Link
            href="/admin/contracts"
            className="inline-flex items-center gap-2 text-sm font-medium text-slate-400 transition hover:text-white"
          >
            ← Back to contracts
          </Link>
        </div>

        <header className="rounded-[28px] border border-white/10 bg-[#050B16]/90 p-6 shadow-[0_20px_80px_rgba(0,0,0,0.5)] backdrop-blur">
          <p className="text-sm uppercase tracking-[0.3em] text-[#C8A24D]">Contract Profile</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-white sm:text-4xl">{contract.title}</h1>
          {contract.contract_number ? <p className="mt-1 text-sm text-slate-400">{contract.contract_number}</p> : null}
          <span className={`mt-3 inline-flex rounded-full border px-2.5 py-1 text-xs uppercase tracking-[0.2em] ${contractStatusStyles[contract.status]}`}>
            {formatContractStatusLabel(contract.status)}
          </span>
        </header>

        <div className="space-y-4">
          <ContractForm contract={contract} companies={companies} projects={projects} brokers={brokers} />

          <DocumentUploader entityType="contract" entityId={contract.id} />

          <EmailTimeline entityType="contract" entityId={contract.id} />

          <ReminderList entityType="contract" entityId={contract.id} />

          {contract.company_id ? (
            <Link
              href={`/admin/companies/${contract.company_id}`}
              className="block rounded-[24px] border border-white/10 bg-[#071A2D]/90 p-4 transition hover:border-[#C8A24D]/40"
            >
              <p className="text-sm uppercase tracking-[0.25em] text-slate-400">Linked Company</p>
              <p className="mt-2 text-sm font-medium text-[#F0D38A]">{contract.companies?.name ?? "View company profile"} →</p>
            </Link>
          ) : null}

          {contract.project_id ? (
            <Link
              href={`/admin/projects/${contract.project_id}`}
              className="block rounded-[24px] border border-white/10 bg-[#071A2D]/90 p-4 transition hover:border-[#C8A24D]/40"
            >
              <p className="text-sm uppercase tracking-[0.25em] text-slate-400">Linked Project</p>
              <p className="mt-2 text-sm font-medium text-[#F0D38A]">{contract.projects?.name ?? "View project"} →</p>
            </Link>
          ) : null}
        </div>
      </div>
    </main>
  );
}
