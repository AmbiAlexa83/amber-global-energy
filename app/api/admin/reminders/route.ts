import { NextRequest, NextResponse } from "next/server";
import { getRemindersForEntityServer, getAllRemindersServer, createReminderServer } from "@/lib/supabase-server";
import { checkPermission } from "@/lib/auth-helpers";

export async function GET(request: NextRequest) {
  try {
    const params = request.nextUrl.searchParams;
    const inquiry_id = params.get("inquiry_id");
    const company_id = params.get("company_id");
    const project_id = params.get("project_id");
    const contract_id = params.get("contract_id");

    const reminders = inquiry_id || company_id || project_id || contract_id
      ? await getRemindersForEntityServer({ inquiry_id, company_id, project_id, contract_id })
      : await getAllRemindersServer();

    return NextResponse.json({ data: reminders });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to load reminders.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const permissionError = await checkPermission("reminders");
    if (permissionError) {
      return NextResponse.json({ error: permissionError }, { status: 403 });
    }

    const payload = await request.json().catch(() => null);
    const { title, notes, due_at, inquiry_id, company_id, project_id, contract_id } = payload ?? {};

    if (!title || typeof title !== "string" || !title.trim()) {
      return NextResponse.json({ error: "Reminder title is required." }, { status: 400 });
    }

    if (!due_at || typeof due_at !== "string") {
      return NextResponse.json({ error: "A due date is required." }, { status: 400 });
    }

    if (!inquiry_id && !company_id && !project_id && !contract_id) {
      return NextResponse.json({ error: "At least one entity link is required to create a reminder." }, { status: 400 });
    }

    const reminder = await createReminderServer({
      title,
      notes,
      due_at,
      links: { inquiry_id, company_id, project_id, contract_id },
    });

    return NextResponse.json({ data: reminder }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to create reminder.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
