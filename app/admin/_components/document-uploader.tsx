"use client";

import { useEffect, useState } from "react";

type EntityType = "inquiry" | "company" | "project" | "contract";

type DocumentItem = {
  id: string;
  file_name: string;
  file_size: number | null;
  mime_type: string | null;
  notes: string | null;
  created_at: string;
  download_url: string | null;
};

const paramNameFor: Record<EntityType, string> = {
  inquiry: "inquiry_id",
  company: "company_id",
  project: "project_id",
  contract: "contract_id",
};

const formatFileSize = (bytes: number | null) => {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const formatDate = (value: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("en", { year: "numeric", month: "short", day: "numeric" }).format(date);
};

export default function DocumentUploader({ entityType, entityId }: { entityType: EntityType; entityId: string }) {
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [notes, setNotes] = useState("");
  const [uploading, setUploading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const paramName = paramNameFor[entityType];

  const loadDocuments = async () => {
    try {
      setLoading(true);
      setError("");
      const response = await fetch(`/api/admin/documents?${paramName}=${encodeURIComponent(entityId)}`, { cache: "no-store" });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error ?? "Unable to load documents.");
      setDocuments(payload.data ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load documents.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDocuments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entityId]);

  const upload = async () => {
    if (!file) {
      setError("Choose a file to upload.");
      return;
    }

    try {
      setUploading(true);
      setError("");

      const formData = new FormData();
      formData.append("file", file);
      formData.append(paramName, entityId);
      if (notes.trim()) formData.append("notes", notes.trim());

      const response = await fetch("/api/admin/documents", { method: "POST", body: formData });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error ?? "Unable to upload document.");

      setFile(null);
      setNotes("");
      await loadDocuments();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to upload document.");
    } finally {
      setUploading(false);
    }
  };

  const remove = async (id: string) => {
    try {
      setDeletingId(id);
      setError("");
      const response = await fetch(`/api/admin/documents/${id}`, { method: "DELETE" });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error ?? "Unable to delete document.");
      setDocuments((current) => current.filter((doc) => doc.id !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to delete document.");
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="rounded-[24px] border border-white/10 bg-[#071A2D]/90 p-4">
      <p className="text-sm uppercase tracking-[0.25em] text-slate-400">Uploaded Documents</p>

      <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center">
        <input
          type="file"
          onChange={(event) => setFile(event.target.files?.[0] ?? null)}
          className="flex-1 rounded-xl border border-white/10 bg-[#050B16] px-3 py-2.5 text-sm text-slate-300 outline-none file:mr-3 file:rounded-lg file:border-0 file:bg-[#C8A24D]/16 file:px-3 file:py-1.5 file:text-xs file:font-medium file:text-[#F0D38A]"
        />
        <input
          value={notes}
          onChange={(event) => setNotes(event.target.value)}
          placeholder="Notes (optional)"
          className="flex-1 rounded-xl border border-white/10 bg-[#050B16] px-3 py-2.5 text-sm text-white outline-none transition focus:border-[#C8A24D] focus:ring-2 focus:ring-[#C8A24D]/30"
        />
        <button
          type="button"
          onClick={upload}
          disabled={uploading}
          className="rounded-xl border border-[#C8A24D]/35 bg-[#C8A24D]/16 px-4 py-2.5 text-sm font-medium text-[#F0D38A] transition hover:bg-[#C8A24D]/24 disabled:cursor-not-allowed disabled:opacity-70"
        >
          {uploading ? "Uploading..." : "Upload"}
        </button>
      </div>

      {error ? <p className="mt-3 text-sm text-rose-200">{error}</p> : null}

      <div className="mt-4 space-y-2">
        {loading ? (
          <p className="text-sm text-slate-500">Loading documents...</p>
        ) : documents.length === 0 ? (
          <p className="text-sm text-slate-500">No documents uploaded yet.</p>
        ) : (
          documents.map((document) => (
            <div key={document.id} className="flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-[#050B16]/70 px-4 py-3">
              <div className="min-w-0">
                {document.download_url ? (
                  <a
                    href={document.download_url}
                    target="_blank"
                    rel="noreferrer"
                    className="truncate text-sm font-medium text-[#F0D38A] hover:underline"
                  >
                    {document.file_name}
                  </a>
                ) : (
                  <p className="truncate text-sm font-medium text-white">{document.file_name}</p>
                )}
                <p className="mt-0.5 text-xs text-slate-500">
                  {formatFileSize(document.file_size)} • {formatDate(document.created_at)}
                  {document.notes ? ` • ${document.notes}` : ""}
                </p>
              </div>
              <button
                type="button"
                onClick={() => remove(document.id)}
                disabled={deletingId === document.id}
                className="shrink-0 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium text-slate-300 transition hover:border-rose-400/40 hover:text-rose-200 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {deletingId === document.id ? "Removing..." : "Remove"}
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
