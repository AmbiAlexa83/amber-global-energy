import type { InquiryRecord, HistoryRecord } from "@/lib/inquiry-helpers";
import { formatHistoryField } from "@/lib/inquiry-helpers";
import { formatProjectStageLabel } from "@/lib/project-helpers";
import { formatContractStatusLabel } from "@/lib/contract-helpers";
import type {
  BrokerRecord,
  CompanyRecord,
  ProjectRecord,
  ContractRecord,
  DocumentRecord,
  EmailRecord,
  AdminUserRecord,
} from "@/lib/supabase-server";

export type ActivityEvent = {
  id: string;
  timestamp: string;
  icon: string;
  title: string;
  detail: string;
  href: string | null;
};

const inquiryLabel = (inquiry: InquiryRecord) => inquiry.company_name ?? inquiry.contact_name ?? inquiry.name ?? "Unnamed inquiry";

export const buildActivityFeed = (data: {
  inquiries: InquiryRecord[];
  inquiryHistory: HistoryRecord[];
  brokers: BrokerRecord[];
  companies: CompanyRecord[];
  projects: ProjectRecord[];
  contracts: ContractRecord[];
  documents: DocumentRecord[];
  emails: EmailRecord[];
  adminUsers: AdminUserRecord[];
}): ActivityEvent[] => {
  const events: ActivityEvent[] = [];

  const inquiryById = new Map(data.inquiries.map((item) => [String(item.id), item]));
  const companyById = new Map(data.companies.map((item) => [item.id, item]));
  const projectById = new Map(data.projects.map((item) => [item.id, item]));
  const contractById = new Map(data.contracts.map((item) => [item.id, item]));

  for (const inquiry of data.inquiries) {
    if (!inquiry.created_at) continue;
    events.push({
      id: `inquiry-created-${inquiry.id}`,
      timestamp: inquiry.created_at,
      icon: "📥",
      title: "New inquiry submitted",
      detail: inquiryLabel(inquiry),
      href: `/admin/customers/${inquiry.id}`,
    });
  }

  for (const row of data.inquiryHistory) {
    const inquiry = inquiryById.get(row.inquiry_id);
    events.push({
      id: `history-${row.id}`,
      timestamp: row.changed_at,
      icon: "✏️",
      title: `${formatHistoryField(row.field_changed)} changed`,
      detail: `${inquiry ? inquiryLabel(inquiry) : "Unknown inquiry"} — ${row.old_value ?? "—"} → ${row.new_value ?? "—"}`,
      href: `/admin/customers/${row.inquiry_id}`,
    });
  }

  for (const broker of data.brokers) {
    events.push({
      id: `broker-created-${broker.id}`,
      timestamp: broker.created_at,
      icon: "🧑‍💼",
      title: "Broker added",
      detail: broker.name,
      href: `/admin/brokers`,
    });
    if (broker.updated_at !== broker.created_at) {
      events.push({
        id: `broker-updated-${broker.id}-${broker.updated_at}`,
        timestamp: broker.updated_at,
        icon: "🧑‍💼",
        title: "Broker updated",
        detail: broker.name,
        href: `/admin/brokers`,
      });
    }
  }

  for (const company of data.companies) {
    events.push({
      id: `company-created-${company.id}`,
      timestamp: company.created_at,
      icon: "🏢",
      title: "Company added",
      detail: company.name,
      href: `/admin/companies/${company.id}`,
    });
    if (company.updated_at !== company.created_at) {
      events.push({
        id: `company-updated-${company.id}-${company.updated_at}`,
        timestamp: company.updated_at,
        icon: "🏢",
        title: "Company updated",
        detail: company.name,
        href: `/admin/companies/${company.id}`,
      });
    }
  }

  for (const project of data.projects) {
    events.push({
      id: `project-created-${project.id}`,
      timestamp: project.created_at,
      icon: "📈",
      title: "Project added",
      detail: `${project.name} — ${formatProjectStageLabel(project.stage)}`,
      href: `/admin/projects/${project.id}`,
    });
    if (project.updated_at !== project.created_at) {
      events.push({
        id: `project-updated-${project.id}-${project.updated_at}`,
        timestamp: project.updated_at,
        icon: "📈",
        title: "Project updated",
        detail: `${project.name} — ${formatProjectStageLabel(project.stage)}`,
        href: `/admin/projects/${project.id}`,
      });
    }
  }

  for (const contract of data.contracts) {
    events.push({
      id: `contract-created-${contract.id}`,
      timestamp: contract.created_at,
      icon: "📄",
      title: "Contract added",
      detail: `${contract.title} — ${formatContractStatusLabel(contract.status)}`,
      href: `/admin/contracts/${contract.id}`,
    });
    if (contract.updated_at !== contract.created_at) {
      events.push({
        id: `contract-updated-${contract.id}-${contract.updated_at}`,
        timestamp: contract.updated_at,
        icon: "📄",
        title: "Contract updated",
        detail: `${contract.title} — ${formatContractStatusLabel(contract.status)}`,
        href: `/admin/contracts/${contract.id}`,
      });
    }
  }

  const hrefForLinks = (links: { inquiry_id: string | null; company_id: string | null; project_id: string | null; contract_id: string | null }) => {
    if (links.inquiry_id) return `/admin/customers/${links.inquiry_id}`;
    if (links.company_id) return `/admin/companies/${links.company_id}`;
    if (links.project_id) return `/admin/projects/${links.project_id}`;
    if (links.contract_id) return `/admin/contracts/${links.contract_id}`;
    return null;
  };

  const labelForLinks = (links: { inquiry_id: string | null; company_id: string | null; project_id: string | null; contract_id: string | null }) => {
    if (links.inquiry_id) {
      const inquiry = inquiryById.get(links.inquiry_id);
      return inquiry ? inquiryLabel(inquiry) : "a customer";
    }
    if (links.company_id) return companyById.get(links.company_id)?.name ?? "a company";
    if (links.project_id) return projectById.get(links.project_id)?.name ?? "a project";
    if (links.contract_id) return contractById.get(links.contract_id)?.title ?? "a contract";
    return "an unlinked record";
  };

  for (const document of data.documents) {
    events.push({
      id: `document-${document.id}`,
      timestamp: document.created_at,
      icon: "📎",
      title: "Document uploaded",
      detail: `${document.file_name} — ${labelForLinks(document)}`,
      href: hrefForLinks(document),
    });
  }

  for (const email of data.emails) {
    events.push({
      id: `email-${email.id}`,
      timestamp: email.created_at,
      icon: "✉️",
      title: email.direction === "inbound" ? "Inbound email logged" : "Outbound email logged",
      detail: `${email.subject} — ${labelForLinks(email)}`,
      href: hrefForLinks(email),
    });
  }

  for (const user of data.adminUsers) {
    events.push({
      id: `user-created-${user.id}`,
      timestamp: user.created_at,
      icon: "👤",
      title: "Team member added",
      detail: `${user.name} (${user.role})`,
      href: `/admin/users`,
    });
  }

  return events.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
};
