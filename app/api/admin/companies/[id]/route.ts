import { NextResponse } from "next/server";
import { updateCompanyServer } from "@/lib/supabase-server";
import { checkPermission } from "@/lib/auth-helpers";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const permissionError = await checkPermission("companies");
    if (permissionError) {
      return NextResponse.json({ error: permissionError }, { status: 403 });
    }

    const { id } = await params;
    const payload = await request.json().catch(() => null);
    const { name, registration_number, website, country, industry, verification_status, status, notes } = payload ?? {};

    const company = await updateCompanyServer(id, {
      name,
      registration_number,
      website,
      country,
      industry,
      verification_status,
      status,
      notes,
    });
    return NextResponse.json({ data: company });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to update company.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
