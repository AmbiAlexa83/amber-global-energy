import { NextResponse } from "next/server";
import { updateBrokerServer } from "@/lib/supabase-server";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const payload = await request.json().catch(() => null);
    const { name, email, phone, region, specialty, status, notes } = payload ?? {};

    const broker = await updateBrokerServer(id, { name, email, phone, region, specialty, status, notes });
    return NextResponse.json({ data: broker });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to update broker.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
