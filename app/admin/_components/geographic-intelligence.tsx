import { formatCurrencyValue } from "@/lib/inquiry-helpers";
import type { GeographicIntelligence as GeographicIntelligenceData } from "@/lib/executive-analytics";

function CountryTable({ title, subtitle, rows }: { title: string; subtitle: string; rows: GeographicIntelligenceData["byCountry"] }) {
  return (
    <div className="rounded-[28px] border border-white/10 bg-[#050B16]/90 p-4 shadow-[0_20px_80px_rgba(0,0,0,0.45)] backdrop-blur sm:p-6">
      <h2 className="text-xl font-semibold text-white">{title}</h2>
      <p className="mt-1 text-sm text-slate-400">{subtitle}</p>

      {rows.length === 0 ? (
        <p className="mt-4 text-sm text-slate-500">No geographic data available yet.</p>
      ) : (
        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full border-separate border-spacing-y-2 text-left text-sm">
            <thead>
              <tr className="text-slate-400">
                <th className="px-3 py-2 font-medium">Country</th>
                <th className="px-3 py-2 font-medium">Inquiries</th>
                <th className="px-3 py-2 font-medium">Pipeline Value</th>
                <th className="px-3 py-2 font-medium">Top Products</th>
                <th className="px-3 py-2 font-medium">Buyer / Seller</th>
              </tr>
            </thead>
            <tbody>
              {rows.slice(0, 10).map((row) => (
                <tr key={row.country} className="rounded-2xl bg-[#071A2D]/80 text-slate-300">
                  <td className="rounded-l-2xl px-3 py-3 font-medium text-white">{row.country}</td>
                  <td className="px-3 py-3">{row.inquiryCount}</td>
                  <td className="px-3 py-3 text-[#F0D38A]">{formatCurrencyValue(row.pipelineValue)}</td>
                  <td className="px-3 py-3">{row.topProducts.map((product) => product.product).join(", ") || "—"}</td>
                  <td className="rounded-r-2xl px-3 py-3">
                    {row.buyerCount} / {row.sellerCount}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default function GeographicIntelligence({ geographicMetrics }: { geographicMetrics: GeographicIntelligenceData }) {
  return (
    <div className="grid gap-4 xl:grid-cols-2">
      <CountryTable
        title="Geographic Intelligence"
        subtitle="Inquiry count and pipeline value by inquirer country."
        rows={geographicMetrics.byCountry}
      />
      <CountryTable
        title="Top Destination Countries"
        subtitle="Ranked by inquiry count with a destination country on file."
        rows={geographicMetrics.topDestinations}
      />
    </div>
  );
}
