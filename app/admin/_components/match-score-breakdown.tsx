const ROWS: Array<{ key: string; label: string }> = [
  { key: "product_score", label: "Product" },
  { key: "quantity_score", label: "Quantity" },
  { key: "geography_score", label: "Geography" },
  { key: "incoterms_score", label: "Incoterms" },
  { key: "payment_terms_score", label: "Payment Terms" },
  { key: "timing_score", label: "Timing" },
  { key: "document_readiness_score", label: "Document Readiness" },
  { key: "trust_score", label: "Trust & Verification" },
];

export default function MatchScoreBreakdown({ scores, riskPenalty }: { scores: Record<string, number>; riskPenalty: number }) {
  return (
    <section className="rounded-[28px] border border-white/10 bg-[#050B16]/90 p-4 shadow-[0_20px_80px_rgba(0,0,0,0.45)] backdrop-blur sm:p-6">
      <h2 className="text-xl font-semibold text-white">Score Breakdown</h2>
      <p className="mt-1 text-sm text-slate-400">Component scores (0-100) feeding the compatibility and opportunity totals.</p>
      <div className="mt-4 space-y-3">
        {ROWS.map((row) => {
          const value = scores[row.key] ?? 0;
          return (
            <div key={row.key}>
              <div className="flex items-center justify-between text-xs uppercase tracking-[0.2em] text-slate-500">
                <span>{row.label}</span>
                <span>{value}</span>
              </div>
              <div className="mt-1.5 h-2.5 w-full overflow-hidden rounded-full bg-[#071A2D]">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-[#C8A24D] to-[#F0D38A]"
                  style={{ width: `${Math.max(4, value)}%` }}
                />
              </div>
            </div>
          );
        })}
        {riskPenalty > 0 ? (
          <div>
            <div className="flex items-center justify-between text-xs uppercase tracking-[0.2em] text-rose-300">
              <span>Risk Penalty</span>
              <span>-{riskPenalty}</span>
            </div>
            <div className="mt-1.5 h-2.5 w-full overflow-hidden rounded-full bg-[#071A2D]">
              <div className="h-full rounded-full bg-gradient-to-r from-rose-500 to-rose-300" style={{ width: `${Math.max(4, riskPenalty)}%` }} />
            </div>
          </div>
        ) : null}
      </div>
    </section>
  );
}
