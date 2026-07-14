import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getAdminUserByIdServer } from "@/lib/supabase-server";
import { SESSION_COOKIE, getCurrentAdminUser, verifyAccessCode } from "@/lib/auth-helpers";

const sanitize = <T extends { access_code_hash: string }>(user: T) => {
  const { access_code_hash: _unused, ...rest } = user;
  return rest;
};

export async function GET() {
  const user = await getCurrentAdminUser();
  return NextResponse.json({ data: user ? sanitize(user) : null });
}

export async function POST(request: Request) {
  try {
    const payload = await request.json().catch(() => null);
    const { admin_user_id, access_code } = payload ?? {};

    if (!admin_user_id || typeof admin_user_id !== "string") {
      return NextResponse.json({ error: "Select who you are." }, { status: 400 });
    }
    if (!access_code || typeof access_code !== "string") {
      return NextResponse.json({ error: "Access code is required." }, { status: 400 });
    }

    const user = await getAdminUserByIdServer(admin_user_id);
    if (!user || user.status !== "active" || !verifyAccessCode(access_code, user.access_code_hash)) {
      return NextResponse.json({ error: "Invalid access code." }, { status: 401 });
    }

    const cookieStore = await cookies();
    cookieStore.set(SESSION_COOKIE, user.id, {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 30,
    });

    return NextResponse.json({ data: sanitize(user) });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to sign in.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE() {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE);
  return NextResponse.json({ data: null });
}
