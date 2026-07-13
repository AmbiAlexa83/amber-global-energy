"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { BrokerRecord } from "@/lib/supabase-server";

type NewBrokerDraft = {
  name: string;
  email: string;
  phone: string;
  region: string;
  specialty: string;
};

const emptyDraft: NewBrokerDraft = { name: "", email: "", phone: "", region: "", specialty: "" };

const inputClass =
  "w-full rounded-xl border border-white/10 bg-[#050B16] px-3 py-2.5 text-sm text-white outline-none transition focus:border-[#C8A24D] focus:ring-2 focus:ring-[#C8A24D]/30";

export default function BrokerRoster({
  initialBrokers,
  dealCounts,
}: {
  initialBrokers: BrokerRecord[];
  dealCounts: Record<string, { active: number; total: number }>;
}) {
  const router = useRouter();
  const [brokers, setBrokers] = useState(initialBrokers);
  const [draft, setDraft] = useState<NewBrokerDraft>(emptyDraft);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState<NewBrokerDraft>(emptyDraft);
  const [rowError, setRowError] = useState("");
  const [savingId, setSavingId] = useState<string | null>(null);

  const createBroker = async () => {
    if (!draft.name.trim()) {
      setCreateError("Broker name is required.");
      return;
    }

    try {
      setCreating(true);
      setCreateError("");

      const response = await fetch("/api/admin/brokers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(draft),
      });

      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error ?? "Unable to create broker.");

      setBrokers((current) => [...current, payload.data].sort((a, b) => a.name.localeCompare(b.name)));
      setDraft(emptyDraft);
      router.refresh();
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : "Unable to create broker.");
    } finally {
      setCreating(false);
    }
  };

  const startEdit = (broker: BrokerRecord) => {
    setEditingId(broker.id);
    setRowError("");
    setEditDraft({
      name: broker.name,
      email: broker.email ?? "",
      phone: broker.phone ?? "",
      region: broker.region ?? "",
      specialty: broker.specialty ?? "",
    });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setRowError("");
  };

  const saveEdit = async (id: string) => {
    try {
      setSavingId(id);
      setRowError("");

      const response = await fetch(`/api/admin/brokers/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editDraft),
      });

      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error ?? "Unable to save broker.");

      setBrokers((current) => current.map((item) => (item.id === id ? payload.data : item)));
      setEditingId(null);
      router.refresh();
    } catch (err) {
      setRowError(err instanceof Error ? err.message : "Unable to save broker.");
    } finally {
      setSavingId(null);
    }
  };

  const toggleStatus = async (broker: BrokerRecord) => {
    const nextStatus = broker.status === "active" ? "inactive" : "active";
    try {
      setSavingId(broker.id);
      setRowError("");

      const response = await fetch(`/api/admin/brokers/${broker.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: nextStatus }),
      });

      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error ?? "Unable to update broker status.");

      setBrokers((current) => current.map((item) => (item.id === broker.id ? payload.data : item)));
      router.refresh();
    } catch (err) {
      setRowError(err instanceof Error ? err.message : "Unable to update broker status.");
    } finally {
      setSavingId(null);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <section className="rounded-[28px] border border-white/10 bg-[#050B16]/90 p-4 shadow-[0_20px_80px_rgba(0,0,0,0.45)] backdrop-blur sm:p-6">
        <h2 className="text-xl font-semibold text-white">Add Broker</h2>
        <p className="mt-1 text-sm text-slate-400">Register a new broker to make them assignable from the inquiry pipeline.</p>

        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <input
            value={draft.name}
            onChange={(event) => setDraft((current) => ({ ...current, name: event.target.value }))}
            placeholder="Full name"
            className={inputClass}
          />
          <input
            value={draft.email}
            onChange={(event) => setDraft((current) => ({ ...current, email: event.target.value }))}
            placeholder="Email"
            className={inputClass}
          />
          <input
            value={draft.phone}
            onChange={(event) => setDraft((current) => ({ ...current, phone: event.target.value }))}
            placeholder="Phone"
            className={inputClass}
          />
          <input
            value={draft.region}
            onChange={(event) => setDraft((current) => ({ ...current, region: event.target.value }))}
            placeholder="Region"
            className={inputClass}
          />
          <input
            value={draft.specialty}
            onChange={(event) => setDraft((current) => ({ ...current, specialty: event.target.value }))}
            placeholder="Specialty (e.g. Crude Oil)"
            className={inputClass}
          />
        </div>

        {createError ? <p className="mt-3 text-sm text-rose-200">{createError}</p> : null}

        <button
          type="button"
          onClick={createBroker}
          disabled={creating}
          className="mt-4 rounded-xl border border-[#C8A24D]/35 bg-[#C8A24D]/16 px-4 py-2.5 text-sm font-medium text-[#F0D38A] transition hover:bg-[#C8A24D]/24 disabled:cursor-not-allowed disabled:opacity-70"
        >
          {creating ? "Adding..." : "Add Broker"}
        </button>
      </section>

      <section className="rounded-[28px] border border-white/10 bg-[#050B16]/90 p-4 shadow-[0_20px_80px_rgba(0,0,0,0.45)] backdrop-blur sm:p-6">
        <h2 className="text-xl font-semibold text-white">Broker Roster</h2>

        {rowError ? <p className="mt-3 text-sm text-rose-200">{rowError}</p> : null}

        {brokers.length === 0 ? (
          <div className="mt-4 rounded-2xl border border-white/10 bg-[#071A2D]/70 px-5 py-10 text-center text-slate-400">
            No brokers registered yet.
          </div>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="min-w-full border-separate border-spacing-y-2 text-left text-sm">
              <thead>
                <tr className="text-slate-400">
                  <th className="px-3 py-2 font-medium">Name</th>
                  <th className="px-3 py-2 font-medium">Contact</th>
                  <th className="px-3 py-2 font-medium">Region</th>
                  <th className="px-3 py-2 font-medium">Specialty</th>
                  <th className="px-3 py-2 font-medium">Active Deals</th>
                  <th className="px-3 py-2 font-medium">Status</th>
                  <th className="px-3 py-2 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {brokers.map((broker) => {
                  const counts = dealCounts[broker.name.trim().toLowerCase()] ?? { active: 0, total: 0 };
                  const isEditing = editingId === broker.id;

                  return (
                    <tr key={broker.id} className="rounded-2xl bg-[#071A2D]/80 text-slate-300 align-top">
                      {isEditing ? (
                        <>
                          <td className="rounded-l-2xl px-3 py-3">
                            <input
                              value={editDraft.name}
                              onChange={(event) => setEditDraft((current) => ({ ...current, name: event.target.value }))}
                              className={inputClass}
                            />
                          </td>
                          <td className="px-3 py-3 space-y-2">
                            <input
                              value={editDraft.email}
                              onChange={(event) => setEditDraft((current) => ({ ...current, email: event.target.value }))}
                              placeholder="Email"
                              className={inputClass}
                            />
                            <input
                              value={editDraft.phone}
                              onChange={(event) => setEditDraft((current) => ({ ...current, phone: event.target.value }))}
                              placeholder="Phone"
                              className={inputClass}
                            />
                          </td>
                          <td className="px-3 py-3">
                            <input
                              value={editDraft.region}
                              onChange={(event) => setEditDraft((current) => ({ ...current, region: event.target.value }))}
                              className={inputClass}
                            />
                          </td>
                          <td className="px-3 py-3">
                            <input
                              value={editDraft.specialty}
                              onChange={(event) => setEditDraft((current) => ({ ...current, specialty: event.target.value }))}
                              className={inputClass}
                            />
                          </td>
                          <td className="px-3 py-3 text-slate-400">
                            {counts.active} active / {counts.total} total
                          </td>
                          <td className="px-3 py-3">
                            <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs uppercase tracking-[0.2em] ${broker.status === "active" ? "border-emerald-400/35 bg-emerald-400/12 text-emerald-200" : "border-slate-400/35 bg-slate-400/12 text-slate-300"}`}>
                              {broker.status}
                            </span>
                          </td>
                          <td className="rounded-r-2xl px-3 py-3">
                            <div className="flex flex-wrap items-center gap-2">
                              <button
                                type="button"
                                onClick={() => saveEdit(broker.id)}
                                disabled={savingId === broker.id}
                                className="rounded-lg border border-[#C8A24D]/35 bg-[#C8A24D]/16 px-3 py-1.5 text-xs font-medium text-[#F0D38A] transition hover:bg-[#C8A24D]/24 disabled:cursor-not-allowed disabled:opacity-70"
                              >
                                {savingId === broker.id ? "Saving..." : "Save"}
                              </button>
                              <button
                                type="button"
                                onClick={cancelEdit}
                                className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium text-slate-300 transition hover:border-white/20 hover:text-white"
                              >
                                Cancel
                              </button>
                            </div>
                          </td>
                        </>
                      ) : (
                        <>
                          <td className="rounded-l-2xl px-3 py-3 font-medium text-white">{broker.name}</td>
                          <td className="px-3 py-3">
                            <p>{broker.email || "—"}</p>
                            <p className="text-slate-500">{broker.phone || "—"}</p>
                          </td>
                          <td className="px-3 py-3">{broker.region || "—"}</td>
                          <td className="px-3 py-3">{broker.specialty || "—"}</td>
                          <td className="px-3 py-3 text-slate-400">
                            {counts.active} active / {counts.total} total
                          </td>
                          <td className="px-3 py-3">
                            <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs uppercase tracking-[0.2em] ${broker.status === "active" ? "border-emerald-400/35 bg-emerald-400/12 text-emerald-200" : "border-slate-400/35 bg-slate-400/12 text-slate-300"}`}>
                              {broker.status}
                            </span>
                          </td>
                          <td className="rounded-r-2xl px-3 py-3">
                            <div className="flex flex-wrap items-center gap-2">
                              <button
                                type="button"
                                onClick={() => startEdit(broker)}
                                className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium text-slate-300 transition hover:border-[#C8A24D]/40 hover:text-white"
                              >
                                Edit
                              </button>
                              <button
                                type="button"
                                onClick={() => toggleStatus(broker)}
                                disabled={savingId === broker.id}
                                className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium text-slate-300 transition hover:border-[#C8A24D]/40 hover:text-white disabled:cursor-not-allowed disabled:opacity-70"
                              >
                                {broker.status === "active" ? "Deactivate" : "Activate"}
                              </button>
                            </div>
                          </td>
                        </>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
