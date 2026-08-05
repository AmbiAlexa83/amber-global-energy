"use client";

import { useEffect, useState } from "react";

type ContactItem = {
  id: string;
  company_id: string;
  first_name: string;
  last_name: string | null;
  job_title: string | null;
  department: string | null;
  email: string | null;
  phone: string | null;
  mobile: string | null;
  country: string | null;
  preferred_contact_method: string | null;
  is_primary: boolean;
  status: string;
  notes: string | null;
};

const emptyDraft = {
  first_name: "",
  last_name: "",
  job_title: "",
  department: "",
  email: "",
  phone: "",
  mobile: "",
  country: "",
  preferred_contact_method: "",
  notes: "",
};

const preferredContactMethodOptions = [
  { value: "", label: "No preference" },
  { value: "email", label: "Email" },
  { value: "phone", label: "Phone" },
  { value: "mobile", label: "Mobile" },
];

const inputClass =
  "w-full rounded-xl border border-white/10 bg-[#050B16] px-3 py-2.5 text-sm text-white outline-none transition focus:border-[#C8A24D] focus:ring-2 focus:ring-[#C8A24D]/30 [&>option]:bg-[#050B16]";

const fullName = (contact: ContactItem) => [contact.first_name, contact.last_name].filter(Boolean).join(" ");

const preferredContactMethodLabel = (method: string | null) => {
  if (!method) return null;
  return preferredContactMethodOptions.find((option) => option.value === method)?.label ?? method;
};

export default function CompanyContacts({ companyId }: { companyId: string }) {
  const [contacts, setContacts] = useState<ContactItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState(emptyDraft);
  const [saving, setSaving] = useState(false);
  const [savingId, setSavingId] = useState<string | null>(null);

  const loadContacts = async () => {
    try {
      setLoading(true);
      setError("");
      const response = await fetch(`/api/admin/companies/${companyId}/contacts`, { cache: "no-store" });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error ?? "Unable to load company contacts.");
      setContacts(payload.data ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load company contacts.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadContacts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [companyId]);

  const startAdd = () => {
    setEditingId(null);
    setDraft(emptyDraft);
    setShowForm(true);
    setError("");
  };

  const startEdit = (contact: ContactItem) => {
    setEditingId(contact.id);
    setDraft({
      first_name: contact.first_name,
      last_name: contact.last_name ?? "",
      job_title: contact.job_title ?? "",
      department: contact.department ?? "",
      email: contact.email ?? "",
      phone: contact.phone ?? "",
      mobile: contact.mobile ?? "",
      country: contact.country ?? "",
      preferred_contact_method: contact.preferred_contact_method ?? "",
      notes: contact.notes ?? "",
    });
    setShowForm(true);
    setError("");
  };

  const cancelForm = () => {
    setShowForm(false);
    setEditingId(null);
    setDraft(emptyDraft);
    setError("");
  };

  const save = async () => {
    if (!draft.first_name.trim()) {
      setError("First name is required.");
      return;
    }

    try {
      setSaving(true);
      setError("");

      const body = {
        first_name: draft.first_name,
        last_name: draft.last_name.trim() || null,
        job_title: draft.job_title.trim() || null,
        department: draft.department.trim() || null,
        email: draft.email.trim() || null,
        phone: draft.phone.trim() || null,
        mobile: draft.mobile.trim() || null,
        country: draft.country.trim() || null,
        preferred_contact_method: draft.preferred_contact_method || null,
        notes: draft.notes.trim() || null,
      };

      const response = editingId
        ? await fetch(`/api/admin/company-contacts/${editingId}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
          })
        : await fetch(`/api/admin/companies/${companyId}/contacts`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
          });

      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error ?? "Unable to save contact.");

      cancelForm();
      await loadContacts();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to save contact.");
    } finally {
      setSaving(false);
    }
  };

  const makePrimary = async (id: string) => {
    try {
      setSavingId(id);
      setError("");
      const response = await fetch(`/api/admin/company-contacts/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_primary: true }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error ?? "Unable to make contact primary.");
      await loadContacts();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to make contact primary.");
    } finally {
      setSavingId(null);
    }
  };

  const deactivate = async (id: string) => {
    try {
      setSavingId(id);
      setError("");
      const response = await fetch(`/api/admin/company-contacts/${id}`, { method: "DELETE" });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error ?? "Unable to deactivate contact.");
      await loadContacts();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to deactivate contact.");
    } finally {
      setSavingId(null);
    }
  };

  return (
    <div className="rounded-[24px] border border-white/10 bg-[#071A2D]/90 p-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm uppercase tracking-[0.25em] text-slate-400">Company Contacts</p>
        {!showForm ? (
          <button
            type="button"
            onClick={startAdd}
            className="rounded-xl border border-[#C8A24D]/35 bg-[#C8A24D]/16 px-4 py-2 text-xs font-medium uppercase tracking-[0.2em] text-[#F0D38A] transition hover:bg-[#C8A24D]/24"
          >
            Add Contact
          </button>
        ) : null}
      </div>

      {showForm ? (
        <div className="mt-4 rounded-2xl border border-white/10 bg-[#050B16]/70 p-4">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <input
              value={draft.first_name}
              onChange={(event) => setDraft((current) => ({ ...current, first_name: event.target.value }))}
              placeholder="First name"
              className={inputClass}
            />
            <input
              value={draft.last_name}
              onChange={(event) => setDraft((current) => ({ ...current, last_name: event.target.value }))}
              placeholder="Last name"
              className={inputClass}
            />
            <input
              value={draft.job_title}
              onChange={(event) => setDraft((current) => ({ ...current, job_title: event.target.value }))}
              placeholder="Job title (e.g. Procurement Director)"
              className={inputClass}
            />
            <input
              value={draft.department}
              onChange={(event) => setDraft((current) => ({ ...current, department: event.target.value }))}
              placeholder="Department"
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
              value={draft.mobile}
              onChange={(event) => setDraft((current) => ({ ...current, mobile: event.target.value }))}
              placeholder="Mobile"
              className={inputClass}
            />
            <input
              value={draft.country}
              onChange={(event) => setDraft((current) => ({ ...current, country: event.target.value }))}
              placeholder="Country"
              className={inputClass}
            />
            <select
              value={draft.preferred_contact_method}
              onChange={(event) => setDraft((current) => ({ ...current, preferred_contact_method: event.target.value }))}
              className={inputClass}
            >
              {preferredContactMethodOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <textarea
              value={draft.notes}
              onChange={(event) => setDraft((current) => ({ ...current, notes: event.target.value }))}
              placeholder="Notes"
              rows={1}
              className={`${inputClass} sm:col-span-2 lg:col-span-3`}
            />
          </div>

          {error ? <p className="mt-3 text-sm text-rose-200">{error}</p> : null}

          <div className="mt-3 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={save}
              disabled={saving}
              className="rounded-xl border border-[#C8A24D]/35 bg-[#C8A24D]/16 px-4 py-2.5 text-sm font-medium text-[#F0D38A] transition hover:bg-[#C8A24D]/24 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {saving ? "Saving..." : editingId ? "Save Changes" : "Add Contact"}
            </button>
            <button
              type="button"
              onClick={cancelForm}
              disabled={saving}
              className="rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm font-medium text-slate-300 transition hover:border-white/20 hover:text-white disabled:cursor-not-allowed disabled:opacity-70"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : null}

      {error && !showForm ? <p className="mt-3 text-sm text-rose-200">{error}</p> : null}

      <div className="mt-4 space-y-2">
        {loading ? (
          <p className="text-sm text-slate-500">Loading contacts...</p>
        ) : contacts.length === 0 ? (
          <p className="text-sm text-slate-500">No contacts on file for this company yet.</p>
        ) : (
          contacts.map((contact) => (
            <div key={contact.id} className="rounded-2xl border border-white/10 bg-[#050B16]/70 px-4 py-3">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="truncate text-sm font-medium text-white">{fullName(contact)}</p>
                    {contact.is_primary ? (
                      <span className="shrink-0 rounded-full border border-[#C8A24D]/35 bg-[#C8A24D]/16 px-2 py-0.5 text-[9px] uppercase tracking-[0.15em] text-[#F0D38A]">
                        Primary
                      </span>
                    ) : null}
                    <span
                      className={`shrink-0 rounded-full border px-2 py-0.5 text-[9px] uppercase tracking-[0.15em] ${
                        contact.status === "active"
                          ? "border-emerald-400/35 bg-emerald-400/12 text-emerald-200"
                          : "border-slate-400/35 bg-slate-400/12 text-slate-300"
                      }`}
                    >
                      {contact.status}
                    </span>
                  </div>
                  {contact.job_title || contact.department ? (
                    <p className="mt-0.5 text-xs text-slate-500">
                      {[contact.job_title, contact.department].filter(Boolean).join(" • ")}
                    </p>
                  ) : null}
                  <p className="mt-1 text-xs text-slate-500">
                    {[contact.email, contact.phone, contact.mobile].filter(Boolean).join(" • ") || "No contact details on file"}
                  </p>
                  {contact.country || contact.preferred_contact_method ? (
                    <p className="mt-0.5 text-xs text-slate-500">
                      {[contact.country, preferredContactMethodLabel(contact.preferred_contact_method) ? `Prefers ${preferredContactMethodLabel(contact.preferred_contact_method)}` : null]
                        .filter(Boolean)
                        .join(" • ")}
                    </p>
                  ) : null}
                  {contact.notes ? <p className="mt-1 text-sm text-slate-300">{contact.notes}</p> : null}
                </div>
                <div className="flex shrink-0 flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => startEdit(contact)}
                    disabled={savingId === contact.id}
                    className="rounded-lg border border-white/10 bg-white/5 px-2.5 py-1.5 text-xs font-medium text-slate-300 transition hover:border-white/20 hover:text-white disabled:cursor-not-allowed disabled:opacity-70"
                  >
                    Edit
                  </button>
                  {!contact.is_primary && contact.status === "active" ? (
                    <button
                      type="button"
                      onClick={() => makePrimary(contact.id)}
                      disabled={savingId === contact.id}
                      className="rounded-lg border border-[#C8A24D]/30 bg-[#C8A24D]/10 px-2.5 py-1.5 text-xs font-medium text-[#F0D38A] transition hover:bg-[#C8A24D]/20 disabled:cursor-not-allowed disabled:opacity-70"
                    >
                      Make Primary
                    </button>
                  ) : null}
                  {contact.status === "active" ? (
                    <button
                      type="button"
                      onClick={() => deactivate(contact.id)}
                      disabled={savingId === contact.id}
                      className="rounded-lg border border-white/10 bg-white/5 px-2.5 py-1.5 text-xs font-medium text-slate-300 transition hover:border-rose-400/40 hover:text-rose-200 disabled:cursor-not-allowed disabled:opacity-70"
                    >
                      {savingId === contact.id ? "Working..." : "Deactivate"}
                    </button>
                  ) : null}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
