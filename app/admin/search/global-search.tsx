"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type { InquiryRecord } from "@/lib/inquiry-helpers";
import type { BrokerRecord, CompanyRecord, ProjectRecord, ContractRecord } from "@/lib/supabase-server";
import { buildSearchResults, type SearchResultType } from "@/lib/search-helpers";

const groupLabels: Record<SearchResultType, string> = {
  inquiry: "Customers",
  company: "Companies",
  broker: "Brokers",
  project: "Projects",
  contract: "Contracts",
};

const groupOrder: SearchResultType[] = ["inquiry", "company", "broker", "project", "contract"];

export default function GlobalSearch({
  inquiries,
  brokers,
  companies,
  projects,
  contracts,
}: {
  inquiries: InquiryRecord[];
  brokers: BrokerRecord[];
  companies: CompanyRecord[];
  projects: ProjectRecord[];
  contracts: ContractRecord[];
}) {
  const [query, setQuery] = useState("");

  const results = useMemo(
    () => buildSearchResults(query, { inquiries, brokers, companies, projects, contracts }),
    [query, inquiries, brokers, companies, projects, contracts],
  );

  const totalCount = groupOrder.reduce((sum, type) => sum + results[type].length, 0);
  const hasQuery = query.trim().length > 0;

  return (
    <section className="rounded-[28px] border border-white/10 bg-[#050B16]/90 p-4 shadow-[0_20px_80px_rgba(0,0,0,0.45)] backdrop-blur sm:p-6">
      <input
        autoFocus
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="Search by name, company, email, phone, contract number, product..."
        className="w-full rounded-xl border border-white/10 bg-[#071A2D] px-4 py-3.5 text-base text-white outline-none transition focus:border-[#C8A24D] focus:ring-2 focus:ring-[#C8A24D]/30"
      />

      {!hasQuery ? (
        <p className="mt-6 text-center text-sm text-slate-500">Start typing to search across every record in the CRM.</p>
      ) : totalCount === 0 ? (
        <p className="mt-6 text-center text-sm text-slate-500">No matches for &ldquo;{query}&rdquo;.</p>
      ) : (
        <div className="mt-6 space-y-6">
          {groupOrder.map((type) => {
            const group = results[type];
            if (group.length === 0) return null;

            return (
              <div key={type}>
                <p className="text-xs uppercase tracking-[0.25em] text-slate-500">
                  {groupLabels[type]} ({group.length})
                </p>
                <div className="mt-3 space-y-2">
                  {group.map((result) => (
                    <Link
                      key={`${result.type}-${result.id}`}
                      href={result.href}
                      className="flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-[#071A2D]/80 px-4 py-3 transition hover:border-[#C8A24D]/40"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-white">{result.title}</p>
                        <p className="mt-0.5 truncate text-xs text-slate-500">{result.subtitle}</p>
                      </div>
                      <span className="shrink-0 rounded-full border border-white/10 bg-[#050B16]/70 px-2.5 py-1 text-[10px] uppercase tracking-[0.2em] text-slate-400">
                        {result.meta}
                      </span>
                    </Link>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
