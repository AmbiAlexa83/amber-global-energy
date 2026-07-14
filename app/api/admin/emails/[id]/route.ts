import { NextResponse } from "next/server";
import { updateEmailServer, deleteEmailServer } from "@/lib/supabase-server";
import { checkPermission } from "@/lib/auth-helpers";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const permissionError = await checkPermission("emails");
    if (permissionError) {
      return NextResponse.json({ error: permissionError }, { status: 403 });
    }

    const { id } = await params;
    const payload = await request.json().catch(() => null);
    const { subject, direction, body, from_address, to_address, sent_at } = payload ?? {};

    const email = await updateEmailServer(id, { subject, direction, body, from_address, to_address, sent_at });
    return NextResponse.json({ data: email });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to update email.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const permissionError = await checkPermission("emails");
    if (permissionError) {
      return NextResponse.json({ error: permissionError }, { status: 403 });
    }

    const { id } = await params;
    await deleteEmailServer(id);
    return NextResponse.json({ data: { id } });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to delete email.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
