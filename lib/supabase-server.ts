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
  contact_name?: string | null;
  inquiry_type?: string | null;
  product?: string | null;
  quantity?: string | null;
  country?: string | null;
  status?: string | null;
  priority?: string | null;
  broker_notes?: string | null;
  created_at?: string | null;
  message?: string | null;
  special_instructions?: string | null;
};

export async function getInquiriesServer() {
  if (!supabaseServer) {
    throw new Error("Supabase service role key is not configured on the server.");
  }

  const { data, error } = await supabaseServer
    .from("inquiries")
    .select(
      "id,name,email,message,source_page,status,priority,broker_notes,created_at,inquiry_type,company_name,contact_name,position,phone,whatsapp,company_website,country,product,quantity,unit,delivery_frequency,contract_length,target_price,currency,payment_method,incoterms,loading_port,destination_port,origin_country,destination_country,documents_available,special_instructions",
    )
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return data ?? [];
}

export async function updateInquiryServer(id: string | number, updates: { status?: string | null; priority?: string | null; broker_notes?: string | null }) {
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

  if (updates.broker_notes !== undefined) {
    updatePayload.broker_notes = updates.broker_notes ?? null;
  }

  const { data, error } = await supabaseServer
    .from("inquiries")
    .update(updatePayload)
    .eq("id", id)
    .select(
      "id,name,email,message,source_page,status,priority,broker_notes,created_at,inquiry_type,company_name,contact_name,position,phone,whatsapp,company_website,country,product,quantity,unit,delivery_frequency,contract_length,target_price,currency,payment_method,incoterms,loading_port,destination_port,origin_country,destination_country,documents_available,special_instructions",
    )
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return data;
}
