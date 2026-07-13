import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { getInquiryHistory } from "../../../../../lib/supabase-server";

export async function GET(request: NextRequest) {
  const id = request.nextUrl.searchParams.get("id");

  if (!id) {
    return NextResponse.json({ error: "Inquiry id is required." }, { status: 400 });
  }

  try {
    const history = await getInquiryHistory(id);
    return NextResponse.json({ data: history });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to load history.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
