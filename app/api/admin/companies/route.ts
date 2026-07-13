import { NextResponse } from "next/server";
import { getCompaniesServer, createCompanyServer } from "@/lib/supabase-server";

export async function GET() {
  try {
    const companies = await getCompaniesServer();
    return NextResponse.json({ data: companies });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to load companies.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const payload = await request.json().catch(() => null);
    const { name, registration_number, website, country, industry, verification_status, notes } = payload ?? {};

    if (!name || typeof name !== "string" || !name.trim()) {
      return NextResponse.json({ error: "Company name is required." }, { status: 400 });
    }

    const company = await createCompanyServer({
      name,
      registration_number,
      website,
      country,
      industry,
      verification_status,
      notes,
    });
    return NextResponse.json({ data: company }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to create company.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
