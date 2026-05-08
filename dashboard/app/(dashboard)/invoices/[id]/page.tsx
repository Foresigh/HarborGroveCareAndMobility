"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { toast } from "sonner";

interface InvoiceItem { id: string; description: string; quantity: number; unitPrice: number; total: number; }
interface InvoiceDetail {
  id: string; invoiceNum: string; status: string;
  issueDate: string; dueDate: string; sentAt: string | null; paidAt: string | null;
  subtotal: number; tax: number; total: number; notes: string | null;
  client: { firstName: string; lastName: string; email?: string; phone: string; address?: string; city?: string; state: string; };
  items: InvoiceItem[];
}

export default function InvoiceDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [invoice, setInvoice] = useState<InvoiceDetail | null>(null);
  const [sending, setSending] = useState(false);
  const [marking, setMarking] = useState(false);

  useEffect(() => {
    fetch(`/api/invoices/${id}`).then((r) => r.json()).then(setInvoice);
  }, [id]);

  async function sendInvoice() {
    setSending(true);
    const res = await fetch(`/api/invoices/${id}/send`, { method: "POST" });
    setSending(false);
    if (res.ok) {
      toast.success("Invoice sent to client");
      setInvoice((prev) => prev ? { ...prev, status: "SENT", sentAt: new Date().toISOString() } : prev);
    } else {
      const err = await res.json();
      toast.error(err.error ?? "Failed to send invoice");
    }
  }

  async function markPaid() {
    setMarking(true);
    const res = await fetch(`/api/invoices/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "PAID", paidAt: new Date().toISOString() }),
    });
    setMarking(false);
    if (res.ok) {
      toast.success("Invoice marked as paid");
      setInvoice((prev) => prev ? { ...prev, status: "PAID", paidAt: new Date().toISOString() } : prev);
    } else {
      toast.error("Failed to update invoice");
    }
  }

  function downloadPDF() {
    window.print();
  }

  if (!invoice) return <div className="text-slate-400 text-sm">Loading…</div>;

  const statusColor: Record<string, string> = {
    DRAFT: "bg-slate-100 text-slate-600",
    SENT: "bg-blue-100 text-blue-700",
    PAID: "bg-emerald-100 text-emerald-700",
    OVERDUE: "bg-rose-100 text-rose-700",
  };

  return (
    <>
      <style>{`
        @media print {
          body * { visibility: hidden; }
          #invoice-printable, #invoice-printable * { visibility: visible; }
          #invoice-printable { position: fixed; inset: 0; width: 100%; }
          #invoice-actions { display: none !important; }
        }
      `}</style>

      <div className="max-w-3xl mx-auto space-y-5">
        <div id="invoice-actions" className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <button onClick={() => router.back()} className="text-slate-500 hover:text-slate-800 text-sm">← Back</button>
            <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${statusColor[invoice.status] ?? "bg-slate-100 text-slate-600"}`}>
              {invoice.status}
            </span>
          </div>
          <div className="flex gap-2">
            <button
              onClick={downloadPDF}
              className="flex items-center gap-1.5 border border-slate-200 hover:border-slate-300 bg-white text-slate-700 hover:bg-slate-50 text-xs font-semibold px-4 py-2 rounded-lg transition"
            >
              <svg viewBox="0 0 24 24" fill="currentColor" width="14" height="14">
                <path d="M19 9h-4V3H9v6H5l7 7 7-7zm-8 2V5h2v6h1.17L12 13.17 9.83 11H11zm-6 7h14v2H5v-2z"/>
              </svg>
              Download PDF
            </button>
            {invoice.status !== "PAID" && (
              <button onClick={markPaid} disabled={marking} className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold px-4 py-2 rounded-lg transition disabled:opacity-60">
                {marking ? "Saving…" : "Mark as Paid"}
              </button>
            )}
            {invoice.status !== "PAID" && (
              <button onClick={sendInvoice} disabled={sending} className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold px-4 py-2 rounded-lg transition disabled:opacity-60">
                {sending ? "Sending…" : invoice.sentAt ? "Resend Invoice" : "Send Invoice"}
              </button>
            )}
          </div>
        </div>

        <div id="invoice-printable" className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="bg-[#0D2B4E] px-8 py-4">
            <div className="flex items-center justify-between">
              <img src="/logo.png" alt="Harbor Grove Care & Mobility" style={{ height: 48, width: "auto", filter: "brightness(0) invert(1)" }} />
              <div className="text-right">
                <div className="text-slate-400 text-xs uppercase tracking-wide">Invoice</div>
                <div className="text-white font-bold text-2xl">{invoice.invoiceNum}</div>
              </div>
            </div>
            <div className="mt-3 text-slate-400 text-xs">Non-Emergency Medical Transportation · Meridian, ID 83642 · 208-297-3601</div>
          </div>

          <div className="px-8 py-6">
            <div className="grid grid-cols-2 gap-6 mb-6">
              <div>
                <div className="text-xs text-slate-400 uppercase tracking-wide mb-1">Bill To</div>
                <div className="font-semibold text-slate-800">{invoice.client.firstName} {invoice.client.lastName}</div>
                {invoice.client.email && <div className="text-sm text-slate-500">{invoice.client.email}</div>}
                <div className="text-sm text-slate-500">{invoice.client.phone}</div>
                {invoice.client.address && <div className="text-sm text-slate-500">{invoice.client.address}, {invoice.client.city}, {invoice.client.state}</div>}
              </div>
              <div className="text-right">
                <div className="text-xs text-slate-400 mb-1">Issue Date: <span className="text-slate-700">{new Date(invoice.issueDate).toLocaleDateString()}</span></div>
                <div className="text-xs text-slate-400 mb-1">Due Date: <span className="text-slate-700">{new Date(invoice.dueDate).toLocaleDateString()}</span></div>
                {invoice.sentAt && <div className="text-xs text-slate-400">Sent: <span className="text-slate-700">{new Date(invoice.sentAt).toLocaleDateString()}</span></div>}
                {invoice.paidAt && <div className="text-xs text-emerald-600 font-semibold">Paid: {new Date(invoice.paidAt).toLocaleDateString()}</div>}
              </div>
            </div>

            <table className="w-full mb-6">
              <thead>
                <tr className="bg-slate-50 border-y border-slate-200">
                  <th className="text-left px-3 py-2.5 text-xs font-semibold text-slate-500 uppercase tracking-wide">Description</th>
                  <th className="text-center px-3 py-2.5 text-xs font-semibold text-slate-500 uppercase tracking-wide">Qty</th>
                  <th className="text-right px-3 py-2.5 text-xs font-semibold text-slate-500 uppercase tracking-wide">Unit Price</th>
                  <th className="text-right px-3 py-2.5 text-xs font-semibold text-slate-500 uppercase tracking-wide">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {invoice.items.map((item) => (
                  <tr key={item.id}>
                    <td className="px-3 py-3 text-sm text-slate-700">{item.description}</td>
                    <td className="px-3 py-3 text-sm text-slate-600 text-center">{item.quantity}</td>
                    <td className="px-3 py-3 text-sm text-slate-600 text-right">${Number(item.unitPrice).toFixed(2)}</td>
                    <td className="px-3 py-3 text-sm text-slate-800 font-medium text-right">${Number(item.total).toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-slate-200">
                  <td colSpan={3} className="px-3 py-3 text-right font-bold text-slate-800">Total Due</td>
                  <td className="px-3 py-3 text-right font-bold text-xl text-[#0D2B4E]">${Number(invoice.total).toFixed(2)}</td>
                </tr>
              </tfoot>
            </table>

            {invoice.notes && (
              <div className="bg-slate-50 rounded-lg p-4 text-sm text-slate-600">{invoice.notes}</div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
