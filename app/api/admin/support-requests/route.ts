import { NextRequest, NextResponse } from "next/server";
import {
  getSupportRequestsServer,
  getSupportRequestsForCompanyServer,
  createSupportRequestServer,
} from "@/lib/supabase-server";
import { checkPermission } from "@/lib/auth-helpers";
import { dispatchNewSupportRequestNotifications } from "@/lib/support-notification-helpers";

export async function GET(request: NextRequest) {
  try {
    const companyId = request.nextUrl.searchParams.get("company_id");

    const requests = companyId
      ? await getSupportRequestsForCompanyServer(companyId)
      : await getSupportRequestsServer();

    return NextResponse.json({ data: requests });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to load support requests.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const permissionError = await checkPermission("support_requests");
    if (permissionError) {
      return NextResponse.json({ error: permissionError }, { status: 403 });
    }

    const payload = await request.json().catch(() => null);
    const { company_id, contact_id, category, priority, subject, message } = payload ?? {};

    if (!company_id || typeof company_id !== "string") {
      return NextResponse.json({ error: "A company is required." }, { status: 400 });
    }

    if (!category || typeof category !== "string") {
      return NextResponse.json({ error: "A category is required." }, { status: 400 });
    }

    if (!subject || typeof subject !== "string" || !subject.trim()) {
      return NextResponse.json({ error: "Subject is required." }, { status: 400 });
    }

    if (!message || typeof message !== "string" || !message.trim()) {
      return NextResponse.json({ error: "Message is required." }, { status: 400 });
    }

    const supportRequest = await createSupportRequestServer({
      company_id,
      contact_id,
      category,
      priority,
      subject,
      message,
    });

    // Notification dispatch happens strictly after the request is safely
    // persisted. Awaited (not fire-and-forget) because this runs in a
    // serverless function that may be frozen the instant the response is
    // sent — an unawaited background promise could be cut off mid-send.
    // dispatchNewSupportRequestNotifications catches its own errors
    // internally and never throws, so it cannot roll back or fail the
    // support-request creation; this try/catch is a last-resort backstop.
    try {
      await dispatchNewSupportRequestNotifications(supportRequest);
    } catch (error) {
      console.error("[support-requests] notification dispatch failed:", error);
    }

    return NextResponse.json({ data: supportRequest }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to submit support request.";
    const status = message === "Company not found." || message === "Contact does not belong to this company." ? 400 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
