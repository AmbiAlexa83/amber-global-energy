import { NextResponse } from "next/server";
import {
  getCompanyByIdServer,
  getCompanyContactsServer,
  createCompanyContactServer,
} from "@/lib/supabase-server";
import { checkPermission } from "@/lib/auth-helpers";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;

    const company = await getCompanyByIdServer(id);
    if (!company) {
      return NextResponse.json({ error: "Company not found." }, { status: 404 });
    }

    const contacts = await getCompanyContactsServer(id);
    return NextResponse.json({ data: contacts });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to load company contacts.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const permissionError = await checkPermission("companies");
    if (permissionError) {
      return NextResponse.json({ error: permissionError }, { status: 403 });
    }

    const { id } = await params;

    const company = await getCompanyByIdServer(id);
    if (!company) {
      return NextResponse.json({ error: "Company not found." }, { status: 404 });
    }

    const payload = await request.json().catch(() => null);
    const {
      first_name,
      last_name,
      job_title,
      department,
      email,
      phone,
      mobile,
      country,
      preferred_contact_method,
      is_primary,
      status,
      notes,
    } = payload ?? {};

    if (!first_name || typeof first_name !== "string" || !first_name.trim()) {
      return NextResponse.json({ error: "First name is required." }, { status: 400 });
    }

    if (email !== undefined && email !== null && typeof email !== "string") {
      return NextResponse.json({ error: "Email must be a string." }, { status: 400 });
    }

    if (status !== undefined && status !== null && !["active", "inactive"].includes(status)) {
      return NextResponse.json({ error: "Status must be 'active' or 'inactive'." }, { status: 400 });
    }

    if (
      preferred_contact_method !== undefined &&
      preferred_contact_method !== null &&
      !["email", "phone", "mobile"].includes(preferred_contact_method)
    ) {
      return NextResponse.json(
        { error: "Preferred contact method must be 'email', 'phone', or 'mobile'." },
        { status: 400 },
      );
    }

    const contact = await createCompanyContactServer(id, {
      first_name,
      last_name,
      job_title,
      department,
      email,
      phone,
      mobile,
      country,
      preferred_contact_method,
      is_primary: Boolean(is_primary),
      status,
      notes,
    });

    return NextResponse.json({ data: contact }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to create company contact.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
