import { NextResponse } from "next/server";
import { getBrokersServer, createBrokerServer } from "@/lib/supabase-server";

export async function GET() {
  try {
    const brokers = await getBrokersServer();
    return NextResponse.json({ data: brokers });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to load brokers.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const payload = await request.json().catch(() => null);
    const { name, email, phone, region, specialty, notes } = payload ?? {};

    if (!name || typeof name !== "string" || !name.trim()) {
      return NextResponse.json({ error: "Broker name is required." }, { status: 400 });
    }

    const broker = await createBrokerServer({ name, email, phone, region, specialty, notes });
    return NextResponse.json({ data: broker }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to create broker.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
