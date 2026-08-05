import { NextRequest, NextResponse } from "next/server";
import {
  getSupportNotificationsForRequestServer,
  getSupportNotificationsForCompanyServer,
  getAllSupportNotificationsServer,
} from "@/lib/supabase-server";

export async function GET(request: NextRequest) {
  try {
    const params = request.nextUrl.searchParams;
    const supportRequestId = params.get("support_request_id");
    const companyId = params.get("company_id");

    const notifications = supportRequestId
      ? await getSupportNotificationsForRequestServer(supportRequestId)
      : companyId
        ? await getSupportNotificationsForCompanyServer(companyId)
        : await getAllSupportNotificationsServer();

    return NextResponse.json({ data: notifications });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to load support notifications.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
