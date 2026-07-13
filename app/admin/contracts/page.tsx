import Link from "next/link";
import { getContractsServer, getCompaniesServer, getProjectsServer, getBrokersServer } from "@/lib/supabase-server";
import { formatCurrencyValue, parseCurrencyValue } from "@/lib/inquiry-helpers";
import { CLOSED_CONTRACT_STATUSES, isContractExpiringSoon } from "@/lib/contract-helpers";
import ContractRoster from "./contract-roster";

// Live admin data (contract roster + summary totals) must never be statically
// prerendered at build time — this route has no dynamic segment to force it,
// the same reasoning as /admin/brokers, /admin/companies, and /admin/projects.
export const dynamic = "force-dynamic";

export default async function ContractsPage() {
  const [contracts, companies, projects, brokers] = await Promise.all([
    getContractsServer(),
    getCompaniesServer().catch(() => []),
    getProjectsServer().catch(() => []),
    getBrokersServer().catch(() => []),
  ]);

  const activeContracts = contracts.filter((contract) => !CLOSED_CONTRACT_STATUSES.has(contract.status));
  const expiringSoon = contracts.filter((contract) => contract.status === "active" && isContractExpiringSoon(contract.end_date));
  const totalValue = activeContracts.reduce((total, contract) => total + parseCurrencyValue(contract.contract_value), 0);

  const summaryCards = [
    { label: "Active Contracts", value: activeContracts.length, tone: "text-white" },
    { label: "Total Contract Value", value: formatCurrencyValue(totalValue), tone: "text-[#F0D38A]" },
    { label: "Expiring Within 30 Days", value: expiringSoon.length, tone: "text-rose-200" },
    { label: "Draft Contracts", value: contracts.filter((contract) => contract.status === "draft").length, tone: "text-slate-300" },
  ];

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(200,162,77,0.13),_transparent_28%),linear-gradient(135deg,_#03070D_0%,_#071A2D_65%,_#02060D_100%)] px-4 py-8 text-slate-100 sm:px-6 lg:px-8">
      <div className="mx-auto flex max-w-7xl flex-col gap-6">
        <div>
          <Link
            href="/admin"
            className="inline-flex items-center gap-2 text-sm font-medium text-slate-400 transition hover:text-white"
          >
            ← Back to dashboard
          </Link>
        </div>

        <header className="rounded-[28px] border border-white/10 bg-[#050B16]/90 p-6 shadow-[0_20px_80px_rgba(0,0,0,0.5)] backdrop-blur">
          <p className="text-sm uppercase tracking-[0.3em] text-[#C8A24D]">Amber Global Energy</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-white sm:text-4xl">Contract Management</h1>
          <p className="mt-2 max-w-2xl text-sm leading-7 text-slate-400">
            Track signed agreements from draft through completion, linked to their company, pipeline project, and broker.
          </p>
        </header>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {summaryCards.map((card) => (
            <div key={card.label} className="rounded-[24px] border border-white/10 bg-[#071A2D]/90 p-5 shadow-[0_12px_40px_rgba(0,0,0,0.32)]">
              <p className="text-sm uppercase tracking-[0.25em] text-slate-400">{card.label}</p>
              <p className={`mt-3 text-3xl font-semibold ${card.tone}`}>{card.value}</p>
            </div>
          ))}
        </section>

        <ContractRoster initialContracts={contracts} companies={companies} projects={projects} brokers={brokers} />
      </div>
    </main>
  );
}
