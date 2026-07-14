import { NextResponse } from "next/server";
import { updateAdminUserServer } from "@/lib/supabase-server";
import { checkPermission, hashAccessCode, roleOptions } from "@/lib/auth-helpers";

const sanitize = <T extends { access_code_hash: string }>(user: T) => {
  const { access_code_hash: _unused, ...rest } = user;
  return rest;
};

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const permissionError = await checkPermission("admin_users");
    if (permissionError) {
      return NextResponse.json({ error: permissionError }, { status: 403 });
    }

    const { id } = await params;
    const payload = await request.json().catch(() => null);
    const { name, email, role, status, access_code } = payload ?? {};

    if (role !== undefined) {
      const validRoles = roleOptions.map((option) => option.value);
      if (!validRoles.includes(role)) {
        return NextResponse.json({ error: "A valid role is required." }, { status: 400 });
      }
    }

    const user = await updateAdminUserServer(id, {
      name,
      email,
      role,
      status,
      access_code_hash: access_code && typeof access_code === "string" && access_code.trim()
        ? hashAccessCode(access_code.trim())
        : undefined,
    });

    return NextResponse.json({ data: sanitize(user) });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to update user.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
