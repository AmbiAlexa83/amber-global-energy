"use client";

import Link from "next/link";
import { useState } from "react";
import type { SupportRequestRecord, AdminUserRecord, SupportNotificationRecord } from "@/lib/supabase-server";

type SafeAdminUser = Omit<AdminUserRecord, "access_code_hash">;
import {
  supportStatusOptions,
  supportPriorityStyles,
  supportStatusStyles,
  notificationDeliveryStyles,
  formatSupportCategoryLabel,
  formatSupportPriorityLabel,
  formatSupportStatusLabel,
  formatNotificationDeliveryLabel,
} from "@/lib/support-request-helpers";

const formatCreatedAt = (value: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("en", { year: "numeric", month: "short", day: "numeric" }).format(date);
};

const selectClass =
  "w-full rounded-lg border border-white/10 bg-[#050B16] px-2.5 py-1.5 text-xs text-white outline-none transition focus:border-[#C8A24D] focus:ring-2 focus:ring-[#C8A24D]/30 [&>option]:bg-[#050B16]";

export default function SupportRequestTable({
  initialRequests,
  adminUsers,
  initialNotifications,
}: {
  initialRequests: SupportRequestRecord[];
  adminUsers: SafeAdminUser[];
  initialNotifications: Record<string, SupportNotificationRecord>;
}) {
  const [requests, setRequests] = useState(initialRequests);
  const [notifications, setNotifications] = useState(initialNotifications);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [retryingId, setRetryingId] = useState<string | null>(null);
  const [error, setError] = useState("");

  const updateRequest = async (id: string, updates: { status?: string; assigned_to?: string | null }) => {
    try {
      setSavingId(id);
      setError("");
      const response = await fetch(`/api/admin/support-requests/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error ?? "Unable to update support request.");
      setRequests((current) => current.map((item) => (item.id === id ? payload.data : item)));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to update support request.");
    } finally {
      setSavingId(null);
    }
  };

  const retryNotification = async (requestId: string, notificationId: string) => {
    try {
      setRetryingId(requestId);
      setError("");
      const response = await fetch(`/api/admin/support-notifications/${notificationId}/retry`, { method: "POST" });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error ?? "Email could not be delivered.");
      setNotifications((current) => ({ ...current, [requestId]: payload.data }));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Email could not be delivered.");
    } finally {
      setRetryingId(null);
    }
  };

  return (
    <section className="rounded-[28px] border border-white/10 bg-[#050B16]/90 p-4 shadow-[0_20px_80px_rgba(0,0,0,0.45)] backdrop-blur sm:p-6">
      <h2 className="text-xl font-semibold text-white">Support Requests</h2>

      {error ? <p className="mt-3 text-sm text-rose-200">{error}</p> : null}

      {requests.length === 0 ? (
        <div className="mt-4 rounded-2xl border border-white/10 bg-[#071A2D]/70 px-5 py-10 text-center text-slate-400">
          No support requests have been submitted yet.
        </div>
      ) : (
        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full border-separate border-spacing-y-2 text-left text-sm">
            <thead>
              <tr className="text-slate-400">
                <th className="px-3 py-2 font-medium">Company</th>
                <th className="px-3 py-2 font-medium">Category</th>
                <th className="px-3 py-2 font-medium">Priority</th>
                <th className="px-3 py-2 font-medium">Status</th>
                <th className="px-3 py-2 font-medium">Created</th>
                <th className="px-3 py-2 font-medium">Assigned Broker</th>
                <th className="px-3 py-2 font-medium">Notification</th>
              </tr>
            </thead>
            <tbody>
              {requests.map((request) => (
                <tr key={request.id} className="rounded-2xl bg-[#071A2D]/80 align-top text-slate-300">
                  <td className="rounded-l-2xl px-3 py-3">
                    <Link
                      href={`/admin/companies/${request.company_id}`}
                      className="font-medium text-white transition hover:text-[#F0D38A]"
                    >
                      {request.companies?.name ?? "Unknown company"}
                    </Link>
                    <p className="mt-0.5 truncate text-xs text-slate-500">{request.subject}</p>
                  </td>
                  <td className="px-3 py-3">{formatSupportCategoryLabel(request.category)}</td>
                  <td className="px-3 py-3">
                    <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs uppercase tracking-[0.2em] ${supportPriorityStyles[request.priority] ?? supportPriorityStyles.normal}`}>
                      {formatSupportPriorityLabel(request.priority)}
                    </span>
                  </td>
                  <td className="px-3 py-3">
                    <div className="flex flex-col gap-1.5">
                      <span className={`inline-flex w-fit rounded-full border px-2.5 py-1 text-xs uppercase tracking-[0.2em] ${supportStatusStyles[request.status] ?? supportStatusStyles.new}`}>
                        {formatSupportStatusLabel(request.status)}
                      </span>
                      <select
                        value={request.status}
                        onChange={(event) => updateRequest(request.id, { status: event.target.value })}
                        disabled={savingId === request.id}
                        className={selectClass}
                      >
                        {supportStatusOptions.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </td>
                  <td className="px-3 py-3 text-slate-400">{formatCreatedAt(request.created_at)}</td>
                  <td className="px-3 py-3">
                    <select
                      value={request.assigned_to ?? ""}
                      onChange={(event) => updateRequest(request.id, { assigned_to: event.target.value || null })}
                      disabled={savingId === request.id}
                      className={selectClass}
                    >
                      <option value="">Unassigned</option>
                      {adminUsers.map((user) => (
                        <option key={user.id} value={user.id}>
                          {user.name}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="rounded-r-2xl px-3 py-3">
                    {(() => {
                      const notification = notifications[request.id];
                      if (!notification) {
                        return <span className="text-xs text-slate-500">—</span>;
                      }
                      return (
                        <div className="flex flex-col items-start gap-1.5">
                          <span
                            className={`inline-flex w-fit rounded-full border px-2.5 py-1 text-xs uppercase tracking-[0.2em] ${notificationDeliveryStyles[notification.delivery_status] ?? notificationDeliveryStyles.pending}`}
                            title={notification.delivery_status === "failed" ? "Email could not be delivered." : undefined}
                          >
                            {formatNotificationDeliveryLabel(notification.delivery_status)}
                          </span>
                          {notification.delivery_status === "failed" ? (
                            <button
                              type="button"
                              onClick={() => retryNotification(request.id, notification.id)}
                              disabled={retryingId === request.id}
                              className="rounded-lg border border-white/10 bg-white/5 px-2.5 py-1 text-[11px] font-medium text-slate-300 transition hover:border-[#C8A24D]/40 hover:text-white disabled:cursor-not-allowed disabled:opacity-70"
                            >
                              {retryingId === request.id ? "Retrying..." : "Retry Email"}
                            </button>
                          ) : null}
                        </div>
                      );
                    })()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
