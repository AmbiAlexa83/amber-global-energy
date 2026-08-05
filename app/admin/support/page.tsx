import Link from "next/link";
import { getSupportRequestsServer, getAdminUsersServer, getAllSupportNotificationsServer } from "@/lib/supabase-server";
import SupportRequestTable from "./support-request-table";

// Live support request queue must never be statically prerendered at build
// time — this route has no dynamic segment to force it, the same reasoning
// as every other /admin/* dashboard route.
export const dynamic = "force-dynamic";

export default async function SupportPage() {
  const [requests, rawAdminUsers, notifications] = await Promise.all([
    getSupportRequestsServer(),
    getAdminUsersServer().catch(() => []),
    getAllSupportNotificationsServer().catch(() => []),
  ]);

  // Never forward access_code_hash to a client component — same scrubbing
  // convention as app/admin/users/page.tsx.
  const adminUsers = rawAdminUsers.map(({ access_code_hash: _unused, ...safe }) => safe);

  // Latest notification per support request (notifications are already
  // ordered newest-first) — this is the "latest relevant notification
  // state" shown per row, not a full delivery history/dashboard. Kept as a
  // plain object (not a Map) when crossing the server/client component
  // boundary, matching every other prop in this codebase.
  const latestNotificationByRequest: Record<string, (typeof notifications)[number]> = {};
  for (const notification of notifications) {
    if (!(notification.support_request_id in latestNotificationByRequest)) {
      latestNotificationByRequest[notification.support_request_id] = notification;
    }
  }

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(200,162,77,0.13),_transparent_28%),linear-gradient(135deg,_#03070D_0%,_#071A2D_65%,_#02060D_100%)] px-4 py-8 text-slate-100 sm:px-6 lg:px-8">
      <div className="mx-auto flex max-w-6xl flex-col gap-6">
        <div>
          <Link
            href="/admin"
            className="inline-flex items-center gap-2 text-sm font-medium text-slate-400 transition hover:text-white"
          >
            ← Back to dashboard
          </Link>
        </div>

        <header className="rounded-[28px] border border-white/10 bg-[#050B16]/90 p-6 shadow-[0_20px_80px_rgba(0,0,0,0.5)] backdrop-blur">
          <p className="text-sm uppercase tracking-[0.3em] text-[#C8A24D]">Amber Global Energy</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-white sm:text-4xl">Client Support Center</h1>
          <p className="mt-2 max-w-2xl text-sm leading-7 text-slate-400">
            Every support request raised by a client or broker, across every company, in one queue.
          </p>
        </header>

        <SupportRequestTable
          initialRequests={requests}
          adminUsers={adminUsers}
          initialNotifications={latestNotificationByRequest}
        />
      </div>
    </main>
  );
}
