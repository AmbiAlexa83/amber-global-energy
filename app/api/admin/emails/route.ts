import { NextRequest, NextResponse } from "next/server";
import { getEmailsForEntityServer, createEmailServer } from "@/lib/supabase-server";
import { checkPermission } from "@/lib/auth-helpers";

export async function GET(request: NextRequest) {
  try {
    const params = request.nextUrl.searchParams;
    const links = {
      inquiry_id: params.get("inquiry_id"),
      company_id: params.get("company_id"),
      project_id: params.get("project_id"),
      contract_id: params.get("contract_id"),
    };

    const emails = await getEmailsForEntityServer(links);
    return NextResponse.json({ data: emails });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to load emails.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const permissionError = await checkPermission("emails");
    if (permissionError) {
      return NextResponse.json({ error: permissionError }, { status: 403 });
    }

    const payload = await request.json().catch(() => null);
    const {
      subject,
      direction,
      body,
      from_address,
      to_address,
      sent_at,
      inquiry_id,
      company_id,
      project_id,
      contract_id,
    } = payload ?? {};

    if (!subject || typeof subject !== "string" || !subject.trim()) {
      return NextResponse.json({ error: "Email subject is required." }, { status: 400 });
    }

    const email = await createEmailServer({
      subject,
      direction,
      body,
      from_address,
      to_address,
      sent_at,
      links: { inquiry_id, company_id, project_id, contract_id },
    });

    return NextResponse.json({ data: email }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to log email.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
