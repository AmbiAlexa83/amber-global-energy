import type { NextRequest } from "next/server";
import { supabaseServer } from "../../../lib/supabase-server";

// ─── Rate limiter ────────────────────────────────────────────────────────────
// In-memory store is instance-local in serverless environments: each cold start
// gets a fresh counter. Replace the Map with Upstash Redis (or equivalent) for
// consistent limits across all instances. Required env vars for Upstash:
//   UPSTASH_REDIS_REST_URL, UPSTASH_REDIS_REST_TOKEN
const rateLimitStore = new Map<string, { count: number; resetAt: number }>();
const RATE_WINDOW_MS = 60 * 60 * 1000; // 1 hour
const RATE_MAX = 5; // max submissions per IP per window
const MIN_ELAPSED_MS = 3000; // reject submissions completed in under 3 seconds

function checkRateLimit(ip: string): { allowed: boolean; retryAfterSeconds: number } {
  const now = Date.now();
  const entry = rateLimitStore.get(ip);

  if (!entry || entry.resetAt <= now) {
    rateLimitStore.set(ip, { count: 1, resetAt: now + RATE_WINDOW_MS });
    return { allowed: true, retryAfterSeconds: 0 };
  }

  if (entry.count >= RATE_MAX) {
    return { allowed: false, retryAfterSeconds: Math.ceil((entry.resetAt - now) / 1000) };
  }

  entry.count += 1;
  return { allowed: true, retryAfterSeconds: 0 };
}

// ─── Sanitization ────────────────────────────────────────────────────────────

function sanitize(value: unknown, maxLen: number): string | null {
  if (value === null || value === undefined) return null;
  if (typeof value !== "string") return null;
  const cleaned = value
    .replace(/\0/g, "") // null bytes
    .replace(/[\x01-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "") // unsafe control chars (keep \t \n \r)
    .replace(/[<>]/g, "") // prevent HTML injection while preserving trade punctuation
    .trim();
  if (!cleaned) return null;
  return cleaned.slice(0, maxLen);
}

const s = (v: unknown) => sanitize(v, 200);
const sLong = (v: unknown) => sanitize(v, 2000);

// ─── Validators ──────────────────────────────────────────────────────────────

function isValidEmail(v: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v) && v.length <= 254;
}

function isValidUrl(v: string): boolean {
  try {
    const u = new URL(v);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}

function isValidPhone(v: string): boolean {
  return /^[+\d\s\-().]{5,30}$/.test(v);
}

function isValidNumeric(v: string): boolean {
  // Accepts common trade quantity/price notation: "50,000 MT/month", "$500/bbl", "1.5M barrels", "100-200 MT".
  // Actual injection characters are stripped by sanitize() before saving; reject only clear HTML/script patterns.
  return v.length <= 60 && !/<|>|script|select|insert|drop/i.test(v);
}

// ─── Logging ─────────────────────────────────────────────────────────────────

function logEvent(event: string, reason: string) {
  // Only log event type, reason category, and timestamp — no PII
  console.warn(`[inquiries] event=${event} reason=${reason} ts=${new Date().toISOString()}`);
}

// ─── Response helpers ────────────────────────────────────────────────────────

const SECURE_HEADERS = {
  "Content-Type": "application/json",
  "Cache-Control": "no-store",
  "X-Content-Type-Options": "nosniff",
};

function jsonResponse(body: unknown, status: number, extra?: Record<string, string>) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...SECURE_HEADERS, ...extra },
  });
}

// ─── Handler ─────────────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  // IP for rate limiting — use leftmost value from X-Forwarded-For
  const forwarded = request.headers.get("x-forwarded-for");
  const ip = (forwarded ? forwarded.split(",")[0] : "unknown").trim();

  const rateCheck = checkRateLimit(ip);
  if (!rateCheck.allowed) {
    logEvent("submission_rejected", "rate_limit");
    return jsonResponse(
      { error: "Too many requests. Please try again later." },
      429,
      { "Retry-After": String(rateCheck.retryAfterSeconds) },
    );
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    logEvent("submission_rejected", "parse_error");
    return jsonResponse({ error: "Invalid request." }, 400);
  }

  // Honeypot — must be empty
  if (body._hp !== undefined && String(body._hp).trim() !== "") {
    logEvent("submission_rejected", "honeypot");
    return jsonResponse({ error: "Invalid submission." }, 400);
  }

  // Minimum elapsed time — reject suspiciously fast bots
  const elapsed = Number(body._elapsed);
  if (!isNaN(elapsed) && elapsed < MIN_ELAPSED_MS) {
    logEvent("submission_rejected", "too_fast");
    return jsonResponse({ error: "Invalid submission." }, 400);
  }

  // ── Required field validation ──────────────────────────────────────────────

  const contactName = s(body.contact_name);
  const companyName = s(body.company_name);
  const inquiryType = s(body.inquiry_type);
  const emailRaw = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  const specialInstructions = sLong(body.special_instructions);
  const message = specialInstructions ?? (companyName ? `Trade inquiry for ${companyName}` : null);

  if (!contactName) {
    logEvent("submission_rejected", "missing_contact_name");
    return jsonResponse({ error: "Contact name is required." }, 400);
  }
  if (!emailRaw) {
    logEvent("submission_rejected", "missing_email");
    return jsonResponse({ error: "Email address is required." }, 400);
  }
  if (!isValidEmail(emailRaw)) {
    logEvent("submission_rejected", "invalid_email");
    return jsonResponse({ error: "Please enter a valid email address." }, 400);
  }
  if (!inquiryType) {
    logEvent("submission_rejected", "missing_inquiry_type");
    return jsonResponse({ error: "Inquiry type is required." }, 400);
  }
  if (!message) {
    logEvent("submission_rejected", "missing_message");
    return jsonResponse({ error: "Please provide trade details or a message." }, 400);
  }

  // ── Optional field validation ──────────────────────────────────────────────

  const websiteRaw = typeof body.company_website === "string" ? body.company_website.trim() : "";
  if (websiteRaw && !isValidUrl(websiteRaw)) {
    logEvent("submission_rejected", "invalid_url");
    return jsonResponse(
      { error: "Company website must be a valid URL starting with http:// or https://." },
      400,
    );
  }

  const phoneRaw = typeof body.phone === "string" ? body.phone.trim() : "";
  if (phoneRaw && !isValidPhone(phoneRaw)) {
    logEvent("submission_rejected", "invalid_phone");
    return jsonResponse({ error: "Phone number contains invalid characters." }, 400);
  }

  const whatsappRaw = typeof body.whatsapp === "string" ? body.whatsapp.trim() : "";
  if (whatsappRaw && !isValidPhone(whatsappRaw)) {
    logEvent("submission_rejected", "invalid_whatsapp");
    return jsonResponse({ error: "WhatsApp number contains invalid characters." }, 400);
  }

  const quantityRaw = typeof body.quantity === "string" ? body.quantity.trim() : "";
  if (quantityRaw && !isValidNumeric(quantityRaw)) {
    logEvent("submission_rejected", "invalid_quantity");
    return jsonResponse({ error: "Quantity value appears invalid." }, 400);
  }

  const targetPriceRaw = typeof body.target_price === "string" ? body.target_price.trim() : "";
  if (targetPriceRaw && !isValidNumeric(targetPriceRaw)) {
    logEvent("submission_rejected", "invalid_target_price");
    return jsonResponse({ error: "Target price value appears invalid." }, 400);
  }

  // ── Server availability ────────────────────────────────────────────────────

  if (!supabaseServer) {
    logEvent("submission_failed", "db_not_configured");
    return jsonResponse(
      { error: "Service temporarily unavailable. Please try again later." },
      500,
    );
  }

  // ── Save to database ───────────────────────────────────────────────────────

  try {
    const { error: dbError } = await supabaseServer.from("inquiries").insert({
      name: contactName ?? companyName ?? "Unknown",
      email: emailRaw,
      message,
      source_page: "home",
      status: "new",
      created_at: new Date().toISOString(),
      inquiry_type: inquiryType,
      company_name: companyName,
      contact_name: contactName,
      position: s(body.position),
      phone: phoneRaw || null,
      whatsapp: whatsappRaw || null,
      company_website: websiteRaw || null,
      country: s(body.country),
      company_registration_number: s(body.company_registration_number),
      verification_status: s(body.verification_status),
      role_type: s(body.role_type),
      product: s(body.product),
      quantity: quantityRaw || null,
      unit: s(body.unit),
      delivery_frequency: s(body.delivery_frequency),
      contract_length: s(body.contract_length),
      target_price: targetPriceRaw || null,
      currency: s(body.currency),
      payment_method: s(body.payment_method),
      incoterms: s(body.incoterms),
      loading_port: s(body.loading_port),
      destination_port: s(body.destination_port),
      origin_country: s(body.origin_country),
      destination_country: s(body.destination_country),
      shipping_method: s(body.shipping_method),
      documents_available: sLong(body.documents_available),
      special_instructions: specialInstructions,
    });

    if (dbError) {
      logEvent("submission_failed", "db_error");
      return jsonResponse(
        { error: "We were unable to save your inquiry. Please try again shortly." },
        500,
      );
    }
  } catch {
    logEvent("submission_failed", "unexpected_error");
    return jsonResponse(
      { error: "An unexpected error occurred. Please try again shortly." },
      500,
    );
  }

  return jsonResponse({ success: true }, 201);
}
