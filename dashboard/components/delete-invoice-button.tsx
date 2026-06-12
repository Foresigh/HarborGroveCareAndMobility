"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export function DeleteInvoiceButton({ id, invoiceNum }: { id: string; invoiceNum: string }) {
  const router = useRouter();
  const [confirm, setConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);

  async function handleDelete() {
    setDeleting(true);
    await fetch(`/api/invoices/${id}`, { method: "DELETE" });
    router.refresh();
  }

  if (confirm) {
    return (
      <span className="flex items-center gap-1">
        <button
          onClick={handleDelete}
          disabled={deleting}
          className="text-xs text-white bg-red-500 hover:bg-red-600 px-2 py-0.5 rounded font-semibold disabled:opacity-60 transition"
        >
          {deleting ? "…" : "Yes, delete"}
        </button>
        <button
          onClick={() => setConfirm(false)}
          className="text-xs text-slate-500 hover:text-slate-700 px-1"
        >
          Cancel
        </button>
      </span>
    );
  }

  return (
    <button
      onClick={() => setConfirm(true)}
      title={`Delete ${invoiceNum}`}
      className="text-slate-300 hover:text-red-500 transition ml-2"
    >
      <svg viewBox="0 0 24 24" fill="currentColor" width="15" height="15">
        <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zm2.46-7.12l1.41-1.41L12 12.59l2.12-2.12 1.41 1.41L13.41 14l2.12 2.12-1.41 1.41L12 15.41l-2.12 2.12-1.41-1.41L10.59 14l-2.13-2.12zM15.5 4l-1-1h-5l-1 1H5v2h14V4z"/>
      </svg>
    </button>
  );
}
