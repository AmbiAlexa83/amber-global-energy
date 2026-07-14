import { NextRequest, NextResponse } from "next/server";
import { getDocumentsForEntityServer, uploadDocumentServer } from "@/lib/supabase-server";
import { checkPermission } from "@/lib/auth-helpers";

export async function GET(request: NextRequest) {
  try {
    const params = request.nextUrl.searchParams;
    const links = {
      inquiry_id: params.get("inquiry_id"),
      company_id: params.get("company_id"),
      project_id: params.get("project_id"),
      contract_id: params.get("contract_id"),
    };

    const documents = await getDocumentsForEntityServer(links);
    return NextResponse.json({ data: documents });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to load documents.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const permissionError = await checkPermission("documents");
    if (permissionError) {
      return NextResponse.json({ error: permissionError }, { status: 403 });
    }

    const formData = await request.formData();
    const file = formData.get("file");

    if (!(file instanceof File) || file.size === 0) {
      return NextResponse.json({ error: "A file is required." }, { status: 400 });
    }

    const notes = formData.get("notes");
    const inquiry_id = formData.get("inquiry_id");
    const company_id = formData.get("company_id");
    const project_id = formData.get("project_id");
    const contract_id = formData.get("contract_id");

    const document = await uploadDocumentServer({
      file,
      notes: typeof notes === "string" ? notes : null,
      links: {
        inquiry_id: typeof inquiry_id === "string" ? inquiry_id : null,
        company_id: typeof company_id === "string" ? company_id : null,
        project_id: typeof project_id === "string" ? project_id : null,
        contract_id: typeof contract_id === "string" ? contract_id : null,
      },
    });

    return NextResponse.json({ data: document }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to upload document.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
