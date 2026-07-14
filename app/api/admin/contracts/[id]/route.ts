import { NextResponse } from "next/server";
import { updateContractServer } from "@/lib/supabase-server";
import { checkPermission } from "@/lib/auth-helpers";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const permissionError = await checkPermission("contracts");
    if (permissionError) {
      return NextResponse.json({ error: permissionError }, { status: 403 });
    }

    const { id } = await params;
    const payload = await request.json().catch(() => null);
    const {
      title,
      contract_number,
      company_id,
      project_id,
      broker_id,
      status,
      contract_value,
      start_date,
      end_date,
      signed_date,
      notes,
    } = payload ?? {};

    const contract = await updateContractServer(id, {
      title,
      contract_number,
      company_id,
      project_id,
      broker_id,
      status,
      contract_value,
      start_date,
      end_date,
      signed_date,
      notes,
    });
    return NextResponse.json({ data: contract });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to update contract.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
