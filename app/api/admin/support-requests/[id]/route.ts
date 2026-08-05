import { NextResponse } from "next/server";
import { getSupportRequestServer, updateSupportRequestServer } from "@/lib/supabase-server";
import { checkPermission } from "@/lib/auth-helpers";
import { dispatchSupportStatusNotification } from "@/lib/support-notification-helpers";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const permissionError = await checkPermission("support_requests");
    if (permissionError) {
      return NextResponse.json({ error: permissionError }, { status: 403 });
    }

    const { id } = await params;

    const existing = await getSupportRequestServer(id);
    if (!existing) {
      return NextResponse.json({ error: "Support request not found." }, { status: 404 });
    }

    const payload = await request.json().catch(() => null);
    const { category, priority, status, assigned_to } = payload ?? {};

    const supportRequest = await updateSupportRequestServer(id, { category, priority, status, assigned_to });

    // Only dispatch a client email when status was actually supplied AND it
    // actually changed — saving the same status again, or changing only
    // category/priority/assigned_to, must never trigger a client email.
    // Awaited (not fire-and-forget) for the same serverless-lifecycle reason
    // as the POST route; dispatchSupportStatusNotification never throws, so
    // this cannot fail the status update itself.
    if (typeof status === "string" && status !== existing.status) {
      try {
        await dispatchSupportStatusNotification(supportRequest, status);
      } catch (error) {
        console.error("[support-requests] status notification dispatch failed:", error);
      }
    }

    return NextResponse.json({ data: supportRequest });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to update support request.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
