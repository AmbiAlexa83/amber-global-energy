import { randomBytes, scryptSync, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";
import { getAdminUserByIdServer, type AdminUserRecord } from "@/lib/supabase-server";
import { type Role, roleOptions } from "@/lib/role-options";

export { type Role, roleOptions };

export const SESSION_COOKIE = "admin_session";

// Resources a mutating request (POST/PATCH/DELETE) can target. "inquiries" and
// "documents"/"emails" cover the day-to-day deal work brokers do; "brokers",
// "companies", and "admin_users" are roster/reference data reserved for admins.
export type ManagedResource =
  | "inquiries"
  | "brokers"
  | "companies"
  | "projects"
  | "contracts"
  | "documents"
  | "emails"
  | "admin_users"
  | "reminders";

const BROKER_RESTRICTED_RESOURCES = new Set<ManagedResource>(["brokers", "companies", "admin_users"]);

export const canManage = (role: Role, resource: ManagedResource): boolean => {
  if (role === "admin") return true;
  if (role === "viewer") return false;
  // role === "broker"
  return !BROKER_RESTRICTED_RESOURCES.has(resource);
};

export const hashAccessCode = (code: string): string => {
  const salt = randomBytes(16).toString("hex");
  const derived = scryptSync(code, salt, 64).toString("hex");
  return `${salt}:${derived}`;
};

export const verifyAccessCode = (code: string, storedHash: string): boolean => {
  const [salt, hash] = storedHash.split(":");
  if (!salt || !hash) return false;
  const derived = scryptSync(code, salt, 64);
  const stored = Buffer.from(hash, "hex");
  if (derived.length !== stored.length) return false;
  return timingSafeEqual(derived, stored);
};

// Reads the identification cookie set by /api/admin/session and resolves it to
// an active admin_users row. Returns null if nobody has identified themselves
// yet (or their account was deactivated) — callers must treat null as "no
// role restrictions apply" (fail-open), since this is an additive attribution
// layer on top of the existing Basic Auth gate, not a replacement for it.
export async function getCurrentAdminUser(): Promise<AdminUserRecord | null> {
  const cookieStore = await cookies();
  const sessionId = cookieStore.get(SESSION_COOKIE)?.value;
  if (!sessionId) return null;

  const user = await getAdminUserByIdServer(sessionId).catch(() => null);
  if (!user || user.status !== "active") return null;
  return user;
}

// Enforces a permission check in a mutating API route. Returns null when the
// action is allowed (including when nobody has identified themselves — see
// getCurrentAdminUser), or an error message to return as a 403 otherwise.
export async function checkPermission(resource: ManagedResource): Promise<string | null> {
  const user = await getCurrentAdminUser();
  if (!user) return null;
  if (!canManage(user.role as Role, resource)) {
    return `Your role (${user.role}) does not have permission to modify ${resource}.`;
  }
  return null;
}
