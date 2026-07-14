import { NextResponse } from "next/server";
import { getInquiriesServer, updateInquiryServer, parseBrokerState, supabaseServer } from "../../../../lib/supabase-server";
import { checkPermission } from "../../../../lib/auth-helpers";

export async function GET() {
  try {
    const inquiries = await getInquiriesServer();
    return NextResponse.json({ data: inquiries });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to load inquiries.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const permissionError = await checkPermission("inquiries");
    if (permissionError) {
      return NextResponse.json({ error: permissionError }, { status: 403 });
    }

    const payload = await request.json().catch(() => null);
    const { id, status, priority, assigned_broker, broker_notes, notes, last_contacted_at } = payload ?? {};

    if (!id) {
      return NextResponse.json({ error: "Inquiry id is required." }, { status: 400 });
    }

    if (!supabaseServer) {
      return NextResponse.json({ error: "Server configuration error." }, { status: 500 });
    }

    // Fetch current state so we can diff for history records
    const { data: current } = await supabaseServer
      .from("inquiries")
      .select("status,priority,broker_notes,notes,last_contacted_at")
      .eq("id", id)
      .single();

    const { assigned_broker: currentBroker } = parseBrokerState(current?.broker_notes);

    const updatedInquiry = await updateInquiryServer(id, {
      status,
      priority,
      assigned_broker,
      broker_notes,
      notes,
      last_contacted_at,
    });

    // Build history entries for every field that changed
    type HistoryEntry = {
      inquiry_id: string;
      field_changed: string;
      old_value: string | null;
      new_value: string | null;
      changed_by: string;
    };

    const historyEntries: HistoryEntry[] = [];
    const changedBy = "admin";

    if (status !== undefined && (current?.status ?? "new") !== status) {
      historyEntries.push({ inquiry_id: id, field_changed: "status", old_value: current?.status ?? null, new_value: status, changed_by: changedBy });
    }
    if (priority !== undefined && (current?.priority ?? null) !== priority) {
      historyEntries.push({ inquiry_id: id, field_changed: "priority", old_value: current?.priority ?? null, new_value: priority, changed_by: changedBy });
    }
    if (assigned_broker !== undefined && (currentBroker ?? null) !== (assigned_broker || null)) {
      historyEntries.push({ inquiry_id: id, field_changed: "assigned_broker", old_value: currentBroker ?? null, new_value: assigned_broker || null, changed_by: changedBy });
    }
    if (notes !== undefined && (current?.notes ?? null) !== (notes || null)) {
      historyEntries.push({ inquiry_id: id, field_changed: "notes", old_value: current?.notes ? "[previous note]" : null, new_value: notes ? "[note updated]" : null, changed_by: changedBy });
    }
    if (last_contacted_at !== undefined && (current?.last_contacted_at ?? null) !== (last_contacted_at || null)) {
      historyEntries.push({ inquiry_id: id, field_changed: "last_contacted_at", old_value: current?.last_contacted_at ?? null, new_value: last_contacted_at || null, changed_by: changedBy });
    }

    if (historyEntries.length > 0) {
      await supabaseServer.from("inquiry_history").insert(historyEntries);
    }

    return NextResponse.json({ data: updatedInquiry });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to save inquiry updates.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
