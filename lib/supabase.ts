import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? "";

export type InquiryPayload = {
  name?: string;
  email?: string;
  message?: string;
  source_page?: string;
  status?: string;
  inquiry_type?: string;
  company_name?: string;
  contact_name?: string;
  position?: string;
  phone?: string;
  whatsapp?: string;
  company_website?: string;
  country?: string;
  company_registration_number?: string;
  verification_status?: string;
  role_type?: string;
  product?: string;
  quantity?: string;
  unit?: string;
  delivery_frequency?: string;
  contract_length?: string;
  target_price?: string;
  currency?: string;
  payment_method?: string;
  incoterms?: string;
  loading_port?: string;
  destination_port?: string;
  origin_country?: string;
  destination_country?: string;
  shipping_method?: string;
  documents_available?: string;
  special_instructions?: string;
};

export const supabase =
  supabaseUrl && supabaseAnonKey
    ? createClient(supabaseUrl, supabaseAnonKey, {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
        },
      })
    : null;

export async function getInquiries() {
  if (!supabase) {
    throw new Error("Supabase is not configured yet.");
  }

  const { data, error } = await supabase
    .from("inquiries")
    .select(
      "id,name,email,message,source_page,status,created_at,inquiry_type,company_name,contact_name,position,phone,whatsapp,company_website,country,product,quantity,unit,documents_available,special_instructions",
    )
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return data ?? [];
}

export async function submitInquiry(payload: InquiryPayload) {
  if (!supabase) {
    throw new Error("Supabase is not configured yet.");
  }

  const { error } = await supabase.from("inquiries").insert({
    name: payload.name ?? payload.contact_name ?? payload.company_name ?? "",
    email: payload.email ?? null,
    message: payload.message ?? payload.special_instructions ?? null,
    source_page: payload.source_page ?? "home",
    status: payload.status ?? "new",
    created_at: new Date().toISOString(),
    inquiry_type: payload.inquiry_type ?? null,
    company_name: payload.company_name ?? null,
    contact_name: payload.contact_name ?? null,
    position: payload.position ?? null,
    phone: payload.phone ?? null,
    whatsapp: payload.whatsapp ?? null,
    company_website: payload.company_website ?? null,
    country: payload.country ?? null,
    company_registration_number: payload.company_registration_number ?? null,
    verification_status: payload.verification_status ?? null,
    role_type: payload.role_type ?? null,
    product: payload.product ?? null,
    quantity: payload.quantity ?? null,
    unit: payload.unit ?? null,
    delivery_frequency: payload.delivery_frequency ?? null,
    contract_length: payload.contract_length ?? null,
    target_price: payload.target_price ?? null,
    currency: payload.currency ?? null,
    payment_method: payload.payment_method ?? null,
    incoterms: payload.incoterms ?? null,
    loading_port: payload.loading_port ?? null,
    destination_port: payload.destination_port ?? null,
    origin_country: payload.origin_country ?? null,
    destination_country: payload.destination_country ?? null,
    shipping_method: payload.shipping_method ?? null,
    documents_available: payload.documents_available ?? null,
    special_instructions: payload.special_instructions ?? null,
  });

  if (error) {
    throw new Error(error.message);
  }
}
