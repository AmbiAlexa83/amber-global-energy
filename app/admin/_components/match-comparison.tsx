import Link from "next/link";

type InquirySummary = {
  id: string;
  companyName: string | null;
  product: string | null;
  quantity: string | null;
  unit: string | null;
  incoterms: string | null;
  paymentMethod: string | null;
  country: string | null;
  originCountry: string | null;
  destinationCountry: string | null;
  status: string | null;
  documentsAvailable: string | null;
} | null;

const Field = ({ label, value }: { label: string; value: string | null }) => (
  <div className="flex items-center justify-between gap-3 border-b border-white/5 py-2 last:border-0">
    <span className="text-xs uppercase tracking-[0.15em] text-slate-500">{label}</span>
    <span className="text-sm text-slate-200">{value?.trim() ? value : "—"}</span>
  </div>
);

// Company/product/quantity/geography only — no email, phone, or WhatsApp.
// Contact details remain hidden until a broker approves the match and acts
// on it outside this system.
const InquiryColumn = ({ label, inquiry }: { label: string; inquiry: InquirySummary }) => (
  <div className="rounded-2xl border border-white/10 bg-[#071A2D]/80 p-4">
    <div className="flex items-center justify-between gap-2">
      <p className="text-xs uppercase tracking-[0.2em] text-[#C8A24D]">{label}</p>
      {inquiry ? (
        <Link href={`/admin/customers/${inquiry.id}`} className="text-xs text-slate-400 hover:text-white">
          View customer →
        </Link>
      ) : null}
    </div>
    <p className="mt-1 text-lg font-semibold text-white">{inquiry?.companyName ?? "Unnamed company"}</p>
    <div className="mt-3">
      <Field label="Product" value={inquiry?.product ?? null} />
      <Field label="Quantity" value={inquiry?.quantity && inquiry?.unit ? `${inquiry.quantity} ${inquiry.unit}` : null} />
      <Field label="Incoterms" value={inquiry?.incoterms ?? null} />
      <Field label="Payment Method" value={inquiry?.paymentMethod ?? null} />
      <Field label="Origin" value={inquiry?.originCountry ?? inquiry?.country ?? null} />
      <Field label="Destination" value={inquiry?.destinationCountry ?? null} />
      <Field label="Documents Available" value={inquiry?.documentsAvailable ?? null} />
      <Field label="Status" value={inquiry?.status ?? null} />
    </div>
  </div>
);

export default function MatchComparison({ buyer, seller }: { buyer: InquirySummary; seller: InquirySummary }) {
  return (
    <section className="rounded-[28px] border border-white/10 bg-[#050B16]/90 p-4 shadow-[0_20px_80px_rgba(0,0,0,0.45)] backdrop-blur sm:p-6">
      <h2 className="text-xl font-semibold text-white">Buyer / Seller Comparison</h2>
      <p className="mt-1 text-sm text-slate-400">Trade terms only — contact information stays hidden until a broker approves this match.</p>
      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <InquiryColumn label="Buyer" inquiry={buyer} />
        <InquiryColumn label="Seller" inquiry={seller} />
      </div>
    </section>
  );
}
