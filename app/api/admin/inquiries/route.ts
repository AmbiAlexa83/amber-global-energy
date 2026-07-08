import { NextResponse } from "next/server";
import { getInquiriesServer, updateInquiryServer } from "../../../../lib/supabase-server";

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
    const payload = await request.json().catch(() => null);
    const { id, status, priority, assigned_broker, broker_notes } = payload ?? {};

    if (!id) {
      return NextResponse.json({ error: "Inquiry id is required." }, { status: 400 });
    }

    const updatedInquiry = await updateInquiryServer(id, { status, priority, assigned_broker, broker_notes });
    return NextResponse.json({ data: updatedInquiry });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to save inquiry updates.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
