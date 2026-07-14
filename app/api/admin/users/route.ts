import { NextResponse } from "next/server";
import { getAdminUsersServer, createAdminUserServer } from "@/lib/supabase-server";
import { checkPermission, hashAccessCode, roleOptions } from "@/lib/auth-helpers";

// access_code_hash must never reach the client — strip it from every response.
const sanitize = <T extends { access_code_hash: string }>(user: T) => {
  const { access_code_hash: _unused, ...rest } = user;
  return rest;
};

export async function GET() {
  try {
    const users = await getAdminUsersServer();
    return NextResponse.json({ data: users.map(sanitize) });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to load users.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const permissionError = await checkPermission("admin_users");
    if (permissionError) {
      return NextResponse.json({ error: permissionError }, { status: 403 });
    }

    const payload = await request.json().catch(() => null);
    const { name, email, role, access_code } = payload ?? {};

    if (!name || typeof name !== "string" || !name.trim()) {
      return NextResponse.json({ error: "Name is required." }, { status: 400 });
    }

    if (!access_code || typeof access_code !== "string" || access_code.trim().length < 4) {
      return NextResponse.json({ error: "Access code must be at least 4 characters." }, { status: 400 });
    }

    const validRoles = roleOptions.map((option) => option.value);
    if (!role || !validRoles.includes(role)) {
      return NextResponse.json({ error: "A valid role is required." }, { status: 400 });
    }

    const user = await createAdminUserServer({
      name,
      email,
      role,
      access_code_hash: hashAccessCode(access_code.trim()),
    });

    return NextResponse.json({ data: sanitize(user) }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to create user.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
