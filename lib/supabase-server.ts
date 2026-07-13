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
