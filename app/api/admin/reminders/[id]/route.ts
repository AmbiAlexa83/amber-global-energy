import { NextResponse } from "next/server";
import { updateReminderServer, deleteReminderServer } from "@/lib/supabase-server";
import { checkPermission } from "@/lib/auth-helpers";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const permissionError = await checkPermission("reminders");
    if (permissionError) {
      return NextResponse.json({ error: permissionError }, { status: 403 });
    }

    const { id } = await params;
    const payload = await request.json().catch(() => null);
    const { title, notes, due_at, status } = payload ?? {};

    const reminder = await updateReminderServer(id, { title, notes, due_at, status });
    return NextResponse.json({ data: reminder });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to update reminder.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const permissionError = await checkPermission("reminders");
    if (permissionError) {
      return NextResponse.json({ error: permissionError }, { status: 403 });
    }

    const { id } = await params;
    await deleteReminderServer(id);
    return NextResponse.json({ data: { id } });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to delete reminder.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
