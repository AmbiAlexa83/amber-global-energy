"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import type { ReminderRecord, InquiryServerRecord, CompanyRecord, ProjectRecord, ContractRecord } from "@/lib/supabase-server";
import { reminderStatusStyles, formatReminderStatusLabel, isReminderOverdue } from "@/lib/reminder-helpers";

type EntityType = "inquiry" | "company" | "project" | "contract";

const paramNameFor: Record<EntityType, string> = {
  inquiry: "inquiry_id",
  company: "company_id",
  project: "project_id",
  contract: "contract_id",
};

const inputClass =
  "w-full rounded-xl border border-white/10 bg-[#050B16] px-3 py-2.5 text-sm text-white outline-none transition focus:border-[#C8A24D] focus:ring-2 focus:ring-[#C8A24D]/30 [&>option]:bg-[#050B16]";

const formatDueAt = (value: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("en", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
};

export default function CalendarBoard({
  initialReminders,
  inquiries,
  companies,
  projects,
  contracts,
}: {
  initialReminders: ReminderRecord[];
  inquiries: InquiryServerRecord[];
  companies: CompanyRecord[];
  projects: ProjectRecord[];
  contracts: ContractRecord[];
}) {
  const router = useRouter();
  const [reminders, setReminders] = useState(initialReminders);
  const [entityType, setEntityType] = useState<EntityType>("inquiry");
  const [entityId, setEntityId] = useState("");
  const [title, setTitle] = useState("");
  const [dueAt, setDueAt] = useState("");
  const [notes, setNotes] = useState("");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");
  const [savingId, setSavingId] = useState<string | null>(null);

  const entityOptions = useMemo(() => {
    if (entityType === "inquiry") return inquiries.map((item) => ({ id: String(item.id), label: item.company_name ?? item.contact_name ?? item.name ?? "Unnamed" }));
    if (entityType === "company") return companies.map((item) => ({ id: item.id, label: item.name }));
    if (entityType === "project") return projects.map((item) => ({ id: item.id, label: item.name }));
    return contracts.map((item) => ({ id: item.id, label: item.title }));
  }, [entityType, inquiries, companies, projects, contracts]);

  const resolveLink = (reminder: ReminderRecord): { label: string; href: string } | null => {
    if (reminder.inquiry_id) {
      const inquiry = inquiries.find((item) => String(item.id) === reminder.inquiry_id);
      return { label: inquiry?.company_name ?? inquiry?.contact_name ?? "Customer", href: `/admin/customers/${reminder.inquiry_id}` };
    }
    if (reminder.company_id) {
      const company = companies.find((item) => item.id === reminder.company_id);
      return { label: company?.name ?? "Company", href: `/admin/companies/${reminder.company_id}` };
    }
    if (reminder.project_id) {
      const project = projects.find((item) => item.id === reminder.project_id);
      return { label: project?.name ?? "Project", href: `/admin/projects/${reminder.project_id}` };
    }
    if (reminder.contract_id) {
      const contract = contracts.find((item) => item.id === reminder.contract_id);
      return { label: contract?.title ?? "Contract", href: `/admin/contracts/${reminder.contract_id}` };
    }
    return null;
  };

  const createReminder = async () => {
    if (!title.trim() || !dueAt || !entityId) {
      setError("Title, due date, and a linked record are required.");
      return;
    }

    try {
      setCreating(true);
      setError("");

      const response = await fetch("/api/admin/reminders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          notes: notes.trim() || undefined,
          due_at: new Date(dueAt).toISOString(),
          [paramNameFor[entityType]]: entityId,
        }),
      });

      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error ?? "Unable to create reminder.");

      setReminders((current) => [...current, payload.data]);
      setTitle("");
      setDueAt("");
      setNotes("");
      setEntityId("");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to create reminder.");
    } finally {
      setCreating(false);
    }
  };

  const changeStatus = async (id: string, status: string) => {
    try {
      setSavingId(id);
      setError("");
      const response = await fetch(`/api/admin/reminders/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error ?? "Unable to update reminder.");
      setReminders((current) => current.map((item) => (item.id === id ? payload.data : item)));
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to update reminder.");
    } finally {
      setSavingId(null);
    }
  };

  const remove = async (id: string) => {
    try {
      setSavingId(id);
      setError("");
      const response = await fetch(`/api/admin/reminders/${id}`, { method: "DELETE" });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error ?? "Unable to delete reminder.");
      setReminders((current) => current.filter((item) => item.id !== id));
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to delete reminder.");
    } finally {
      setSavingId(null);
    }
  };

  const pending = reminders.filter((reminder) => reminder.status === "pending");
  const overdue = pending.filter((reminder) => isReminderOverdue(reminder.due_at, reminder.status)).sort((a, b) => a.due_at.localeCompare(b.due_at));
  const upcoming = pending.filter((reminder) => !isReminderOverdue(reminder.due_at, reminder.status)).sort((a, b) => a.due_at.localeCompare(b.due_at));

  const renderReminderRow = (reminder: ReminderRecord) => {
    const link = resolveLink(reminder);
    return (
      <div key={reminder.id} className="flex items-start justify-between gap-3 rounded-2xl border border-white/10 bg-[#050B16]/70 px-4 py-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <p className="truncate text-sm font-medium text-white">{reminder.title}</p>
            <span className={`shrink-0 rounded-full border px-2 py-0.5 text-[9px] uppercase tracking-[0.15em] ${reminderStatusStyles[reminder.status] ?? reminderStatusStyles.pending}`}>
              {formatReminderStatusLabel(reminder.status)}
            </span>
          </div>
          <p className="mt-0.5 text-xs text-slate-500">
            Due {formatDueAt(reminder.due_at)}
            {link ? (
              <>
                {" • "}
                <Link href={link.href} className="text-[#F0D38A] hover:underline">{link.label}</Link>
              </>
            ) : null}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <button
            type="button"
            onClick={() => changeStatus(reminder.id, "completed")}
            disabled={savingId === reminder.id}
            className="rounded-lg border border-emerald-400/30 bg-emerald-400/10 px-2.5 py-1.5 text-xs font-medium text-emerald-200 transition hover:bg-emerald-400/20 disabled:cursor-not-allowed disabled:opacity-70"
          >
            Complete
          </button>
          <button
            type="button"
            onClick={() => remove(reminder.id)}
            disabled={savingId === reminder.id}
            className="rounded-lg border border-white/10 bg-white/5 px-2.5 py-1.5 text-xs font-medium text-slate-300 transition hover:border-rose-400/40 hover:text-rose-200 disabled:cursor-not-allowed disabled:opacity-70"
          >
            Remove
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="flex flex-col gap-4">
      <section className="rounded-[28px] border border-white/10 bg-[#050B16]/90 p-4 shadow-[0_20px_80px_rgba(0,0,0,0.45)] backdrop-blur sm:p-6">
        <h2 className="text-xl font-semibold text-white">Add Reminder</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <select
            value={entityType}
            onChange={(event) => { setEntityType(event.target.value as EntityType); setEntityId(""); }}
            className={inputClass}
          >
            <option value="inquiry">Customer</option>
            <option value="company">Company</option>
            <option value="project">Project</option>
            <option value="contract">Contract</option>
          </select>
          <select value={entityId} onChange={(event) => setEntityId(event.target.value)} className={inputClass}>
            <option value="">Select record</option>
            {entityOptions.map((option) => (
              <option key={option.id} value={option.id}>{option.label}</option>
            ))}
          </select>
          <input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Reminder title" className={inputClass} />
          <input type="datetime-local" value={dueAt} onChange={(event) => setDueAt(event.target.value)} className={`${inputClass} [color-scheme:dark]`} />
          <input value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Notes (optional)" className={inputClass} />
        </div>

        {error ? <p className="mt-3 text-sm text-rose-200">{error}</p> : null}

        <button
          type="button"
          onClick={createReminder}
          disabled={creating}
          className="mt-4 rounded-xl border border-[#C8A24D]/35 bg-[#C8A24D]/16 px-4 py-2.5 text-sm font-medium text-[#F0D38A] transition hover:bg-[#C8A24D]/24 disabled:cursor-not-allowed disabled:opacity-70"
        >
          {creating ? "Adding..." : "Add Reminder"}
        </button>
      </section>

      <section className="rounded-[28px] border border-white/10 bg-[#050B16]/90 p-4 shadow-[0_20px_80px_rgba(0,0,0,0.45)] backdrop-blur sm:p-6">
        <p className="text-sm uppercase tracking-[0.25em] text-rose-300">Overdue ({overdue.length})</p>
        <div className="mt-3 space-y-2">
          {overdue.length === 0 ? (
            <p className="text-sm text-slate-500">Nothing overdue.</p>
          ) : (
            overdue.map(renderReminderRow)
          )}
        </div>
      </section>

      <section className="rounded-[28px] border border-white/10 bg-[#050B16]/90 p-4 shadow-[0_20px_80px_rgba(0,0,0,0.45)] backdrop-blur sm:p-6">
        <p className="text-sm uppercase tracking-[0.25em] text-slate-400">Upcoming ({upcoming.length})</p>
        <div className="mt-3 space-y-2">
          {upcoming.length === 0 ? (
            <p className="text-sm text-slate-500">No upcoming reminders.</p>
          ) : (
            upcoming.map(renderReminderRow)
          )}
        </div>
      </section>
    </div>
  );
}
