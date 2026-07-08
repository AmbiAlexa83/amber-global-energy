import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? "";

export type InquiryPayload = {
  name: string;
  email: string;
  message: string;
  source_page: string;
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

export async function submitInquiry(payload: InquiryPayload) {
  if (!supabase) {
    throw new Error("Supabase is not configured yet.");
  }

  const { error } = await supabase.from("inquiries").insert({
    name: payload.name,
    email: payload.email,
    message: payload.message,
    source_page: payload.source_page,
    created_at: new Date().toISOString(),
  });

  if (error) {
    throw new Error(error.message);
  }
}
