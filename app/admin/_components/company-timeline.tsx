import Link from "next/link";
import type { ActivityEvent } from "@/lib/activity-helpers";
import { formatDate, getRelativeTime } from "@/lib/inquiry-helpers";

// Presentation only — every event here is produced by the existing
// buildActivityFeed() (lib/activity-helpers.ts), called by the company page
// with company-scoped arrays instead of desk-wide ones. This component does
// not filter, sort, or generate events itself; buildActivityFeed() already
// sorts newest-first. Server-rendered (no "use client") — read-only, no
// local state. Row markup mirrors app/admin/activity/page.tsx exactly
// (icon, title, detail, relative timestamp); the inner-row background uses
// #050B16/70 to match the nested-card convention already used by the other
// cards on this same company page (CompanyContacts, SupportRequestCard,
// ReminderList, EmailTimeline), rather than the standalone activity page's
// tone-on-tone #071A2D/80.

export default function CompanyTimeline({ events }: { events: ActivityEvent[] }) {
  return (
    <div className="rounded-[24px] border border-white/10 bg-[#071A2D]/90 p-4">
      <p className="text-sm uppercase tracking-[0.25em] text-slate-400">Relationship Timeline</p>

      {events.length === 0 ? (
        <p className="mt-3 text-sm text-slate-500">No recorded activity for this company yet.</p>
      ) : (
        <div className="mt-3 space-y-2">
          {events.map((event) => {
            const row = (
              <div className="flex items-start justify-between gap-3 rounded-2xl border border-white/10 bg-[#050B16]/70 px-4 py-3 transition hover:border-[#C8A24D]/40">
                <div className="flex min-w-0 items-start gap-3">
                  <span className="mt-0.5 text-lg">{event.icon}</span>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-white">{event.title}</p>
                    <p className="mt-0.5 truncate text-sm text-slate-400">{event.detail}</p>
                  </div>
                </div>
                <span className="shrink-0 text-xs uppercase tracking-[0.2em] text-slate-500" title={formatDate(event.timestamp)}>
                  {getRelativeTime(event.timestamp)}
                </span>
              </div>
            );

            return event.href ? (
              <Link key={event.id} href={event.href} className="block">
                {row}
              </Link>
            ) : (
              <div key={event.id}>{row}</div>
            );
          })}
        </div>
      )}
    </div>
  );
}
