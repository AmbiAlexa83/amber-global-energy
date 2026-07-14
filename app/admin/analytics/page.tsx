import Link from "next/link";
import { getInquiriesServer, getBrokersServer, getCompaniesServer, getProjectsServer, getContractsServer } from "@/lib/supabase-server";
import { formatCurrencyValue, parseCurrencyValue } from "@/lib/inquiry-helpers";
import { CLOSED_PROJECT_STAGES } from "@/lib/project-helpers";
import { CLOSED_CONTRACT_STATUSES } from "@/lib/contract-helpers";
import {
  computePipelineFunnel,
  computeConversionMetrics,
  computeBrokerLeaderboard,
  computeCompanyLeaderboard,
  computeInquiryStatusBreakdown,
  computeMonthlyInquiryTrend,
} from "@/lib/analytics-helpers";

// Live cross-entity analytics must never be statically prerendered at build
// time — this route has no dynamic segment to force it, the same reasoning
// as every other /admin/* dashboard route.
export const dynamic = "force-dynamic";

export default async function AnalyticsPage() {
  const [inquiries, brokers, companies, projects, contracts] = await Promise.all([
    getInquiriesServer(),
    getBrokersServer().catch(() => []),
    getCompaniesServer().catch(() => []),
    getProjectsServer().catch(() => []),
    getContractsServer().catch(() => []),
  ]);

  const activeProjects = projects.filter((project) => !CLOSED_PROJECT_STAGES.has(project.stage));
  const activeContracts = contracts.filter((contract) => !CLOSED_CONTRACT_STATUSES.has(contract.status));
  const pipelineValue = activeProjects.reduce((sum, project) => sum + parseCurrencyValue(project.estimated_value), 0);
  const activeContractValue = activeContracts.reduce((sum, contract) => sum + parseCurrencyValue(contract.contract_value), 0);

  const funnel = computePipelineFunnel(projects);
  const conversion = computeConversionMetrics(projects);
  const brokerLeaderboard = computeBrokerLeaderboard(projects, brokers).slice(0, 8);
  const companyLeaderboard = computeCompanyLeaderboard(companies, projects, contracts).slice(0, 8);
  const statusBreakdown = computeInquiryStatusBreakdown(inquiries);
  const monthlyTrend = computeMonthlyInquiryTrend(inquiries, new Date());

  const maxFunnelCount = Math.max(1, ...funnel.map((stage) => stage.count));
  const maxStatusCount = Math.max(1, ...statusBreakdown.map((row) => row.count));
  const maxMonthlyCount = Math.max(1, ...monthlyTrend.map((point) => point.count));

  const summaryCards = [
    { label: "Total Inquiries", value: inquiries.length, tone: "text-white" },
    { label: "Active Pipeline Value", value: formatCurrencyValue(pipelineValue), tone: "text-[#F0D38A]" },
    { label: "Active Contract Value", value: formatCurrencyValue(activeContractValue), tone: "text-emerald-200" },
    { label: "Project Win Rate", value: `${conversion.winRate}%`, tone: "text-sky-200" },
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
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-white sm:text-4xl">Dashboard Analytics</h1>
          <p className="mt-2 max-w-2xl text-sm leading-7 text-slate-400">
            Cross-entity performance across inquiries, the pipeline, brokers, and companies.
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

        <div className="grid gap-4 xl:grid-cols-2">
          <section className="rounded-[28px] border border-white/10 bg-[#050B16]/90 p-4 shadow-[0_20px_80px_rgba(0,0,0,0.45)] backdrop-blur sm:p-6">
            <h2 className="text-xl font-semibold text-white">Pipeline Funnel</h2>
            <p className="mt-1 text-sm text-slate-400">Projects by stage, with pipeline value per stage.</p>
            <div className="mt-4 space-y-3">
              {funnel.map((stage) => (
                <div key={stage.value}>
                  <div className="flex items-center justify-between text-xs uppercase tracking-[0.2em] text-slate-500">
                    <span>{stage.label}</span>
                    <span>{stage.count} • {formatCurrencyValue(stage.value_total)}</span>
                  </div>
                  <div className="mt-1.5 h-2.5 w-full overflow-hidden rounded-full bg-[#071A2D]">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-[#C8A24D] to-[#F0D38A]"
                      style={{ width: `${Math.max(4, Math.round((stage.count / maxFunnelCount) * 100))}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-[28px] border border-white/10 bg-[#050B16]/90 p-4 shadow-[0_20px_80px_rgba(0,0,0,0.45)] backdrop-blur sm:p-6">
            <h2 className="text-xl font-semibold text-white">Inquiry Status Distribution</h2>
            <p className="mt-1 text-sm text-slate-400">Share of inquiries currently in each workflow status.</p>
            <div className="mt-4 space-y-3">
              {statusBreakdown.map((row) => (
                <div key={row.value}>
                  <div className="flex items-center justify-between text-xs uppercase tracking-[0.2em] text-slate-500">
                    <span>{row.label}</span>
                    <span>{row.count} ({row.percent}%)</span>
                  </div>
                  <div className="mt-1.5 h-2.5 w-full overflow-hidden rounded-full bg-[#071A2D]">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-sky-400 to-sky-200"
                      style={{ width: `${Math.max(4, Math.round((row.count / maxStatusCount) * 100))}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>

        <section className="rounded-[28px] border border-white/10 bg-[#050B16]/90 p-4 shadow-[0_20px_80px_rgba(0,0,0,0.45)] backdrop-blur sm:p-6">
          <h2 className="text-xl font-semibold text-white">Inquiry Volume — Last 6 Months</h2>
          <div className="mt-6 flex items-end gap-3 sm:gap-4">
            {monthlyTrend.map((point) => (
              <div key={point.key} className="flex flex-1 flex-col items-center gap-2">
                <div className="flex h-32 w-full items-end">
                  <div
                    className="w-full rounded-t-lg bg-gradient-to-t from-[#C8A24D]/40 to-[#F0D38A]"
                    style={{ height: `${Math.max(4, Math.round((point.count / maxMonthlyCount) * 100))}%` }}
                  />
                </div>
                <p className="text-sm font-semibold text-white">{point.count}</p>
                <p className="text-[10px] uppercase tracking-[0.15em] text-slate-500">{point.label}</p>
              </div>
            ))}
          </div>
        </section>

        <div className="grid gap-4 xl:grid-cols-2">
          <section className="rounded-[28px] border border-white/10 bg-[#050B16]/90 p-4 shadow-[0_20px_80px_rgba(0,0,0,0.45)] backdrop-blur sm:p-6">
            <h2 className="text-xl font-semibold text-white">Broker Leaderboard</h2>
            <p className="mt-1 text-sm text-slate-400">Ranked by active pipeline value.</p>
            {brokerLeaderboard.length === 0 ? (
              <p className="mt-4 text-sm text-slate-500">No brokers with pipeline activity yet.</p>
            ) : (
              <div className="mt-4 overflow-x-auto">
                <table className="min-w-full border-separate border-spacing-y-2 text-left text-sm">
                  <thead>
                    <tr className="text-slate-400">
                      <th className="px-3 py-2 font-medium">Broker</th>
                      <th className="px-3 py-2 font-medium">Active</th>
                      <th className="px-3 py-2 font-medium">Won</th>
                      <th className="px-3 py-2 font-medium">Win Rate</th>
                      <th className="px-3 py-2 font-medium">Pipeline Value</th>
                    </tr>
                  </thead>
                  <tbody>
                    {brokerLeaderboard.map((row) => (
                      <tr key={row.id} className="rounded-2xl bg-[#071A2D]/80 text-slate-300">
                        <td className="rounded-l-2xl px-3 py-3 font-medium text-white">{row.name}</td>
                        <td className="px-3 py-3">{row.activeDeals}</td>
                        <td className="px-3 py-3">{row.wonDeals}</td>
                        <td className="px-3 py-3">{row.winRate}%</td>
                        <td className="rounded-r-2xl px-3 py-3 text-[#F0D38A]">{formatCurrencyValue(row.pipelineValue)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          <section className="rounded-[28px] border border-white/10 bg-[#050B16]/90 p-4 shadow-[0_20px_80px_rgba(0,0,0,0.45)] backdrop-blur sm:p-6">
            <h2 className="text-xl font-semibold text-white">Company Leaderboard</h2>
            <p className="mt-1 text-sm text-slate-400">Ranked by active contract value.</p>
            {companyLeaderboard.length === 0 ? (
              <p className="mt-4 text-sm text-slate-500">No companies with contract activity yet.</p>
            ) : (
              <div className="mt-4 overflow-x-auto">
                <table className="min-w-full border-separate border-spacing-y-2 text-left text-sm">
                  <thead>
                    <tr className="text-slate-400">
                      <th className="px-3 py-2 font-medium">Company</th>
                      <th className="px-3 py-2 font-medium">Projects</th>
                      <th className="px-3 py-2 font-medium">Active Contract Value</th>
                    </tr>
                  </thead>
                  <tbody>
                    {companyLeaderboard.map((row) => (
                      <tr key={row.id} className="rounded-2xl bg-[#071A2D]/80 text-slate-300">
                        <td className="rounded-l-2xl px-3 py-3 font-medium text-white">{row.name}</td>
                        <td className="px-3 py-3">{row.projectCount}</td>
                        <td className="rounded-r-2xl px-3 py-3 text-[#F0D38A]">{formatCurrencyValue(row.activeContractValue)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </div>
      </div>
    </main>
  );
}
