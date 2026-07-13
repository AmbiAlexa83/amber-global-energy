import { NextResponse } from "next/server";
import { updateProjectServer } from "@/lib/supabase-server";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const payload = await request.json().catch(() => null);
    const { name, company_id, broker_id, inquiry_id, stage, estimated_value, expected_close_date, notes } = payload ?? {};

    const project = await updateProjectServer(id, {
      name,
      company_id,
      broker_id,
      inquiry_id,
      stage,
      estimated_value,
      expected_close_date,
      notes,
    });
    return NextResponse.json({ data: project });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to update project.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
