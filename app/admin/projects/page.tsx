import Link from "next/link";
import { getProjectsServer, getCompaniesServer, getBrokersServer, getInquiriesServer } from "@/lib/supabase-server";
import { formatCurrencyValue, parseCurrencyValue } from "@/lib/inquiry-helpers";
import { CLOSED_PROJECT_STAGES } from "@/lib/project-helpers";
import ProjectBoard from "./project-board";

// Live admin data (pipeline board + summary totals) must never be statically
// prerendered at build time — this route has no dynamic segment to force it,
// the same reasoning as /admin/brokers and /admin/companies.
export const dynamic = "force-dynamic";

export default async function ProjectsPage() {
  const [projects, companies, brokers, inquiries] = await Promise.all([
    getProjectsServer(),
    getCompaniesServer().catch(() => []),
    getBrokersServer().catch(() => []),
    getInquiriesServer().catch(() => []),
  ]);

  const activeProjects = projects.filter((project) => !CLOSED_PROJECT_STAGES.has(project.stage));
  const wonProjects = projects.filter((project) => project.stage === "closed_won");
  const lostProjects = projects.filter((project) => project.stage === "closed_lost");
  const pipelineValue = activeProjects.reduce((total, project) => total + parseCurrencyValue(project.estimated_value), 0);

  const summaryCards = [
    { label: "Active Projects", value: activeProjects.length, tone: "text-white" },
    { label: "Pipeline Value", value: formatCurrencyValue(pipelineValue), tone: "text-[#F0D38A]" },
    { label: "Closed Won", value: wonProjects.length, tone: "text-emerald-200" },
    { label: "Closed Lost", value: lostProjects.length, tone: "text-slate-300" },
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
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-white sm:text-4xl">Project Pipeline Management</h1>
          <p className="mt-2 max-w-2xl text-sm leading-7 text-slate-400">
            Track trade deals as they move from prospecting through to close, linked to their company, broker, and originating inquiry.
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

        <ProjectBoard
          initialProjects={projects}
          companies={companies}
          brokers={brokers}
          inquiries={inquiries}
        />
      </div>
    </main>
  );
}
