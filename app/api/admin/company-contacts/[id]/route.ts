import { NextResponse } from "next/server";
import {
  getCompanyContactServer,
  updateCompanyContactServer,
  deactivateCompanyContactServer,
} from "@/lib/supabase-server";
import { checkPermission } from "@/lib/auth-helpers";

const errorStatus = (message: string): number => {
  if (message === "Contact not found.") return 404;
  if (message === "A contact cannot be reassigned to a different company.") return 409;
  return 500;
};

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const permissionError = await checkPermission("companies");
    if (permissionError) {
      return NextResponse.json({ error: permissionError }, { status: 403 });
    }

    const { id } = await params;
    const payload = await request.json().catch(() => null);
    const {
      company_id,
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

    if (first_name !== undefined && (typeof first_name !== "string" || !first_name.trim())) {
      return NextResponse.json({ error: "First name is required." }, { status: 400 });
    }

    if (email !== undefined && email !== null && typeof email !== "string") {
      return NextResponse.json({ error: "Email must be a string." }, { status: 400 });
    }

    if (status !== undefined && !["active", "inactive"].includes(status)) {
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

    const contact = await updateCompanyContactServer(id, {
      company_id,
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
    });

    return NextResponse.json({ data: contact });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to update company contact.";
    return NextResponse.json({ error: message }, { status: errorStatus(message) });
  }
}

// Soft-deactivate only — a contact is never permanently deleted so history
// (documents, emails, reminders, deal matches) that referenced it stays
// intact. Also clears primary status, since an inactive contact can never
// remain the designated primary.
export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const permissionError = await checkPermission("companies");
    if (permissionError) {
      return NextResponse.json({ error: permissionError }, { status: 403 });
    }

    const { id } = await params;

    const existing = await getCompanyContactServer(id);
    if (!existing) {
      return NextResponse.json({ error: "Contact not found." }, { status: 404 });
    }

    const contact = await deactivateCompanyContactServer(id);
    return NextResponse.json({ data: contact });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to deactivate company contact.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
