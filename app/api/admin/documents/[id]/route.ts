import { NextResponse } from "next/server";
import { deleteDocumentServer } from "@/lib/supabase-server";

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    await deleteDocumentServer(id);
    return NextResponse.json({ data: { id } });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to delete document.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
