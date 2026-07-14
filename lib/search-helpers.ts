import type { InquiryRecord } from "@/lib/inquiry-helpers";
import { formatStatusLabel } from "@/lib/inquiry-helpers";
import { formatProjectStageLabel } from "@/lib/project-helpers";
import { formatContractStatusLabel } from "@/lib/contract-helpers";
import type { BrokerRecord, CompanyRecord, ProjectRecord, ContractRecord } from "@/lib/supabase-server";

export type SearchResultType = "inquiry" | "company" | "broker" | "project" | "contract";

export type SearchResult = {
  type: SearchResultType;
  id: string;
  title: string;
  subtitle: string;
  meta: string;
  href: string;
};

const normalize = (value?: string | null) => (value ?? "").toLowerCase();

const matches = (query: string, fields: Array<string | null | undefined>) => {
  if (!query) return false;
  return fields.some((field) => normalize(field).includes(query));
};

export const buildSearchResults = (
  rawQuery: string,
  data: {
    inquiries: InquiryRecord[];
    companies: CompanyRecord[];
    brokers: BrokerRecord[];
    projects: ProjectRecord[];
    contracts: ContractRecord[];
  },
): Record<SearchResultType, SearchResult[]> => {
  const query = rawQuery.trim().toLowerCase();

  const empty: Record<SearchResultType, SearchResult[]> = {
    inquiry: [],
    company: [],
    broker: [],
    project: [],
    contract: [],
  };

  if (!query) return empty;

  const inquiry = data.inquiries
    .filter((item) =>
      matches(query, [
        item.name,
        item.company_name,
        item.contact_name,
        item.email,
        item.phone,
        item.whatsapp,
        item.product,
        item.country,
        item.inquiry_type,
        item.notes,
        item.broker_notes,
        item.assigned_broker,
        item.documents_available,
        item.message,
        item.special_instructions,
      ]),
    )
    .map((item) => ({
      type: "inquiry" as const,
      id: String(item.id),
      title: item.contact_name ?? item.name ?? "Unnamed contact",
      subtitle: item.company_name ?? "—",
      meta: formatStatusLabel(item.status),
      href: `/admin/customers/${item.id}`,
    }));

  const company = data.companies
    .filter((item) => matches(query, [item.name, item.registration_number, item.website, item.country, item.industry, item.notes]))
    .map((item) => ({
      type: "company" as const,
      id: item.id,
      title: item.name,
      subtitle: item.country ?? "—",
      meta: item.verification_status,
      href: `/admin/companies/${item.id}`,
    }));

  const broker = data.brokers
    .filter((item) => matches(query, [item.name, item.email, item.phone, item.region, item.specialty, item.notes]))
    .map((item) => ({
      type: "broker" as const,
      id: item.id,
      title: item.name,
      subtitle: item.region ?? "—",
      meta: item.specialty ?? item.status,
      href: `/admin/brokers`,
    }));

  const project = data.projects
    .filter((item) => matches(query, [item.name, item.notes, item.companies?.name, item.brokers?.name]))
    .map((item) => ({
      type: "project" as const,
      id: item.id,
      title: item.name,
      subtitle: item.companies?.name ?? "—",
      meta: formatProjectStageLabel(item.stage),
      href: `/admin/projects/${item.id}`,
    }));

  const contract = data.contracts
    .filter((item) => matches(query, [item.title, item.contract_number, item.notes, item.companies?.name]))
    .map((item) => ({
      type: "contract" as const,
      id: item.id,
      title: item.title,
      subtitle: item.companies?.name ?? "—",
      meta: formatContractStatusLabel(item.status),
      href: `/admin/contracts/${item.id}`,
    }));

  return { inquiry, company, broker, project, contract };
};
