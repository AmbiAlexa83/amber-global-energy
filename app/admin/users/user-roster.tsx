"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { roleOptions } from "@/lib/role-options";

type SafeUser = {
  id: string;
  name: string;
  email: string | null;
  role: string;
  status: string;
  created_at: string;
  updated_at: string;
};

const inputClass =
  "w-full rounded-xl border border-white/10 bg-[#050B16] px-3 py-2.5 text-sm text-white outline-none transition focus:border-[#C8A24D] focus:ring-2 focus:ring-[#C8A24D]/30 [&>option]:bg-[#050B16]";

const roleBadgeClass = (role: string) => {
  if (role === "admin") return "border-[#C8A24D]/35 bg-[#C8A24D]/12 text-[#F0D38A]";
  if (role === "broker") return "border-sky-400/35 bg-sky-400/12 text-sky-200";
  return "border-slate-400/35 bg-slate-400/12 text-slate-300";
};

export default function UserRoster({ initialUsers }: { initialUsers: SafeUser[] }) {
  const router = useRouter();
  const [users, setUsers] = useState(initialUsers);
  const [currentRole, setCurrentRole] = useState<string | null>(null);
  const [draft, setDraft] = useState({ name: "", email: "", role: "broker", access_code: "" });
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState("");
  const [savingId, setSavingId] = useState<string | null>(null);
  const [rowError, setRowError] = useState("");

  useEffect(() => {
    fetch("/api/admin/session", { cache: "no-store" })
      .then((res) => res.json())
      .then((payload) => setCurrentRole(payload.data?.role ?? null))
      .catch(() => setCurrentRole(null));
  }, []);

  const canManageUsers = currentRole === null || currentRole === "admin";

  const createUser = async () => {
    if (!draft.name.trim() || !draft.access_code.trim()) {
      setCreateError("Name and access code are required.");
      return;
    }

    try {
      setCreating(true);
      setCreateError("");

      const response = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(draft),
      });

      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error ?? "Unable to create user.");

      setUsers((current) => [...current, payload.data].sort((a, b) => a.name.localeCompare(b.name)));
      setDraft({ name: "", email: "", role: "broker", access_code: "" });
      router.refresh();
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : "Unable to create user.");
    } finally {
      setCreating(false);
    }
  };

  const updateRole = async (id: string, role: string) => {
    try {
      setSavingId(id);
      setRowError("");
      const response = await fetch(`/api/admin/users/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error ?? "Unable to update role.");
      setUsers((current) => current.map((user) => (user.id === id ? payload.data : user)));
      router.refresh();
    } catch (err) {
      setRowError(err instanceof Error ? err.message : "Unable to update role.");
    } finally {
      setSavingId(null);
    }
  };

  const toggleStatus = async (user: SafeUser) => {
    const nextStatus = user.status === "active" ? "inactive" : "active";
    try {
      setSavingId(user.id);
      setRowError("");
      const response = await fetch(`/api/admin/users/${user.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: nextStatus }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error ?? "Unable to update status.");
      setUsers((current) => current.map((item) => (item.id === user.id ? payload.data : item)));
      router.refresh();
    } catch (err) {
      setRowError(err instanceof Error ? err.message : "Unable to update status.");
    } finally {
      setSavingId(null);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      {!canManageUsers ? (
        <div className="rounded-2xl border border-white/10 bg-[#071A2D]/70 px-4 py-3 text-sm text-slate-400">
          You&apos;re signed in as a {currentRole}. Viewing the team roster is available to everyone, but only Admins can
          add users or change roles.
        </div>
      ) : null}

      {canManageUsers ? (
        <section className="rounded-[28px] border border-white/10 bg-[#050B16]/90 p-4 shadow-[0_20px_80px_rgba(0,0,0,0.45)] backdrop-blur sm:p-6">
          <h2 className="text-xl font-semibold text-white">Add Team Member</h2>
          <p className="mt-1 text-sm text-slate-400">Their access code is used only for the &ldquo;Identify yourself&rdquo; prompt inside the admin area — it is not a login password for the site itself.</p>

          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <input
              value={draft.name}
              onChange={(event) => setDraft((current) => ({ ...current, name: event.target.value }))}
              placeholder="Full name"
              className={inputClass}
            />
            <input
              value={draft.email}
              onChange={(event) => setDraft((current) => ({ ...current, email: event.target.value }))}
              placeholder="Email (optional)"
              className={inputClass}
            />
            <select
              value={draft.role}
              onChange={(event) => setDraft((current) => ({ ...current, role: event.target.value }))}
              className={inputClass}
            >
              {roleOptions.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
            <input
              value={draft.access_code}
              onChange={(event) => setDraft((current) => ({ ...current, access_code: event.target.value }))}
              placeholder="Access code (min 4 chars)"
              className={inputClass}
            />
          </div>

          {createError ? <p className="mt-3 text-sm text-rose-200">{createError}</p> : null}

          <button
            type="button"
            onClick={createUser}
            disabled={creating}
            className="mt-4 rounded-xl border border-[#C8A24D]/35 bg-[#C8A24D]/16 px-4 py-2.5 text-sm font-medium text-[#F0D38A] transition hover:bg-[#C8A24D]/24 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {creating ? "Adding..." : "Add Team Member"}
          </button>
        </section>
      ) : null}

      <section className="rounded-[28px] border border-white/10 bg-[#050B16]/90 p-4 shadow-[0_20px_80px_rgba(0,0,0,0.45)] backdrop-blur sm:p-6">
        <h2 className="text-xl font-semibold text-white">Team Roster</h2>

        {rowError ? <p className="mt-3 text-sm text-rose-200">{rowError}</p> : null}

        {users.length === 0 ? (
          <div className="mt-4 rounded-2xl border border-white/10 bg-[#071A2D]/70 px-5 py-10 text-center text-slate-400">
            No team members yet. Until someone is added and signs in, the app treats every action as Admin-level (no
            restrictions apply).
          </div>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="min-w-full border-separate border-spacing-y-2 text-left text-sm">
              <thead>
                <tr className="text-slate-400">
                  <th className="px-3 py-2 font-medium">Name</th>
                  <th className="px-3 py-2 font-medium">Email</th>
                  <th className="px-3 py-2 font-medium">Role</th>
                  <th className="px-3 py-2 font-medium">Status</th>
                  {canManageUsers ? <th className="px-3 py-2 font-medium">Actions</th> : null}
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user.id} className="rounded-2xl bg-[#071A2D]/80 text-slate-300">
                    <td className="rounded-l-2xl px-3 py-3 font-medium text-white">{user.name}</td>
                    <td className="px-3 py-3">{user.email || "—"}</td>
                    <td className="px-3 py-3">
                      {canManageUsers ? (
                        <select
                          value={user.role}
                          onChange={(event) => updateRole(user.id, event.target.value)}
                          disabled={savingId === user.id}
                          className={`rounded-full border px-2.5 py-1 text-xs uppercase tracking-[0.15em] ${roleBadgeClass(user.role)} bg-transparent [&>option]:bg-[#050B16] [&>option]:text-white`}
                        >
                          {roleOptions.map((option) => (
                            <option key={option.value} value={option.value}>{option.label}</option>
                          ))}
                        </select>
                      ) : (
                        <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs uppercase tracking-[0.15em] ${roleBadgeClass(user.role)}`}>
                          {roleOptions.find((option) => option.value === user.role)?.label ?? user.role}
                        </span>
                      )}
                    </td>
                    <td className={`${canManageUsers ? "" : "rounded-r-2xl"} px-3 py-3`}>
                      <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs uppercase tracking-[0.2em] ${user.status === "active" ? "border-emerald-400/35 bg-emerald-400/12 text-emerald-200" : "border-slate-400/35 bg-slate-400/12 text-slate-300"}`}>
                        {user.status}
                      </span>
                    </td>
                    {canManageUsers ? (
                      <td className="rounded-r-2xl px-3 py-3">
                        <button
                          type="button"
                          onClick={() => toggleStatus(user)}
                          disabled={savingId === user.id}
                          className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium text-slate-300 transition hover:border-[#C8A24D]/40 hover:text-white disabled:cursor-not-allowed disabled:opacity-70"
                        >
                          {user.status === "active" ? "Deactivate" : "Activate"}
                        </button>
                      </td>
                    ) : null}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
