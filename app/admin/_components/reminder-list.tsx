"use client";

import { useEffect, useState } from "react";
import { reminderStatusStyles, formatReminderStatusLabel, isReminderOverdue } from "@/lib/reminder-helpers";

type EntityType = "inquiry" | "company" | "project" | "contract";

type ReminderItem = {
  id: string;
  title: string;
  notes: string | null;
  due_at: string;
  status: string;
};

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

export default function ReminderList({ entityType, entityId }: { entityType: EntityType; entityId: string }) {
  const [reminders, setReminders] = useState<ReminderItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [title, setTitle] = useState("");
  const [dueAt, setDueAt] = useState("");
  const [notes, setNotes] = useState("");
  const [creating, setCreating] = useState(false);
  const [savingId, setSavingId] = useState<string | null>(null);

  const paramName = paramNameFor[entityType];

  const loadReminders = async () => {
    try {
      setLoading(true);
      setError("");
      const response = await fetch(`/api/admin/reminders?${paramName}=${encodeURIComponent(entityId)}`, { cache: "no-store" });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error ?? "Unable to load reminders.");
      setReminders(payload.data ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load reminders.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReminders();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entityId]);

  const createReminder = async () => {
    if (!title.trim() || !dueAt) {
      setError("Title and due date are required.");
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
          [paramName]: entityId,
        }),
      });

      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error ?? "Unable to create reminder.");

      setTitle("");
      setDueAt("");
      setNotes("");
      await loadReminders();
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
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to delete reminder.");
    } finally {
      setSavingId(null);
    }
  };

  return (
    <div className="rounded-[24px] border border-white/10 bg-[#071A2D]/90 p-4">
      <p className="text-sm uppercase tracking-[0.25em] text-slate-400">Follow-Up Reminders</p>

      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <input
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          placeholder="Reminder title"
          className={`${inputClass} lg:col-span-2`}
        />
        <input
          type="datetime-local"
          value={dueAt}
          onChange={(event) => setDueAt(event.target.value)}
          className={`${inputClass} [color-scheme:dark]`}
        />
        <input
          value={notes}
          onChange={(event) => setNotes(event.target.value)}
          placeholder="Notes (optional)"
          className={inputClass}
        />
      </div>

      {error ? <p className="mt-3 text-sm text-rose-200">{error}</p> : null}

      <button
        type="button"
        onClick={createReminder}
        disabled={creating}
        className="mt-3 rounded-xl border border-[#C8A24D]/35 bg-[#C8A24D]/16 px-4 py-2.5 text-sm font-medium text-[#F0D38A] transition hover:bg-[#C8A24D]/24 disabled:cursor-not-allowed disabled:opacity-70"
      >
        {creating ? "Adding..." : "Add Reminder"}
      </button>

      <div className="mt-4 space-y-2">
        {loading ? (
          <p className="text-sm text-slate-500">Loading reminders...</p>
        ) : reminders.length === 0 ? (
          <p className="text-sm text-slate-500">No follow-up reminders yet.</p>
        ) : (
          reminders.map((reminder) => {
            const overdue = isReminderOverdue(reminder.due_at, reminder.status);
            return (
              <div key={reminder.id} className="flex items-start justify-between gap-3 rounded-2xl border border-white/10 bg-[#050B16]/70 px-4 py-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="truncate text-sm font-medium text-white">{reminder.title}</p>
                    <span className={`shrink-0 rounded-full border px-2 py-0.5 text-[9px] uppercase tracking-[0.15em] ${reminderStatusStyles[reminder.status] ?? reminderStatusStyles.pending}`}>
                      {formatReminderStatusLabel(reminder.status)}
                    </span>
                    {overdue ? (
                      <span className="shrink-0 rounded-full border border-rose-400/35 bg-rose-400/12 px-2 py-0.5 text-[9px] uppercase tracking-[0.15em] text-rose-200">
                        Overdue
                      </span>
                    ) : null}
                  </div>
                  <p className="mt-0.5 text-xs text-slate-500">
                    Due {formatDueAt(reminder.due_at)}{reminder.notes ? ` • ${reminder.notes}` : ""}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  {reminder.status === "pending" ? (
                    <>
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
                        onClick={() => changeStatus(reminder.id, "dismissed")}
                        disabled={savingId === reminder.id}
                        className="rounded-lg border border-white/10 bg-white/5 px-2.5 py-1.5 text-xs font-medium text-slate-300 transition hover:border-white/20 hover:text-white disabled:cursor-not-allowed disabled:opacity-70"
                      >
                        Dismiss
                      </button>
                    </>
                  ) : null}
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
          })
        )}
      </div>
    </div>
  );
}
