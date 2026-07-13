import { NextResponse } from "next/server";
import { getProjectsServer, createProjectServer } from "@/lib/supabase-server";

export async function GET() {
  try {
    const projects = await getProjectsServer();
    return NextResponse.json({ data: projects });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to load projects.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const payload = await request.json().catch(() => null);
    const { name, company_id, broker_id, inquiry_id, stage, estimated_value, expected_close_date, notes } = payload ?? {};

    if (!name || typeof name !== "string" || !name.trim()) {
      return NextResponse.json({ error: "Project name is required." }, { status: 400 });
    }

    const project = await createProjectServer({
      name,
      company_id,
      broker_id,
      inquiry_id,
      stage,
      estimated_value,
      expected_close_date,
      notes,
    });
    return NextResponse.json({ data: project }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to create project.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
