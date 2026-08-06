import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

export const supabaseServer =
  supabaseUrl && serviceRoleKey
    ? createClient(supabaseUrl, serviceRoleKey, {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
        },
      })
    : null;

export type InquiryServerRecord = {
  id?: string | null;
  name?: string | null;
  email?: string | null;
  company_name?: string | null;
  company_registration_number?: string | null;
  company_website?: string | null;
  address?: string | null;
  country?: string | null;
  contact_name?: string | null;
  inquiry_type?: string | null;
  product?: string | null;
  grade?: string | null;
  quantity?: string | null;
  unit?: string | null;
  destination_port?: string | null;
  destination_country?: string | null;
  delivery_window?: string | null;
  payment_method?: string | null;
  incoterms?: string | null;
  target_price?: string | null;
  commission?: string | null;
  financing_needed?: string | null;
  documents_available?: string | null;
  special_instructions?: string | null;
  status?: string | null;
  priority?: string | null;
  assigned_broker?: string | null;
  broker_notes?: string | null;
  notes?: string | null;
  last_contacted_at?: string | null;
  reviewed_at?: string | null;
  qualified_at?: string | null;
  matched_at?: string | null;
  closed_at?: string | null;
  updated_at?: string | null;
  created_at?: string | null;
  message?: string | null;
  position?: string | null;
  phone?: string | null;
  whatsapp?: string | null;
};

export type HistoryRecord = {
  id: string;
  inquiry_id: string;
  field_changed: string;
  old_value: string | null;
  new_value: string | null;
  changed_at: string;
  changed_by: string;
};

// Exported so the PATCH route handler can diff assigned_broker for history records
export const parseBrokerState = (brokerNotes?: string | null) => {
  const raw = brokerNotes?.trim() ?? "";
  const assignedMatch = raw.match(/^Assigned Broker:\s*(.+)$/im);

  if (!assignedMatch) {
    return { assigned_broker: null, broker_notes: raw || null };
  }

  const assigned_broker = assignedMatch[1].trim() || null;
  const broker_notes = raw.replace(/^Assigned Broker:\s*.+$/im, "").trim() || null;

  return { assigned_broker, broker_notes };
};

const serializeBrokerState = (assignedBroker?: string | null, brokerNotes?: string | null) => {
  const trimmedBroker = assignedBroker?.trim();
  const trimmedNotes = brokerNotes?.trim();

  if (!trimmedBroker && !trimmedNotes) {
    return null;
  }

  return [trimmedBroker ? `Assigned Broker: ${trimmedBroker}` : null, trimmedNotes].filter(Boolean).join("\n\n");
};

const INQUIRY_SELECT =
  "id,name,email,message,source_page,status,priority,broker_notes,notes,last_contacted_at,created_at,updated_at,inquiry_type,company_name,contact_name,position,phone,whatsapp,company_website,country,product,quantity,unit,documents_available,special_instructions";

// Includes every column defined in supabase/schema.sql for public.inquiries, used by
// the Customer Detail page so it can render fields the dashboard list view omits.
const FULL_INQUIRY_SELECT =
  "id,name,email,message,source_page,status,priority,broker_notes,notes,last_contacted_at,reviewed_at,qualified_at,matched_at,closed_at,created_at,updated_at,inquiry_type,company_name,contact_name,position,phone,whatsapp,company_website,country,company_registration_number,verification_status,role_type,product,quantity,unit,delivery_frequency,contract_length,target_price,currency,payment_method,incoterms,loading_port,destination_port,origin_country,destination_country,shipping_method,documents_available,special_instructions";

export async function getInquiriesServer() {
  if (!supabaseServer) {
    throw new Error("Supabase service role key is not configured on the server.");
  }

  const { data, error } = await supabaseServer
    .from("inquiries")
    .select(INQUIRY_SELECT)
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []).map((item) => {
    const parsed = parseBrokerState(item.broker_notes);
    return {
      ...item,
      assigned_broker: parsed.assigned_broker,
      broker_notes: parsed.broker_notes,
    };
  });
}

// Additive, analytics-only fetch — reuses the existing FULL_INQUIRY_SELECT
// (already used by the Customer Detail page) so executive analytics can read
// geography/value fields (target_price, destination_country, origin_country,
// role_type) without touching getInquiriesServer() or any of its callers.
export async function getInquiriesForAnalyticsServer() {
  if (!supabaseServer) {
    throw new Error("Supabase service role key is not configured on the server.");
  }

  const { data, error } = await supabaseServer
    .from("inquiries")
    .select(FULL_INQUIRY_SELECT)
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []).map((item) => {
    const parsed = parseBrokerState(item.broker_notes);
    return {
      ...item,
      assigned_broker: parsed.assigned_broker,
      broker_notes: parsed.broker_notes,
    };
  });
}

export async function getInquiryByIdServer(id: string) {
  if (!supabaseServer) {
    throw new Error("Supabase service role key is not configured on the server.");
  }

  const { data, error } = await supabaseServer
    .from("inquiries")
    .select(FULL_INQUIRY_SELECT)
    .eq("id", id)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  if (!data) {
    return null;
  }

  const parsed = parseBrokerState(data.broker_notes);
  return {
    ...data,
    assigned_broker: parsed.assigned_broker,
    broker_notes: parsed.broker_notes,
  };
}

export async function updateInquiryServer(
  id: string | number,
  updates: {
    status?: string | null;
    priority?: string | null;
    assigned_broker?: string | null;
    broker_notes?: string | null;
    notes?: string | null;
    last_contacted_at?: string | null;
  },
) {
  if (!supabaseServer) {
    throw new Error("Supabase service role key is not configured on the server.");
  }

  const updatePayload: Record<string, string | null> = {};

  if (updates.status !== undefined) {
    updatePayload.status = updates.status ?? null;
  }

  if (updates.priority !== undefined) {
    updatePayload.priority = updates.priority ?? null;
  }

  if (updates.broker_notes !== undefined || updates.assigned_broker !== undefined) {
    updatePayload.broker_notes = serializeBrokerState(updates.assigned_broker, updates.broker_notes) ?? null;
  }

  if (updates.notes !== undefined) {
    updatePayload.notes = updates.notes ?? null;
  }

  if (updates.last_contacted_at !== undefined) {
    updatePayload.last_contacted_at = updates.last_contacted_at ?? null;
  }

  const { data, error } = await supabaseServer
    .from("inquiries")
    .update(updatePayload)
    .eq("id", id)
    .select(INQUIRY_SELECT)
    .single();

  if (error) {
    throw new Error(error.message);
  }

  const parsed = parseBrokerState(data?.broker_notes);
  return {
    ...data,
    assigned_broker: parsed.assigned_broker,
    broker_notes: parsed.broker_notes,
  };
}

export async function getInquiryHistory(inquiryId: string): Promise<HistoryRecord[]> {
  if (!supabaseServer) {
    throw new Error("Supabase service role key is not configured on the server.");
  }

  const { data, error } = await supabaseServer
    .from("inquiry_history")
    .select("id,inquiry_id,field_changed,old_value,new_value,changed_at,changed_by")
    .eq("inquiry_id", inquiryId)
    .order("changed_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []) as HistoryRecord[];
}

export async function getRecentInquiryHistoryServer(limit = 200): Promise<HistoryRecord[]> {
  if (!supabaseServer) {
    throw new Error("Supabase service role key is not configured on the server.");
  }

  const { data, error } = await supabaseServer
    .from("inquiry_history")
    .select("id,inquiry_id,field_changed,old_value,new_value,changed_at,changed_by")
    .order("changed_at", { ascending: false })
    .limit(limit);

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []) as HistoryRecord[];
}

export type BrokerRecord = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  region: string | null;
  specialty: string | null;
  status: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

const BROKER_SELECT = "id,name,email,phone,region,specialty,status,notes,created_at,updated_at";

export async function getBrokersServer(): Promise<BrokerRecord[]> {
  if (!supabaseServer) {
    throw new Error("Supabase service role key is not configured on the server.");
  }

  const { data, error } = await supabaseServer
    .from("brokers")
    .select(BROKER_SELECT)
    .order("name", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []) as BrokerRecord[];
}

export async function createBrokerServer(input: {
  name: string;
  email?: string | null;
  phone?: string | null;
  region?: string | null;
  specialty?: string | null;
  notes?: string | null;
}): Promise<BrokerRecord> {
  if (!supabaseServer) {
    throw new Error("Supabase service role key is not configured on the server.");
  }

  const name = input.name.trim();
  if (!name) {
    throw new Error("Broker name is required.");
  }

  const { data, error } = await supabaseServer
    .from("brokers")
    .insert({
      name,
      email: input.email?.trim() || null,
      phone: input.phone?.trim() || null,
      region: input.region?.trim() || null,
      specialty: input.specialty?.trim() || null,
      notes: input.notes?.trim() || null,
    })
    .select(BROKER_SELECT)
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return data as BrokerRecord;
}

export async function updateBrokerServer(
  id: string,
  updates: {
    name?: string;
    email?: string | null;
    phone?: string | null;
    region?: string | null;
    specialty?: string | null;
    status?: string;
    notes?: string | null;
  },
): Promise<BrokerRecord> {
  if (!supabaseServer) {
    throw new Error("Supabase service role key is not configured on the server.");
  }

  const updatePayload: Record<string, string | null> = {};

  if (updates.name !== undefined) updatePayload.name = updates.name.trim();
  if (updates.email !== undefined) updatePayload.email = updates.email?.trim() || null;
  if (updates.phone !== undefined) updatePayload.phone = updates.phone?.trim() || null;
  if (updates.region !== undefined) updatePayload.region = updates.region?.trim() || null;
  if (updates.specialty !== undefined) updatePayload.specialty = updates.specialty?.trim() || null;
  if (updates.status !== undefined) updatePayload.status = updates.status;
  if (updates.notes !== undefined) updatePayload.notes = updates.notes?.trim() || null;

  const { data, error } = await supabaseServer
    .from("brokers")
    .update(updatePayload)
    .eq("id", id)
    .select(BROKER_SELECT)
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return data as BrokerRecord;
}

export type CompanyRecord = {
  id: string;
  name: string;
  registration_number: string | null;
  website: string | null;
  country: string | null;
  industry: string | null;
  verification_status: string;
  status: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

const COMPANY_SELECT = "id,name,registration_number,website,country,industry,verification_status,status,notes,created_at,updated_at";

export async function getCompaniesServer(): Promise<CompanyRecord[]> {
  if (!supabaseServer) {
    throw new Error("Supabase service role key is not configured on the server.");
  }

  const { data, error } = await supabaseServer
    .from("companies")
    .select(COMPANY_SELECT)
    .order("name", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []) as CompanyRecord[];
}

export async function getCompanyByIdServer(id: string): Promise<CompanyRecord | null> {
  if (!supabaseServer) {
    throw new Error("Supabase service role key is not configured on the server.");
  }

  const { data, error } = await supabaseServer
    .from("companies")
    .select(COMPANY_SELECT)
    .eq("id", id)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return (data as CompanyRecord | null) ?? null;
}

export async function createCompanyServer(input: {
  name: string;
  registration_number?: string | null;
  website?: string | null;
  country?: string | null;
  industry?: string | null;
  verification_status?: string | null;
  notes?: string | null;
}): Promise<CompanyRecord> {
  if (!supabaseServer) {
    throw new Error("Supabase service role key is not configured on the server.");
  }

  const name = input.name.trim();
  if (!name) {
    throw new Error("Company name is required.");
  }

  const { data, error } = await supabaseServer
    .from("companies")
    .insert({
      name,
      registration_number: input.registration_number?.trim() || null,
      website: input.website?.trim() || null,
      country: input.country?.trim() || null,
      industry: input.industry?.trim() || null,
      verification_status: input.verification_status?.trim() || "unverified",
      notes: input.notes?.trim() || null,
    })
    .select(COMPANY_SELECT)
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return data as CompanyRecord;
}

export async function updateCompanyServer(
  id: string,
  updates: {
    name?: string;
    registration_number?: string | null;
    website?: string | null;
    country?: string | null;
    industry?: string | null;
    verification_status?: string;
    status?: string;
    notes?: string | null;
  },
): Promise<CompanyRecord> {
  if (!supabaseServer) {
    throw new Error("Supabase service role key is not configured on the server.");
  }

  const updatePayload: Record<string, string | null> = {};

  if (updates.name !== undefined) updatePayload.name = updates.name.trim();
  if (updates.registration_number !== undefined) updatePayload.registration_number = updates.registration_number?.trim() || null;
  if (updates.website !== undefined) updatePayload.website = updates.website?.trim() || null;
  if (updates.country !== undefined) updatePayload.country = updates.country?.trim() || null;
  if (updates.industry !== undefined) updatePayload.industry = updates.industry?.trim() || null;
  if (updates.verification_status !== undefined) updatePayload.verification_status = updates.verification_status;
  if (updates.status !== undefined) updatePayload.status = updates.status;
  if (updates.notes !== undefined) updatePayload.notes = updates.notes?.trim() || null;

  const { data, error } = await supabaseServer
    .from("companies")
    .update(updatePayload)
    .eq("id", id)
    .select(COMPANY_SELECT)
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return data as CompanyRecord;
}

// ─── Company Contacts (Phase 5.2, Stage 5.2.1) ───────────────────────────
// A company can retain multiple persistent business contacts across every
// inquiry, project, contract, document, and deal match it is ever linked to.
// Deactivation is soft (status = 'inactive') — contacts are never permanently
// deleted, preserving history on anything that referenced them.

export type CompanyContactRecord = {
  id: string;
  company_id: string;
  first_name: string;
  last_name: string | null;
  job_title: string | null;
  department: string | null;
  email: string | null;
  phone: string | null;
  mobile: string | null;
  country: string | null;
  preferred_contact_method: string | null;
  is_primary: boolean;
  status: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

const COMPANY_CONTACT_SELECT =
  "id,company_id,first_name,last_name,job_title,department,email,phone,mobile,country,preferred_contact_method,is_primary,status,notes,created_at,updated_at";

const VALID_CONTACT_STATUSES = new Set(["active", "inactive"]);
const VALID_PREFERRED_CONTACT_METHODS = new Set(["email", "phone", "mobile"]);

export function assertValidContactStatus(status: string): void {
  if (!VALID_CONTACT_STATUSES.has(status)) {
    throw new Error("Status must be 'active' or 'inactive'.");
  }
}

export function assertValidPreferredContactMethod(method: string): void {
  if (!VALID_PREFERRED_CONTACT_METHODS.has(method)) {
    throw new Error("Preferred contact method must be 'email', 'phone', or 'mobile'.");
  }
}

// Ordering used by the company detail page: primary contact first, then
// active before inactive, then alphabetically by name.
const sortCompanyContacts = (contacts: CompanyContactRecord[]): CompanyContactRecord[] =>
  [...contacts].sort((a, b) => {
    if (a.is_primary !== b.is_primary) return a.is_primary ? -1 : 1;
    if (a.status !== b.status) return a.status === "active" ? -1 : 1;
    const aName = `${a.first_name} ${a.last_name ?? ""}`.trim().toLowerCase();
    const bName = `${b.first_name} ${b.last_name ?? ""}`.trim().toLowerCase();
    return aName.localeCompare(bName);
  });

export async function getCompanyContactsServer(companyId: string): Promise<CompanyContactRecord[]> {
  if (!supabaseServer) {
    throw new Error("Supabase service role key is not configured on the server.");
  }

  const { data, error } = await supabaseServer
    .from("company_contacts")
    .select(COMPANY_CONTACT_SELECT)
    .eq("company_id", companyId);

  if (error) {
    throw new Error(error.message);
  }

  return sortCompanyContacts((data ?? []) as CompanyContactRecord[]);
}

export async function getAllCompanyContactsServer(): Promise<CompanyContactRecord[]> {
  if (!supabaseServer) {
    throw new Error("Supabase service role key is not configured on the server.");
  }

  const { data, error } = await supabaseServer
    .from("company_contacts")
    .select(COMPANY_CONTACT_SELECT)
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []) as CompanyContactRecord[];
}

export async function getCompanyContactServer(contactId: string): Promise<CompanyContactRecord | null> {
  if (!supabaseServer) {
    throw new Error("Supabase service role key is not configured on the server.");
  }

  const { data, error } = await supabaseServer
    .from("company_contacts")
    .select(COMPANY_CONTACT_SELECT)
    .eq("id", contactId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return (data as CompanyContactRecord | null) ?? null;
}

// Unsets the current active primary contact for a company, if any. Callers
// perform this before inserting/updating a row with is_primary = true so at
// most one active primary contact ever exists per company.
async function clearActivePrimaryContact(companyId: string, exceptContactId?: string): Promise<void> {
  if (!supabaseServer) {
    throw new Error("Supabase service role key is not configured on the server.");
  }

  let query = supabaseServer
    .from("company_contacts")
    .update({ is_primary: false })
    .eq("company_id", companyId)
    .eq("is_primary", true);

  if (exceptContactId) {
    query = query.neq("id", exceptContactId);
  }

  const { error } = await query;
  if (error) {
    throw new Error(error.message);
  }
}

export async function createCompanyContactServer(
  companyId: string,
  input: {
    first_name: string;
    last_name?: string | null;
    job_title?: string | null;
    department?: string | null;
    email?: string | null;
    phone?: string | null;
    mobile?: string | null;
    country?: string | null;
    preferred_contact_method?: string | null;
    is_primary?: boolean;
    status?: string | null;
    notes?: string | null;
  },
): Promise<CompanyContactRecord> {
  if (!supabaseServer) {
    throw new Error("Supabase service role key is not configured on the server.");
  }

  const first_name = input.first_name.trim();
  if (!first_name) {
    throw new Error("First name is required.");
  }

  const status = input.status?.trim() || "active";
  assertValidContactStatus(status);

  const preferred_contact_method = input.preferred_contact_method?.trim() || null;
  if (preferred_contact_method) {
    assertValidPreferredContactMethod(preferred_contact_method);
  }

  const company = await getCompanyByIdServer(companyId);
  if (!company) {
    throw new Error("Company not found.");
  }

  const isPrimary = Boolean(input.is_primary) && status === "active";

  if (isPrimary) {
    await clearActivePrimaryContact(companyId);
  }

  const { data, error } = await supabaseServer
    .from("company_contacts")
    .insert({
      company_id: companyId,
      first_name,
      last_name: input.last_name?.trim() || null,
      job_title: input.job_title?.trim() || null,
      department: input.department?.trim() || null,
      email: input.email?.trim().toLowerCase() || null,
      phone: input.phone?.trim() || null,
      mobile: input.mobile?.trim() || null,
      country: input.country?.trim() || null,
      preferred_contact_method,
      is_primary: isPrimary,
      status,
      notes: input.notes?.trim() || null,
    })
    .select(COMPANY_CONTACT_SELECT)
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return data as CompanyContactRecord;
}

export async function updateCompanyContactServer(
  contactId: string,
  updates: {
    company_id?: string;
    first_name?: string;
    last_name?: string | null;
    job_title?: string | null;
    department?: string | null;
    email?: string | null;
    phone?: string | null;
    mobile?: string | null;
    country?: string | null;
    preferred_contact_method?: string | null;
    is_primary?: boolean;
    status?: string;
    notes?: string | null;
  },
): Promise<CompanyContactRecord> {
  if (!supabaseServer) {
    throw new Error("Supabase service role key is not configured on the server.");
  }

  const existing = await getCompanyContactServer(contactId);
  if (!existing) {
    throw new Error("Contact not found.");
  }

  if (updates.company_id !== undefined && updates.company_id !== existing.company_id) {
    throw new Error("A contact cannot be reassigned to a different company.");
  }

  const updatePayload: Record<string, string | boolean | null> = {};

  if (updates.first_name !== undefined) {
    const first_name = updates.first_name.trim();
    if (!first_name) {
      throw new Error("First name is required.");
    }
    updatePayload.first_name = first_name;
  }

  if (updates.last_name !== undefined) updatePayload.last_name = updates.last_name?.trim() || null;
  if (updates.job_title !== undefined) updatePayload.job_title = updates.job_title?.trim() || null;
  if (updates.department !== undefined) updatePayload.department = updates.department?.trim() || null;
  if (updates.email !== undefined) updatePayload.email = updates.email?.trim().toLowerCase() || null;
  if (updates.phone !== undefined) updatePayload.phone = updates.phone?.trim() || null;
  if (updates.mobile !== undefined) updatePayload.mobile = updates.mobile?.trim() || null;
  if (updates.country !== undefined) updatePayload.country = updates.country?.trim() || null;
  if (updates.notes !== undefined) updatePayload.notes = updates.notes?.trim() || null;

  if (updates.preferred_contact_method !== undefined) {
    const method = updates.preferred_contact_method?.trim() || null;
    if (method) assertValidPreferredContactMethod(method);
    updatePayload.preferred_contact_method = method;
  }

  const nextStatus = updates.status !== undefined ? updates.status : existing.status;
  if (updates.status !== undefined) {
    assertValidContactStatus(updates.status);
    updatePayload.status = updates.status;
  }

  const nextIsPrimary = updates.is_primary !== undefined ? updates.is_primary : existing.is_primary;

  // Deactivating a contact always clears its primary flag — an inactive
  // contact can never remain the designated primary.
  const willBePrimary = nextStatus === "active" && Boolean(nextIsPrimary);

  if (willBePrimary) {
    await clearActivePrimaryContact(existing.company_id, contactId);
    updatePayload.is_primary = true;
  } else if (updates.is_primary !== undefined || updates.status !== undefined) {
    updatePayload.is_primary = false;
  }

  const { data, error } = await supabaseServer
    .from("company_contacts")
    .update(updatePayload)
    .eq("id", contactId)
    .select(COMPANY_CONTACT_SELECT)
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return data as CompanyContactRecord;
}

export async function deactivateCompanyContactServer(contactId: string): Promise<CompanyContactRecord> {
  if (!supabaseServer) {
    throw new Error("Supabase service role key is not configured on the server.");
  }

  const { data, error } = await supabaseServer
    .from("company_contacts")
    .update({ status: "inactive", is_primary: false })
    .eq("id", contactId)
    .select(COMPANY_CONTACT_SELECT)
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return data as CompanyContactRecord;
}

export type ProjectRecord = {
  id: string;
  name: string;
  company_id: string | null;
  broker_id: string | null;
  inquiry_id: string | null;
  stage: string;
  estimated_value: string | null;
  expected_close_date: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  companies: { name: string } | null;
  brokers: { name: string } | null;
  inquiries: { contact_name: string | null; company_name: string | null; name: string | null } | null;
};

const PROJECT_SELECT =
  "id,name,company_id,broker_id,inquiry_id,stage,estimated_value,expected_close_date,notes,created_at,updated_at,companies(name),brokers(name),inquiries(contact_name,company_name,name)";

export async function getProjectsServer(): Promise<ProjectRecord[]> {
  if (!supabaseServer) {
    throw new Error("Supabase service role key is not configured on the server.");
  }

  const { data, error } = await supabaseServer
    .from("projects")
    .select(PROJECT_SELECT)
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []) as unknown as ProjectRecord[];
}

export async function getProjectByIdServer(id: string): Promise<ProjectRecord | null> {
  if (!supabaseServer) {
    throw new Error("Supabase service role key is not configured on the server.");
  }

  const { data, error } = await supabaseServer
    .from("projects")
    .select(PROJECT_SELECT)
    .eq("id", id)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return (data as unknown as ProjectRecord | null) ?? null;
}

// Company-scoped fetch (Phase 5.3, Stage 5.3.1A) — reuses PROJECT_SELECT so
// callers get the same shape as getProjectsServer(), just pre-filtered at
// the database level instead of fetching every project and filtering in
// memory (the pattern app/admin/companies/[id]/page.tsx currently uses).
export async function getProjectsForCompanyServer(companyId: string): Promise<ProjectRecord[]> {
  if (!supabaseServer) {
    throw new Error("Supabase service role key is not configured on the server.");
  }

  const { data, error } = await supabaseServer
    .from("projects")
    .select(PROJECT_SELECT)
    .eq("company_id", companyId)
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []) as unknown as ProjectRecord[];
}

export async function createProjectServer(input: {
  name: string;
  company_id?: string | null;
  broker_id?: string | null;
  inquiry_id?: string | null;
  stage?: string | null;
  estimated_value?: string | null;
  expected_close_date?: string | null;
  notes?: string | null;
}): Promise<ProjectRecord> {
  if (!supabaseServer) {
    throw new Error("Supabase service role key is not configured on the server.");
  }

  const name = input.name.trim();
  if (!name) {
    throw new Error("Project name is required.");
  }

  const { data, error } = await supabaseServer
    .from("projects")
    .insert({
      name,
      company_id: input.company_id || null,
      broker_id: input.broker_id || null,
      inquiry_id: input.inquiry_id || null,
      stage: input.stage?.trim() || "prospecting",
      estimated_value: input.estimated_value?.trim() || null,
      expected_close_date: input.expected_close_date || null,
      notes: input.notes?.trim() || null,
    })
    .select(PROJECT_SELECT)
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return data as unknown as ProjectRecord;
}

export async function updateProjectServer(
  id: string,
  updates: {
    name?: string;
    company_id?: string | null;
    broker_id?: string | null;
    inquiry_id?: string | null;
    stage?: string;
    estimated_value?: string | null;
    expected_close_date?: string | null;
    notes?: string | null;
  },
): Promise<ProjectRecord> {
  if (!supabaseServer) {
    throw new Error("Supabase service role key is not configured on the server.");
  }

  const updatePayload: Record<string, string | null> = {};

  if (updates.name !== undefined) updatePayload.name = updates.name.trim();
  if (updates.company_id !== undefined) updatePayload.company_id = updates.company_id || null;
  if (updates.broker_id !== undefined) updatePayload.broker_id = updates.broker_id || null;
  if (updates.inquiry_id !== undefined) updatePayload.inquiry_id = updates.inquiry_id || null;
  if (updates.stage !== undefined) updatePayload.stage = updates.stage;
  if (updates.estimated_value !== undefined) updatePayload.estimated_value = updates.estimated_value?.trim() || null;
  if (updates.expected_close_date !== undefined) updatePayload.expected_close_date = updates.expected_close_date || null;
  if (updates.notes !== undefined) updatePayload.notes = updates.notes?.trim() || null;

  const { data, error } = await supabaseServer
    .from("projects")
    .update(updatePayload)
    .eq("id", id)
    .select(PROJECT_SELECT)
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return data as unknown as ProjectRecord;
}

export type ContractRecord = {
  id: string;
  contract_number: string | null;
  title: string;
  company_id: string | null;
  project_id: string | null;
  broker_id: string | null;
  status: string;
  contract_value: string | null;
  start_date: string | null;
  end_date: string | null;
  signed_date: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  companies: { name: string } | null;
  projects: { name: string } | null;
  brokers: { name: string } | null;
};

const CONTRACT_SELECT =
  "id,contract_number,title,company_id,project_id,broker_id,status,contract_value,start_date,end_date,signed_date,notes,created_at,updated_at,companies(name),projects(name),brokers(name)";

export async function getContractsServer(): Promise<ContractRecord[]> {
  if (!supabaseServer) {
    throw new Error("Supabase service role key is not configured on the server.");
  }

  const { data, error } = await supabaseServer
    .from("contracts")
    .select(CONTRACT_SELECT)
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []) as unknown as ContractRecord[];
}

export async function getContractByIdServer(id: string): Promise<ContractRecord | null> {
  if (!supabaseServer) {
    throw new Error("Supabase service role key is not configured on the server.");
  }

  const { data, error } = await supabaseServer
    .from("contracts")
    .select(CONTRACT_SELECT)
    .eq("id", id)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return (data as unknown as ContractRecord | null) ?? null;
}

// Company-scoped fetch (Phase 5.3, Stage 5.3.1A) — same rationale as
// getProjectsForCompanyServer above.
export async function getContractsForCompanyServer(companyId: string): Promise<ContractRecord[]> {
  if (!supabaseServer) {
    throw new Error("Supabase service role key is not configured on the server.");
  }

  const { data, error } = await supabaseServer
    .from("contracts")
    .select(CONTRACT_SELECT)
    .eq("company_id", companyId)
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []) as unknown as ContractRecord[];
}

export async function createContractServer(input: {
  title: string;
  contract_number?: string | null;
  company_id?: string | null;
  project_id?: string | null;
  broker_id?: string | null;
  status?: string | null;
  contract_value?: string | null;
  start_date?: string | null;
  end_date?: string | null;
  signed_date?: string | null;
  notes?: string | null;
}): Promise<ContractRecord> {
  if (!supabaseServer) {
    throw new Error("Supabase service role key is not configured on the server.");
  }

  const title = input.title.trim();
  if (!title) {
    throw new Error("Contract title is required.");
  }

  const { data, error } = await supabaseServer
    .from("contracts")
    .insert({
      title,
      contract_number: input.contract_number?.trim() || null,
      company_id: input.company_id || null,
      project_id: input.project_id || null,
      broker_id: input.broker_id || null,
      status: input.status?.trim() || "draft",
      contract_value: input.contract_value?.trim() || null,
      start_date: input.start_date || null,
      end_date: input.end_date || null,
      signed_date: input.signed_date || null,
      notes: input.notes?.trim() || null,
    })
    .select(CONTRACT_SELECT)
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return data as unknown as ContractRecord;
}

export async function updateContractServer(
  id: string,
  updates: {
    title?: string;
    contract_number?: string | null;
    company_id?: string | null;
    project_id?: string | null;
    broker_id?: string | null;
    status?: string;
    contract_value?: string | null;
    start_date?: string | null;
    end_date?: string | null;
    signed_date?: string | null;
    notes?: string | null;
  },
): Promise<ContractRecord> {
  if (!supabaseServer) {
    throw new Error("Supabase service role key is not configured on the server.");
  }

  const updatePayload: Record<string, string | null> = {};

  if (updates.title !== undefined) updatePayload.title = updates.title.trim();
  if (updates.contract_number !== undefined) updatePayload.contract_number = updates.contract_number?.trim() || null;
  if (updates.company_id !== undefined) updatePayload.company_id = updates.company_id || null;
  if (updates.project_id !== undefined) updatePayload.project_id = updates.project_id || null;
  if (updates.broker_id !== undefined) updatePayload.broker_id = updates.broker_id || null;
  if (updates.status !== undefined) updatePayload.status = updates.status;
  if (updates.contract_value !== undefined) updatePayload.contract_value = updates.contract_value?.trim() || null;
  if (updates.start_date !== undefined) updatePayload.start_date = updates.start_date || null;
  if (updates.end_date !== undefined) updatePayload.end_date = updates.end_date || null;
  if (updates.signed_date !== undefined) updatePayload.signed_date = updates.signed_date || null;
  if (updates.notes !== undefined) updatePayload.notes = updates.notes?.trim() || null;

  const { data, error } = await supabaseServer
    .from("contracts")
    .update(updatePayload)
    .eq("id", id)
    .select(CONTRACT_SELECT)
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return data as unknown as ContractRecord;
}

export type DocumentRecord = {
  id: string;
  inquiry_id: string | null;
  company_id: string | null;
  project_id: string | null;
  contract_id: string | null;
  file_name: string;
  storage_path: string;
  file_size: number | null;
  mime_type: string | null;
  uploaded_by: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export type DocumentWithUrl = DocumentRecord & { download_url: string | null };

const DOCUMENT_BUCKET = "documents";
const DOCUMENT_SELECT =
  "id,inquiry_id,company_id,project_id,contract_id,file_name,storage_path,file_size,mime_type,uploaded_by,notes,created_at,updated_at";
const MAX_DOCUMENT_BYTES = 25 * 1024 * 1024;

const sanitizeFileName = (name: string) => {
  const trimmed = name.trim().replace(/[^a-zA-Z0-9._-]/g, "_");
  return trimmed.slice(-150) || "file";
};

export type EntityLinks = {
  inquiry_id?: string | null;
  company_id?: string | null;
  project_id?: string | null;
  contract_id?: string | null;
};

export async function getRecentDocumentsServer(limit = 50): Promise<DocumentRecord[]> {
  if (!supabaseServer) {
    throw new Error("Supabase service role key is not configured on the server.");
  }

  const { data, error } = await supabaseServer
    .from("documents")
    .select(DOCUMENT_SELECT)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []) as DocumentRecord[];
}

// Desk-wide, unlimited fetch (Phase 5.3, Stage 5.3.3) — same convention as
// getAllRemindersServer()/getAllCompanyContactsServer(). Distinct from
// getRecentDocumentsServer() above, whose limit exists to cap an activity
// feed: portfolio health scoring reads the newest interaction per company,
// so a desk-wide row cap would silently make older-but-active companies
// look inactive. Returns DocumentRecord (no signed URLs) — unlike
// getDocumentsForEntityServer below, which signs each row for download.
export async function getAllDocumentsServer(): Promise<DocumentRecord[]> {
  if (!supabaseServer) {
    throw new Error("Supabase service role key is not configured on the server.");
  }

  const { data, error } = await supabaseServer
    .from("documents")
    .select(DOCUMENT_SELECT)
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []) as DocumentRecord[];
}

export async function getDocumentsForEntityServer(links: EntityLinks): Promise<DocumentWithUrl[]> {
  if (!supabaseServer) {
    throw new Error("Supabase service role key is not configured on the server.");
  }

  let query = supabaseServer.from("documents").select(DOCUMENT_SELECT).order("created_at", { ascending: false });

  if (links.inquiry_id) query = query.eq("inquiry_id", links.inquiry_id);
  else if (links.company_id) query = query.eq("company_id", links.company_id);
  else if (links.project_id) query = query.eq("project_id", links.project_id);
  else if (links.contract_id) query = query.eq("contract_id", links.contract_id);
  else throw new Error("At least one entity link is required to list documents.");

  const { data, error } = await query;

  if (error) {
    throw new Error(error.message);
  }

  const documents = (data ?? []) as DocumentRecord[];

  const withUrls = await Promise.all(
    documents.map(async (document) => {
      const { data: signed } = await supabaseServer!.storage
        .from(DOCUMENT_BUCKET)
        .createSignedUrl(document.storage_path, 3600);
      return { ...document, download_url: signed?.signedUrl ?? null };
    }),
  );

  return withUrls;
}

export async function uploadDocumentServer(input: {
  file: File;
  notes?: string | null;
  links: EntityLinks;
}): Promise<DocumentRecord> {
  if (!supabaseServer) {
    throw new Error("Supabase service role key is not configured on the server.");
  }

  const { inquiry_id, company_id, project_id, contract_id } = input.links;
  if (!inquiry_id && !company_id && !project_id && !contract_id) {
    throw new Error("At least one entity link is required to upload a document.");
  }

  if (input.file.size > MAX_DOCUMENT_BYTES) {
    throw new Error("File is too large. Maximum size is 25MB.");
  }

  const safeName = sanitizeFileName(input.file.name || "file");
  const storagePath = `${crypto.randomUUID()}-${safeName}`;

  const arrayBuffer = await input.file.arrayBuffer();

  const { error: uploadError } = await supabaseServer.storage
    .from(DOCUMENT_BUCKET)
    .upload(storagePath, arrayBuffer, {
      contentType: input.file.type || "application/octet-stream",
      upsert: false,
    });

  if (uploadError) {
    throw new Error(uploadError.message);
  }

  const { data, error } = await supabaseServer
    .from("documents")
    .insert({
      inquiry_id: inquiry_id || null,
      company_id: company_id || null,
      project_id: project_id || null,
      contract_id: contract_id || null,
      file_name: input.file.name || safeName,
      storage_path: storagePath,
      file_size: input.file.size,
      mime_type: input.file.type || null,
      notes: input.notes?.trim() || null,
    })
    .select(DOCUMENT_SELECT)
    .single();

  if (error) {
    // Clean up the orphaned storage object if the metadata insert failed.
    await supabaseServer.storage.from(DOCUMENT_BUCKET).remove([storagePath]);
    throw new Error(error.message);
  }

  return data as DocumentRecord;
}

export async function deleteDocumentServer(id: string): Promise<void> {
  if (!supabaseServer) {
    throw new Error("Supabase service role key is not configured on the server.");
  }

  const { data: document, error: fetchError } = await supabaseServer
    .from("documents")
    .select("storage_path")
    .eq("id", id)
    .maybeSingle();

  if (fetchError) {
    throw new Error(fetchError.message);
  }

  if (!document) {
    return;
  }

  const { error: deleteRowError } = await supabaseServer.from("documents").delete().eq("id", id);
  if (deleteRowError) {
    throw new Error(deleteRowError.message);
  }

  await supabaseServer.storage.from(DOCUMENT_BUCKET).remove([document.storage_path]);
}

export type EmailRecord = {
  id: string;
  inquiry_id: string | null;
  company_id: string | null;
  project_id: string | null;
  contract_id: string | null;
  direction: string;
  subject: string;
  body: string | null;
  from_address: string | null;
  to_address: string | null;
  sent_at: string;
  logged_by: string;
  created_at: string;
  updated_at: string;
};

const EMAIL_SELECT =
  "id,inquiry_id,company_id,project_id,contract_id,direction,subject,body,from_address,to_address,sent_at,logged_by,created_at,updated_at";

export async function getRecentEmailsServer(limit = 50): Promise<EmailRecord[]> {
  if (!supabaseServer) {
    throw new Error("Supabase service role key is not configured on the server.");
  }

  const { data, error } = await supabaseServer
    .from("emails")
    .select(EMAIL_SELECT)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []) as EmailRecord[];
}

// Desk-wide, unlimited fetch (Phase 5.3, Stage 5.3.3) — same rationale as
// getAllDocumentsServer() above: the limit on getRecentEmailsServer() is an
// activity-feed concern, and applying it to health scoring would misreport
// last-interaction dates for companies outside the newest N rows.
export async function getAllEmailsServer(): Promise<EmailRecord[]> {
  if (!supabaseServer) {
    throw new Error("Supabase service role key is not configured on the server.");
  }

  const { data, error } = await supabaseServer
    .from("emails")
    .select(EMAIL_SELECT)
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []) as EmailRecord[];
}

export async function getEmailsForEntityServer(links: EntityLinks): Promise<EmailRecord[]> {
  if (!supabaseServer) {
    throw new Error("Supabase service role key is not configured on the server.");
  }

  let query = supabaseServer.from("emails").select(EMAIL_SELECT).order("sent_at", { ascending: false });

  if (links.inquiry_id) query = query.eq("inquiry_id", links.inquiry_id);
  else if (links.company_id) query = query.eq("company_id", links.company_id);
  else if (links.project_id) query = query.eq("project_id", links.project_id);
  else if (links.contract_id) query = query.eq("contract_id", links.contract_id);
  else throw new Error("At least one entity link is required to list emails.");

  const { data, error } = await query;

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []) as EmailRecord[];
}

export async function createEmailServer(input: {
  subject: string;
  direction?: string | null;
  body?: string | null;
  from_address?: string | null;
  to_address?: string | null;
  sent_at?: string | null;
  links: EntityLinks;
}): Promise<EmailRecord> {
  if (!supabaseServer) {
    throw new Error("Supabase service role key is not configured on the server.");
  }

  const subject = input.subject.trim();
  if (!subject) {
    throw new Error("Email subject is required.");
  }

  const { inquiry_id, company_id, project_id, contract_id } = input.links;
  if (!inquiry_id && !company_id && !project_id && !contract_id) {
    throw new Error("At least one entity link is required to log an email.");
  }

  const { data, error } = await supabaseServer
    .from("emails")
    .insert({
      inquiry_id: inquiry_id || null,
      company_id: company_id || null,
      project_id: project_id || null,
      contract_id: contract_id || null,
      subject,
      direction: input.direction?.trim() || "outbound",
      body: input.body?.trim() || null,
      from_address: input.from_address?.trim() || null,
      to_address: input.to_address?.trim() || null,
      sent_at: input.sent_at || new Date().toISOString(),
    })
    .select(EMAIL_SELECT)
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return data as EmailRecord;
}

export async function updateEmailServer(
  id: string,
  updates: {
    subject?: string;
    direction?: string;
    body?: string | null;
    from_address?: string | null;
    to_address?: string | null;
    sent_at?: string;
  },
): Promise<EmailRecord> {
  if (!supabaseServer) {
    throw new Error("Supabase service role key is not configured on the server.");
  }

  const updatePayload: Record<string, string | null> = {};

  if (updates.subject !== undefined) updatePayload.subject = updates.subject.trim();
  if (updates.direction !== undefined) updatePayload.direction = updates.direction;
  if (updates.body !== undefined) updatePayload.body = updates.body?.trim() || null;
  if (updates.from_address !== undefined) updatePayload.from_address = updates.from_address?.trim() || null;
  if (updates.to_address !== undefined) updatePayload.to_address = updates.to_address?.trim() || null;
  if (updates.sent_at !== undefined) updatePayload.sent_at = updates.sent_at;

  const { data, error } = await supabaseServer
    .from("emails")
    .update(updatePayload)
    .eq("id", id)
    .select(EMAIL_SELECT)
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return data as EmailRecord;
}

export async function deleteEmailServer(id: string): Promise<void> {
  if (!supabaseServer) {
    throw new Error("Supabase service role key is not configured on the server.");
  }

  const { error } = await supabaseServer.from("emails").delete().eq("id", id);
  if (error) {
    throw new Error(error.message);
  }
}

export type AdminUserRecord = {
  id: string;
  name: string;
  email: string | null;
  role: string;
  access_code_hash: string;
  status: string;
  created_at: string;
  updated_at: string;
};

const ADMIN_USER_SELECT = "id,name,email,role,access_code_hash,status,created_at,updated_at";

export async function getAdminUsersServer(): Promise<AdminUserRecord[]> {
  if (!supabaseServer) {
    throw new Error("Supabase service role key is not configured on the server.");
  }

  const { data, error } = await supabaseServer
    .from("admin_users")
    .select(ADMIN_USER_SELECT)
    .order("name", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []) as AdminUserRecord[];
}

export async function getAdminUserByIdServer(id: string): Promise<AdminUserRecord | null> {
  if (!supabaseServer) {
    throw new Error("Supabase service role key is not configured on the server.");
  }

  const { data, error } = await supabaseServer
    .from("admin_users")
    .select(ADMIN_USER_SELECT)
    .eq("id", id)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return (data as AdminUserRecord | null) ?? null;
}

export async function createAdminUserServer(input: {
  name: string;
  email?: string | null;
  role: string;
  access_code_hash: string;
}): Promise<AdminUserRecord> {
  if (!supabaseServer) {
    throw new Error("Supabase service role key is not configured on the server.");
  }

  const name = input.name.trim();
  if (!name) {
    throw new Error("Name is required.");
  }

  const { data, error } = await supabaseServer
    .from("admin_users")
    .insert({
      name,
      email: input.email?.trim() || null,
      role: input.role,
      access_code_hash: input.access_code_hash,
    })
    .select(ADMIN_USER_SELECT)
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return data as AdminUserRecord;
}

export async function updateAdminUserServer(
  id: string,
  updates: {
    name?: string;
    email?: string | null;
    role?: string;
    status?: string;
    access_code_hash?: string;
  },
): Promise<AdminUserRecord> {
  if (!supabaseServer) {
    throw new Error("Supabase service role key is not configured on the server.");
  }

  const updatePayload: Record<string, string | null> = {};

  if (updates.name !== undefined) updatePayload.name = updates.name.trim();
  if (updates.email !== undefined) updatePayload.email = updates.email?.trim() || null;
  if (updates.role !== undefined) updatePayload.role = updates.role;
  if (updates.status !== undefined) updatePayload.status = updates.status;
  if (updates.access_code_hash !== undefined) updatePayload.access_code_hash = updates.access_code_hash;

  const { data, error } = await supabaseServer
    .from("admin_users")
    .update(updatePayload)
    .eq("id", id)
    .select(ADMIN_USER_SELECT)
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return data as AdminUserRecord;
}

export type ReminderRecord = {
  id: string;
  inquiry_id: string | null;
  company_id: string | null;
  project_id: string | null;
  contract_id: string | null;
  title: string;
  notes: string | null;
  due_at: string;
  status: string;
  assigned_to: string | null;
  created_at: string;
  updated_at: string;
};

const REMINDER_SELECT =
  "id,inquiry_id,company_id,project_id,contract_id,title,notes,due_at,status,assigned_to,created_at,updated_at";

export async function getRemindersForEntityServer(links: EntityLinks): Promise<ReminderRecord[]> {
  if (!supabaseServer) {
    throw new Error("Supabase service role key is not configured on the server.");
  }

  let query = supabaseServer.from("reminders").select(REMINDER_SELECT).order("due_at", { ascending: true });

  if (links.inquiry_id) query = query.eq("inquiry_id", links.inquiry_id);
  else if (links.company_id) query = query.eq("company_id", links.company_id);
  else if (links.project_id) query = query.eq("project_id", links.project_id);
  else if (links.contract_id) query = query.eq("contract_id", links.contract_id);
  else throw new Error("At least one entity link is required to list reminders.");

  const { data, error } = await query;

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []) as ReminderRecord[];
}

export async function getAllRemindersServer(): Promise<ReminderRecord[]> {
  if (!supabaseServer) {
    throw new Error("Supabase service role key is not configured on the server.");
  }

  const { data, error } = await supabaseServer
    .from("reminders")
    .select(REMINDER_SELECT)
    .order("due_at", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []) as ReminderRecord[];
}

export async function createReminderServer(input: {
  title: string;
  notes?: string | null;
  due_at: string;
  links: EntityLinks;
}): Promise<ReminderRecord> {
  if (!supabaseServer) {
    throw new Error("Supabase service role key is not configured on the server.");
  }

  const title = input.title.trim();
  if (!title) {
    throw new Error("Reminder title is required.");
  }

  if (!input.due_at) {
    throw new Error("A due date is required.");
  }

  const { inquiry_id, company_id, project_id, contract_id } = input.links;
  if (!inquiry_id && !company_id && !project_id && !contract_id) {
    throw new Error("At least one entity link is required to create a reminder.");
  }

  const { data, error } = await supabaseServer
    .from("reminders")
    .insert({
      inquiry_id: inquiry_id || null,
      company_id: company_id || null,
      project_id: project_id || null,
      contract_id: contract_id || null,
      title,
      notes: input.notes?.trim() || null,
      due_at: input.due_at,
    })
    .select(REMINDER_SELECT)
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return data as ReminderRecord;
}

export async function updateReminderServer(
  id: string,
  updates: { title?: string; notes?: string | null; due_at?: string; status?: string },
): Promise<ReminderRecord> {
  if (!supabaseServer) {
    throw new Error("Supabase service role key is not configured on the server.");
  }

  const updatePayload: Record<string, string | null> = {};

  if (updates.title !== undefined) updatePayload.title = updates.title.trim();
  if (updates.notes !== undefined) updatePayload.notes = updates.notes?.trim() || null;
  if (updates.due_at !== undefined) updatePayload.due_at = updates.due_at;
  if (updates.status !== undefined) updatePayload.status = updates.status;

  const { data, error } = await supabaseServer
    .from("reminders")
    .update(updatePayload)
    .eq("id", id)
    .select(REMINDER_SELECT)
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return data as ReminderRecord;
}

export async function deleteReminderServer(id: string): Promise<void> {
  if (!supabaseServer) {
    throw new Error("Supabase service role key is not configured on the server.");
  }

  const { error } = await supabaseServer.from("reminders").delete().eq("id", id);
  if (error) {
    throw new Error(error.message);
  }
}

// ─── Client Support Center (Phase 5.2, Stage 5.2.2.1) ───────────────────
// Support requests raised by clients/brokers against a company, optionally
// attributed to a specific company contact, tracked through to resolution.

export type SupportRequestRecord = {
  id: string;
  company_id: string;
  contact_id: string | null;
  category: string;
  priority: string;
  subject: string;
  message: string;
  status: string;
  assigned_to: string | null;
  created_at: string;
  updated_at: string;
  resolved_at: string | null;
  companies: { name: string } | null;
  company_contacts: { first_name: string; last_name: string | null } | null;
  admin_users: { name: string } | null;
};

const SUPPORT_REQUEST_SELECT =
  "id,company_id,contact_id,category,priority,subject,message,status,assigned_to,created_at,updated_at,resolved_at,companies(name),company_contacts(first_name,last_name),admin_users(name)";

const VALID_SUPPORT_CATEGORIES = new Set([
  "technical_problem",
  "brokerage_inquiry",
  "account_question",
  "suggestion",
  "general_feedback",
  "report_bug",
]);

const VALID_SUPPORT_PRIORITIES = new Set(["normal", "high", "urgent"]);

const VALID_SUPPORT_STATUSES = new Set(["new", "open", "in_progress", "waiting_for_client", "resolved", "closed"]);

const RESOLVED_SUPPORT_STATUSES = new Set(["resolved", "closed"]);

export function assertValidSupportCategory(category: string): void {
  if (!VALID_SUPPORT_CATEGORIES.has(category)) {
    throw new Error("Invalid support request category.");
  }
}

export function assertValidSupportPriority(priority: string): void {
  if (!VALID_SUPPORT_PRIORITIES.has(priority)) {
    throw new Error("Priority must be 'normal', 'high', or 'urgent'.");
  }
}

export function assertValidSupportStatus(status: string): void {
  if (!VALID_SUPPORT_STATUSES.has(status)) {
    throw new Error("Invalid support request status.");
  }
}

export async function getSupportRequestsServer(): Promise<SupportRequestRecord[]> {
  if (!supabaseServer) {
    throw new Error("Supabase service role key is not configured on the server.");
  }

  const { data, error } = await supabaseServer
    .from("support_requests")
    .select(SUPPORT_REQUEST_SELECT)
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []) as unknown as SupportRequestRecord[];
}

export async function getSupportRequestsForCompanyServer(companyId: string): Promise<SupportRequestRecord[]> {
  if (!supabaseServer) {
    throw new Error("Supabase service role key is not configured on the server.");
  }

  const { data, error } = await supabaseServer
    .from("support_requests")
    .select(SUPPORT_REQUEST_SELECT)
    .eq("company_id", companyId)
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []) as unknown as SupportRequestRecord[];
}

export async function getSupportRequestServer(id: string): Promise<SupportRequestRecord | null> {
  if (!supabaseServer) {
    throw new Error("Supabase service role key is not configured on the server.");
  }

  const { data, error } = await supabaseServer
    .from("support_requests")
    .select(SUPPORT_REQUEST_SELECT)
    .eq("id", id)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return (data as unknown as SupportRequestRecord | null) ?? null;
}

export async function createSupportRequestServer(input: {
  company_id: string;
  contact_id?: string | null;
  category: string;
  priority?: string | null;
  subject: string;
  message: string;
}): Promise<SupportRequestRecord> {
  if (!supabaseServer) {
    throw new Error("Supabase service role key is not configured on the server.");
  }

  const subject = input.subject.trim();
  if (!subject) {
    throw new Error("Subject is required.");
  }

  const message = input.message.trim();
  if (!message) {
    throw new Error("Message is required.");
  }

  assertValidSupportCategory(input.category);

  const priority = input.priority?.trim() || "normal";
  assertValidSupportPriority(priority);

  const company = await getCompanyByIdServer(input.company_id);
  if (!company) {
    throw new Error("Company not found.");
  }

  if (input.contact_id) {
    const contact = await getCompanyContactServer(input.contact_id);
    if (!contact || contact.company_id !== input.company_id) {
      throw new Error("Contact does not belong to this company.");
    }
  }

  const { data, error } = await supabaseServer
    .from("support_requests")
    .insert({
      company_id: input.company_id,
      contact_id: input.contact_id || null,
      category: input.category,
      priority,
      subject,
      message,
    })
    .select(SUPPORT_REQUEST_SELECT)
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return data as unknown as SupportRequestRecord;
}

export async function updateSupportRequestServer(
  id: string,
  updates: {
    category?: string;
    priority?: string;
    status?: string;
    assigned_to?: string | null;
  },
): Promise<SupportRequestRecord> {
  if (!supabaseServer) {
    throw new Error("Supabase service role key is not configured on the server.");
  }

  const existing = await getSupportRequestServer(id);
  if (!existing) {
    throw new Error("Support request not found.");
  }

  const updatePayload: Record<string, string | null> = {};

  if (updates.category !== undefined) {
    assertValidSupportCategory(updates.category);
    updatePayload.category = updates.category;
  }

  if (updates.priority !== undefined) {
    assertValidSupportPriority(updates.priority);
    updatePayload.priority = updates.priority;
  }

  if (updates.assigned_to !== undefined) {
    updatePayload.assigned_to = updates.assigned_to || null;
  }

  if (updates.status !== undefined) {
    assertValidSupportStatus(updates.status);
    updatePayload.status = updates.status;

    // Stamp resolved_at the first time a request reaches a resolved state;
    // clear it if the request is reopened into any non-resolved status.
    if (RESOLVED_SUPPORT_STATUSES.has(updates.status)) {
      updatePayload.resolved_at = existing.resolved_at ?? new Date().toISOString();
    } else {
      updatePayload.resolved_at = null;
    }
  }

  const { data, error } = await supabaseServer
    .from("support_requests")
    .update(updatePayload)
    .eq("id", id)
    .select(SUPPORT_REQUEST_SELECT)
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return data as unknown as SupportRequestRecord;
}

// ─── Support Notifications (Phase 5.2, Stage 5.2.3) ──────────────────────
// A delivery-attempt log for support-request transactional emails. Rows are
// written synchronously around each provider call — this is an audit trail,
// not a message queue. See lib/support-notification-helpers.ts for the
// orchestration (recipient selection, idempotency, dispatch) that writes to
// this table; the functions below are plain data-access, matching every
// other *Server helper in this file.

export type SupportNotificationRecord = {
  id: string;
  support_request_id: string;
  company_id: string;
  contact_id: string | null;
  notification_type: string;
  recipient_email: string;
  recipient_name: string | null;
  subject: string;
  provider: string | null;
  provider_message_id: string | null;
  delivery_status: string;
  error_message: string | null;
  metadata: Record<string, unknown>;
  idempotency_key: string;
  attempted_at: string | null;
  sent_at: string | null;
  created_at: string;
  updated_at: string;
};

const SUPPORT_NOTIFICATION_SELECT =
  "id,support_request_id,company_id,contact_id,notification_type,recipient_email,recipient_name,subject,provider,provider_message_id,delivery_status,error_message,metadata,idempotency_key,attempted_at,sent_at,created_at,updated_at";

export async function getSupportNotificationsForRequestServer(
  supportRequestId: string,
): Promise<SupportNotificationRecord[]> {
  if (!supabaseServer) {
    throw new Error("Supabase service role key is not configured on the server.");
  }

  const { data, error } = await supabaseServer
    .from("support_notifications")
    .select(SUPPORT_NOTIFICATION_SELECT)
    .eq("support_request_id", supportRequestId)
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []) as unknown as SupportNotificationRecord[];
}

export async function getSupportNotificationsForCompanyServer(companyId: string): Promise<SupportNotificationRecord[]> {
  if (!supabaseServer) {
    throw new Error("Supabase service role key is not configured on the server.");
  }

  const { data, error } = await supabaseServer
    .from("support_notifications")
    .select(SUPPORT_NOTIFICATION_SELECT)
    .eq("company_id", companyId)
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []) as unknown as SupportNotificationRecord[];
}

export async function getAllSupportNotificationsServer(): Promise<SupportNotificationRecord[]> {
  if (!supabaseServer) {
    throw new Error("Supabase service role key is not configured on the server.");
  }

  const { data, error } = await supabaseServer
    .from("support_notifications")
    .select(SUPPORT_NOTIFICATION_SELECT)
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []) as unknown as SupportNotificationRecord[];
}

export async function getSupportNotificationServer(id: string): Promise<SupportNotificationRecord | null> {
  if (!supabaseServer) {
    throw new Error("Supabase service role key is not configured on the server.");
  }

  const { data, error } = await supabaseServer
    .from("support_notifications")
    .select(SUPPORT_NOTIFICATION_SELECT)
    .eq("id", id)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return (data as unknown as SupportNotificationRecord | null) ?? null;
}

export async function getSupportNotificationByIdempotencyKeyServer(
  idempotencyKey: string,
): Promise<SupportNotificationRecord | null> {
  if (!supabaseServer) {
    throw new Error("Supabase service role key is not configured on the server.");
  }

  const { data, error } = await supabaseServer
    .from("support_notifications")
    .select(SUPPORT_NOTIFICATION_SELECT)
    .eq("idempotency_key", idempotencyKey)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return (data as unknown as SupportNotificationRecord | null) ?? null;
}

// Idempotent insert: returns the existing row for this idempotency_key if
// one already exists (the normal path for a duplicate submission/retry),
// otherwise inserts a new 'pending' row. A unique-violation race (two
// concurrent requests for the same event) is handled by re-selecting rather
// than erroring — see support_notifications_idempotency_key_idx in
// migration 015.
export async function getOrCreatePendingSupportNotificationServer(input: {
  support_request_id: string;
  company_id: string;
  contact_id?: string | null;
  notification_type: string;
  recipient_email: string;
  recipient_name?: string | null;
  subject: string;
  idempotency_key: string;
  metadata?: Record<string, unknown>;
}): Promise<{ record: SupportNotificationRecord; created: boolean }> {
  if (!supabaseServer) {
    throw new Error("Supabase service role key is not configured on the server.");
  }

  const existing = await getSupportNotificationByIdempotencyKeyServer(input.idempotency_key);
  if (existing) {
    return { record: existing, created: false };
  }

  const { data, error } = await supabaseServer
    .from("support_notifications")
    .insert({
      support_request_id: input.support_request_id,
      company_id: input.company_id,
      contact_id: input.contact_id || null,
      notification_type: input.notification_type,
      recipient_email: input.recipient_email,
      recipient_name: input.recipient_name?.trim() || null,
      subject: input.subject,
      delivery_status: "pending",
      metadata: input.metadata ?? {},
      idempotency_key: input.idempotency_key,
      attempted_at: new Date().toISOString(),
    })
    .select(SUPPORT_NOTIFICATION_SELECT)
    .single();

  if (error) {
    // 23505 = unique_violation — a concurrent request already inserted this
    // exact idempotency_key between our check and our insert. Treat that
    // race the same as finding it up front: return the winner's row.
    if (error.code === "23505") {
      const winner = await getSupportNotificationByIdempotencyKeyServer(input.idempotency_key);
      if (winner) {
        return { record: winner, created: false };
      }
    }
    throw new Error(error.message);
  }

  return { record: data as unknown as SupportNotificationRecord, created: true };
}

export async function updateSupportNotificationDeliveryServer(
  id: string,
  updates: {
    delivery_status: string;
    provider?: string | null;
    provider_message_id?: string | null;
    error_message?: string | null;
    sent_at?: string | null;
  },
): Promise<SupportNotificationRecord> {
  if (!supabaseServer) {
    throw new Error("Supabase service role key is not configured on the server.");
  }

  const updatePayload: Record<string, string | null> = {
    delivery_status: updates.delivery_status,
  };

  if (updates.provider !== undefined) updatePayload.provider = updates.provider;
  if (updates.provider_message_id !== undefined) updatePayload.provider_message_id = updates.provider_message_id;
  if (updates.error_message !== undefined) updatePayload.error_message = updates.error_message;
  if (updates.sent_at !== undefined) updatePayload.sent_at = updates.sent_at;

  const { data, error } = await supabaseServer
    .from("support_notifications")
    .update(updatePayload)
    .eq("id", id)
    .select(SUPPORT_NOTIFICATION_SELECT)
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return data as unknown as SupportNotificationRecord;
}

// ─── Deal Matching (Phase 5.1) ───────────────────────────────────────────
// Decision-support only — every row here is a suggestion for human review.
// Nothing in this file writes to public.inquiries, sends communication, or
// changes any other resource as a side effect of a match.

export type DealMatchRecord = {
  id: string;
  buyer_inquiry_id: string;
  seller_inquiry_id: string;
  buyer_company_id: string | null;
  seller_company_id: string | null;
  assigned_broker_id: string | null;
  compatibility_score: number;
  opportunity_score: number;
  confidence: string;
  match_version: string;
  product_score: number;
  quantity_score: number;
  geography_score: number;
  incoterms_score: number;
  payment_terms_score: number;
  timing_score: number;
  document_readiness_score: number;
  trust_score: number;
  risk_penalty: number;
  explanation: Record<string, unknown>;
  strengths: string[];
  conflicts: string[];
  missing_information: string[];
  recommended_next_action: string | null;
  match_status: string;
  broker_decision: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  ai_recommendation: string | null;
  ai_reasoning: string | null;
  final_outcome: string | null;
  created_at: string;
  updated_at: string;
};

const DEAL_MATCH_SELECT =
  "id,buyer_inquiry_id,seller_inquiry_id,buyer_company_id,seller_company_id,assigned_broker_id,compatibility_score,opportunity_score,confidence,match_version,product_score,quantity_score,geography_score,incoterms_score,payment_terms_score,timing_score,document_readiness_score,trust_score,risk_penalty,explanation,strengths,conflicts,missing_information,recommended_next_action,match_status,broker_decision,reviewed_by,reviewed_at,ai_recommendation,ai_reasoning,final_outcome,created_at,updated_at";

export async function getDealMatchesServer(filters?: {
  status?: string | null;
  inquiryId?: string | null;
}): Promise<DealMatchRecord[]> {
  if (!supabaseServer) {
    throw new Error("Supabase service role key is not configured on the server.");
  }

  let query = supabaseServer.from("deal_matches").select(DEAL_MATCH_SELECT).order("opportunity_score", { ascending: false });

  if (filters?.status) query = query.eq("match_status", filters.status);
  // inquiryId is interpolated into a raw PostgREST filter string below, so it
  // must be validated as a UUID first — otherwise a crafted query param could
  // inject additional filter clauses.
  if (filters?.inquiryId && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(filters.inquiryId)) {
    query = query.or(`buyer_inquiry_id.eq.${filters.inquiryId},seller_inquiry_id.eq.${filters.inquiryId}`);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []) as DealMatchRecord[];
}

export async function getDealMatchByIdServer(id: string): Promise<DealMatchRecord | null> {
  if (!supabaseServer) {
    throw new Error("Supabase service role key is not configured on the server.");
  }

  const { data, error } = await supabaseServer.from("deal_matches").select(DEAL_MATCH_SELECT).eq("id", id).maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? null) as DealMatchRecord | null;
}

// Company-scoped fetch (Phase 5.3, Stage 5.3.1A) — a company can appear as
// either the buyer or the seller side of a match, so this checks both
// columns. companyId is validated as a UUID before being interpolated into
// the raw .or() filter string below, same safeguard getDealMatchesServer()
// already applies to inquiryId.
export async function getDealMatchesForCompanyServer(companyId: string): Promise<DealMatchRecord[]> {
  if (!supabaseServer) {
    throw new Error("Supabase service role key is not configured on the server.");
  }

  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(companyId)) {
    return [];
  }

  const { data, error } = await supabaseServer
    .from("deal_matches")
    .select(DEAL_MATCH_SELECT)
    .or(`buyer_company_id.eq.${companyId},seller_company_id.eq.${companyId}`)
    .order("opportunity_score", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []) as DealMatchRecord[];
}

// Insert-or-refresh a computed match. Uses the (buyer_inquiry_id,
// seller_inquiry_id) unique constraint so recomputing scores for the same
// pair updates the existing row (and preserves its review state) rather than
// creating a duplicate.
export async function upsertDealMatchServer(input: {
  buyer_inquiry_id: string;
  seller_inquiry_id: string;
  buyer_company_id?: string | null;
  seller_company_id?: string | null;
  assigned_broker_id?: string | null;
  compatibility_score: number;
  opportunity_score: number;
  confidence: string;
  match_version: string;
  product_score: number;
  quantity_score: number;
  geography_score: number;
  incoterms_score: number;
  payment_terms_score: number;
  timing_score: number;
  document_readiness_score: number;
  trust_score: number;
  risk_penalty: number;
  explanation: Record<string, unknown>;
  strengths: string[];
  conflicts: string[];
  missing_information: string[];
  recommended_next_action: string | null;
}): Promise<DealMatchRecord> {
  if (!supabaseServer) {
    throw new Error("Supabase service role key is not configured on the server.");
  }

  const { data, error } = await supabaseServer
    .from("deal_matches")
    .upsert(
      {
        buyer_inquiry_id: input.buyer_inquiry_id,
        seller_inquiry_id: input.seller_inquiry_id,
        buyer_company_id: input.buyer_company_id ?? null,
        seller_company_id: input.seller_company_id ?? null,
        assigned_broker_id: input.assigned_broker_id ?? null,
        compatibility_score: input.compatibility_score,
        opportunity_score: input.opportunity_score,
        confidence: input.confidence,
        match_version: input.match_version,
        product_score: input.product_score,
        quantity_score: input.quantity_score,
        geography_score: input.geography_score,
        incoterms_score: input.incoterms_score,
        payment_terms_score: input.payment_terms_score,
        timing_score: input.timing_score,
        document_readiness_score: input.document_readiness_score,
        trust_score: input.trust_score,
        risk_penalty: input.risk_penalty,
        explanation: input.explanation,
        strengths: input.strengths,
        conflicts: input.conflicts,
        missing_information: input.missing_information,
        recommended_next_action: input.recommended_next_action,
      },
      { onConflict: "buyer_inquiry_id,seller_inquiry_id" },
    )
    .select(DEAL_MATCH_SELECT)
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return data as DealMatchRecord;
}

// The only mutation a broker/admin can make to an existing match: record a
// human review decision. Never touches score fields, never touches
// public.inquiries.
export async function updateDealMatchReviewServer(
  id: string,
  updates: { match_status: string; broker_decision?: string | null; reviewed_by?: string | null },
): Promise<DealMatchRecord> {
  if (!supabaseServer) {
    throw new Error("Supabase service role key is not configured on the server.");
  }

  // broker_decision is only overwritten when explicitly provided — a
  // workflow-only status change (e.g. moving an already-approved match to
  // "introduced") must not silently clear a prior broker decision.
  const updatePayload: Record<string, string | null> = {
    match_status: updates.match_status,
    reviewed_by: updates.reviewed_by ?? null,
    reviewed_at: new Date().toISOString(),
  };
  if (updates.broker_decision !== undefined) {
    updatePayload.broker_decision = updates.broker_decision;
  }

  const { data, error } = await supabaseServer
    .from("deal_matches")
    .update(updatePayload)
    .eq("id", id)
    .select(DEAL_MATCH_SELECT)
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return data as DealMatchRecord;
}

export async function deleteDealMatchServer(id: string): Promise<void> {
  if (!supabaseServer) {
    throw new Error("Supabase service role key is not configured on the server.");
  }

  const { error } = await supabaseServer.from("deal_matches").delete().eq("id", id);
  if (error) {
    throw new Error(error.message);
  }
}
