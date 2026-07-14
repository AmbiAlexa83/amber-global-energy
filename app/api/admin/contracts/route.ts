import { NextResponse } from "next/server";
import { getContractsServer, createContractServer } from "@/lib/supabase-server";
import { checkPermission } from "@/lib/auth-helpers";

export async function GET() {
  try {
    const contracts = await getContractsServer();
    return NextResponse.json({ data: contracts });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to load contracts.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const permissionError = await checkPermission("contracts");
    if (permissionError) {
      return NextResponse.json({ error: permissionError }, { status: 403 });
    }

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

    if (!title || typeof title !== "string" || !title.trim()) {
      return NextResponse.json({ error: "Contract title is required." }, { status: 400 });
    }

    const contract = await createContractServer({
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
    return NextResponse.json({ data: contract }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to create contract.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
