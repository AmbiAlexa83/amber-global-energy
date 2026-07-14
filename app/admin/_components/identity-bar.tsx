"use client";

import { useEffect, useState } from "react";

type SessionUser = { id: string; name: string; role: string; status: string } | null;
type UserOption = { id: string; name: string; role: string; status: string };

const roleLabels: Record<string, string> = { admin: "Admin", broker: "Broker", viewer: "Viewer" };

export default function IdentityBar() {
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<SessionUser>(null);
  const [users, setUsers] = useState<UserOption[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [accessCode, setAccessCode] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const loadSession = async () => {
    try {
      const response = await fetch("/api/admin/session", { cache: "no-store" });
      const payload = await response.json();
      setCurrentUser(payload.data ?? null);
    } finally {
      setLoading(false);
    }
  };

  const loadUsers = async () => {
    try {
      const response = await fetch("/api/admin/users", { cache: "no-store" });
      const payload = await response.json();
      setUsers((payload.data ?? []).filter((user: UserOption) => user.status === "active"));
    } catch {
      // identity picker is non-critical if this fails
    }
  };

  useEffect(() => {
    loadSession();
    loadUsers();
  }, []);

  const signIn = async () => {
    if (!selectedId || !accessCode.trim()) {
      setError("Choose your name and enter your access code.");
      return;
    }

    try {
      setSubmitting(true);
      setError("");
      const response = await fetch("/api/admin/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ admin_user_id: selectedId, access_code: accessCode }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error ?? "Unable to sign in.");
      setCurrentUser(payload.data);
      setAccessCode("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to sign in.");
    } finally {
      setSubmitting(false);
    }
  };

  const switchUser = async () => {
    await fetch("/api/admin/session", { method: "DELETE" });
    setCurrentUser(null);
    setSelectedId("");
    setAccessCode("");
  };

  if (loading) return null;

  return (
    <div className="border-b border-white/10 bg-[#03070D] px-4 py-2 text-xs sm:px-6 lg:px-8">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-end gap-2">
        {currentUser ? (
          <>
            <span className="text-slate-400">
              Signed in as <span className="font-medium text-white">{currentUser.name}</span>{" "}
              <span className="text-slate-500">({roleLabels[currentUser.role] ?? currentUser.role})</span>
            </span>
            <button
              type="button"
              onClick={switchUser}
              className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[11px] font-medium text-slate-300 transition hover:border-white/20 hover:text-white"
            >
              Switch
            </button>
          </>
        ) : (
          <>
            <span className="text-slate-500">Identify yourself:</span>
            <select
              value={selectedId}
              onChange={(event) => setSelectedId(event.target.value)}
              className="rounded-lg border border-white/10 bg-[#071A2D] px-2 py-1 text-[11px] text-white outline-none focus:border-[#C8A24D] [&>option]:bg-[#050B16]"
            >
              <option value="">Select your name</option>
              {users.map((user) => (
                <option key={user.id} value={user.id}>{user.name}</option>
              ))}
            </select>
            <input
              type="password"
              value={accessCode}
              onChange={(event) => setAccessCode(event.target.value)}
              placeholder="Access code"
              className="w-28 rounded-lg border border-white/10 bg-[#071A2D] px-2 py-1 text-[11px] text-white outline-none focus:border-[#C8A24D]"
            />
            <button
              type="button"
              onClick={signIn}
              disabled={submitting}
              className="rounded-full border border-[#C8A24D]/35 bg-[#C8A24D]/16 px-2.5 py-1 text-[11px] font-medium text-[#F0D38A] transition hover:bg-[#C8A24D]/24 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {submitting ? "..." : "Sign In"}
            </button>
            {error ? <span className="text-rose-300">{error}</span> : null}
          </>
        )}
      </div>
    </div>
  );
}
