// Always rendered for every match — strengths/conflicts/missing information/
// recommended next action, not just a numeric score. Purely presentational;
// the content itself is generated deterministically by
// lib/match-explanations.ts and stored on the match row at compute time.

export default function MatchExplanationPanel({
  strengths,
  conflicts,
  missingInformation,
  recommendedNextAction,
}: {
  strengths: string[];
  conflicts: string[];
  missingInformation: string[];
  recommendedNextAction: string | null;
}) {
  return (
    <section className="rounded-[28px] border border-white/10 bg-[#050B16]/90 p-4 shadow-[0_20px_80px_rgba(0,0,0,0.45)] backdrop-blur sm:p-6">
      <h2 className="text-xl font-semibold text-white">Match Explanation</h2>
      <p className="mt-1 text-sm text-slate-400">Every factor behind this match&rsquo;s scores — deterministic and rule-based, not AI-generated.</p>

      <div className="mt-5 grid gap-4 lg:grid-cols-3">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-emerald-300">Strengths</p>
          {strengths.length === 0 ? (
            <p className="mt-2 text-sm text-slate-500">No notable strengths identified.</p>
          ) : (
            <ul className="mt-2 space-y-1.5">
              {strengths.map((item, index) => (
                <li key={index} className="text-sm text-slate-300">• {item}</li>
              ))}
            </ul>
          )}
        </div>

        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-rose-300">Conflicts</p>
          {conflicts.length === 0 ? (
            <p className="mt-2 text-sm text-slate-500">No conflicts identified.</p>
          ) : (
            <ul className="mt-2 space-y-1.5">
              {conflicts.map((item, index) => (
                <li key={index} className="text-sm text-slate-300">• {item}</li>
              ))}
            </ul>
          )}
        </div>

        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-[#F0D38A]">Missing Information</p>
          {missingInformation.length === 0 ? (
            <p className="mt-2 text-sm text-slate-500">No missing information.</p>
          ) : (
            <ul className="mt-2 space-y-1.5">
              {missingInformation.map((item, index) => (
                <li key={index} className="text-sm text-slate-300">• {item}</li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {recommendedNextAction ? (
        <div className="mt-5 rounded-2xl border border-[#C8A24D]/25 bg-[#C8A24D]/8 px-4 py-3">
          <p className="text-xs uppercase tracking-[0.2em] text-[#F0D38A]">Recommended Next Action</p>
          <p className="mt-1 text-sm text-slate-200">{recommendedNextAction}</p>
        </div>
      ) : null}
    </section>
  );
}
