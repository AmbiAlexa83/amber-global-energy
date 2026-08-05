import { NextResponse } from "next/server";
import { retrySupportNotificationServer } from "@/lib/support-notification-helpers";
import { checkPermission } from "@/lib/auth-helpers";

// Retry authorization reuses the existing support_requests permission —
// admins and brokers may retry (matching "brokers may retry only when the
// existing role model permits management of support requests"); viewers are
// blocked by checkPermission itself, same as every other mutating route.
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const permissionError = await checkPermission("support_requests");
    if (permissionError) {
      return NextResponse.json({ error: permissionError }, { status: 403 });
    }

    const { id } = await params;
    const notification = await retrySupportNotificationServer(id);
    return NextResponse.json({ data: notification });
  } catch (error) {
    // Never forward raw provider/internal error text to the browser — a
    // short, safe message is sufficient (matches finalizeDelivery's own
    // sanitization in lib/transactional-email.ts).
    const message = error instanceof Error ? error.message : "Unable to retry this notification.";
    const status = message === "Notification not found." ? 404 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
