import { NextResponse } from "next/server";
import { deleteDocumentServer } from "@/lib/supabase-server";
import { checkPermission } from "@/lib/auth-helpers";

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const permissionError = await checkPermission("documents");
    if (permissionError) {
      return NextResponse.json({ error: permissionError }, { status: 403 });
    }

    const { id } = await params;
    await deleteDocumentServer(id);
    return NextResponse.json({ data: { id } });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to delete document.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
