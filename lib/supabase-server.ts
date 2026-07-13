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

export type DocumentEntityLinks = {
  inquiry_id?: string | null;
  company_id?: string | null;
  project_id?: string | null;
  contract_id?: string | null;
};

export async function getDocumentsForEntityServer(links: DocumentEntityLinks): Promise<DocumentWithUrl[]> {
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
  links: DocumentEntityLinks;
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
