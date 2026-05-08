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
          @page { margin: 12mm; size: A4; }
          body * { visibility: hidden; }
          #invoice-printable, #invoice-printable * { visibility: visible; }
          #invoice-printable {
            position: fixed;
            inset: 0;
            width: 100%;
            border: none !important;
            border-radius: 0 !important;
            box-shadow: none !important;
          }
          #invoice-actions { display: none !important; }
        }
      `}</style>

      <div className="max-w-3xl mx-auto space-y-5">
        {/* Action bar — hidden on print */}
        <div id="invoice-actions" className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <button onClick={() => router.back()} className="text-slate-500 hover:text-slate-800 text-sm">← Back</button>
            <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${statusColor[invoice.status] ?? "bg-slate-100 text-slate-600"}`}>
              {invoice.status}
            </span>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => window.print()}
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
              <button onClick={sendInvoice} disabled={sending} className="bg-[#0D2B4E] hover:bg-[#0a2240] text-white text-xs font-semibold px-4 py-2 rounded-lg transition disabled:opacity-60">
                {sending ? "Sending…" : invoice.sentAt ? "Resend Invoice" : "Send Invoice"}
              </button>
            )}
          </div>
        </div>

        {/* Invoice document */}
        <div id="invoice-printable" className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">

          {/* Top accent bar */}
          <div style={{ height: 5, background: "linear-gradient(90deg, #0D2B4E 0%, #F9A825 100%)" }} />

          {/* Header */}
          <div className="px-10 pt-8 pb-6 flex items-start justify-between border-b border-slate-100">
            <div>
              <img src="/logo.png" alt="Harbor Grove Care & Mobility" style={{ height: 56, width: "auto", display: "block" }} />
              <div style={{ marginTop: 8, fontSize: 12, color: "#94a3b8" }}>Non-Emergency Medical Transportation</div>
              <div style={{ fontSize: 12, color: "#94a3b8" }}>Meridian, ID 83642 · (208) 297-3601</div>
              <div style={{ fontSize: 12, color: "#94a3b8" }}>harborgrovecare@gmail.com</div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.1em", color: "#94a3b8", textTransform: "uppercase" }}>Invoice</div>
              <div style={{ fontSize: 28, fontWeight: 800, color: "#0D2B4E", letterSpacing: "-0.5px" }}>{invoice.invoiceNum}</div>
              <div style={{ marginTop: 8 }}>
                {invoice.status === "PAID" ? (
                  <span style={{ display: "inline-block", background: "#d1fae5", color: "#065f46", fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 20, letterSpacing: "0.05em", textTransform: "uppercase" }}>Paid</span>
                ) : invoice.status === "OVERDUE" ? (
                  <span style={{ display: "inline-block", background: "#fee2e2", color: "#991b1b", fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 20, letterSpacing: "0.05em", textTransform: "uppercase" }}>Overdue</span>
                ) : invoice.status === "SENT" ? (
                  <span style={{ display: "inline-block", background: "#dbeafe", color: "#1e40af", fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 20, letterSpacing: "0.05em", textTransform: "uppercase" }}>Sent</span>
                ) : (
                  <span style={{ display: "inline-block", background: "#f1f5f9", color: "#475569", fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 20, letterSpacing: "0.05em", textTransform: "uppercase" }}>Draft</span>
                )}
              </div>
            </div>
          </div>

          {/* Bill to + dates */}
          <div className="px-10 py-6 grid grid-cols-2 gap-8 border-b border-slate-100">
            <div>
              <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.12em", color: "#94a3b8", textTransform: "uppercase", marginBottom: 8 }}>Bill To</div>
              <div style={{ fontSize: 15, fontWeight: 700, color: "#0D2B4E" }}>{invoice.client.firstName} {invoice.client.lastName}</div>
              {invoice.client.email && <div style={{ fontSize: 13, color: "#64748b", marginTop: 2 }}>{invoice.client.email}</div>}
              <div style={{ fontSize: 13, color: "#64748b" }}>{invoice.client.phone}</div>
              {invoice.client.address && (
                <div style={{ fontSize: 13, color: "#64748b" }}>{invoice.client.address}, {invoice.client.city}, {invoice.client.state}</div>
              )}
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.12em", color: "#94a3b8", textTransform: "uppercase", marginBottom: 8 }}>Details</div>
              <div style={{ fontSize: 13, color: "#64748b", marginBottom: 3 }}>
                <span style={{ fontWeight: 600, color: "#334155" }}>Issue Date: </span>
                {new Date(invoice.issueDate).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
              </div>
              <div style={{ fontSize: 13, color: "#64748b", marginBottom: 3 }}>
                <span style={{ fontWeight: 600, color: "#334155" }}>Due Date: </span>
                {new Date(invoice.dueDate).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
              </div>
              {invoice.sentAt && (
                <div style={{ fontSize: 13, color: "#64748b", marginBottom: 3 }}>
                  <span style={{ fontWeight: 600, color: "#334155" }}>Sent: </span>
                  {new Date(invoice.sentAt).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
                </div>
              )}
              {invoice.paidAt && (
                <div style={{ fontSize: 13, color: "#059669", fontWeight: 600 }}>
                  Paid: {new Date(invoice.paidAt).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
                </div>
              )}
            </div>
          </div>

          {/* Line items */}
          <div className="px-10 py-6">
            <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: 24 }}>
              <thead>
                <tr style={{ borderBottom: "2px solid #0D2B4E" }}>
                  <th style={{ textAlign: "left", padding: "8px 12px 10px 0", fontSize: 11, fontWeight: 700, color: "#0D2B4E", letterSpacing: "0.08em", textTransform: "uppercase" }}>Description</th>
                  <th style={{ textAlign: "center", padding: "8px 12px 10px", fontSize: 11, fontWeight: 700, color: "#0D2B4E", letterSpacing: "0.08em", textTransform: "uppercase", width: 60 }}>Qty</th>
                  <th style={{ textAlign: "right", padding: "8px 12px 10px", fontSize: 11, fontWeight: 700, color: "#0D2B4E", letterSpacing: "0.08em", textTransform: "uppercase", width: 110 }}>Unit Price</th>
                  <th style={{ textAlign: "right", padding: "8px 0 10px 12px", fontSize: 11, fontWeight: 700, color: "#0D2B4E", letterSpacing: "0.08em", textTransform: "uppercase", width: 110 }}>Total</th>
                </tr>
              </thead>
              <tbody>
                {invoice.items.map((item, i) => (
                  <tr key={item.id} style={{ borderBottom: "1px solid #f1f5f9", background: i % 2 === 0 ? "#fff" : "#fafbfc" }}>
                    <td style={{ padding: "12px 12px 12px 0", fontSize: 14, color: "#334155" }}>{item.description}</td>
                    <td style={{ padding: "12px", fontSize: 14, color: "#64748b", textAlign: "center" }}>{item.quantity}</td>
                    <td style={{ padding: "12px", fontSize: 14, color: "#64748b", textAlign: "right" }}>${Number(item.unitPrice).toFixed(2)}</td>
                    <td style={{ padding: "12px 0 12px 12px", fontSize: 14, color: "#334155", fontWeight: 600, textAlign: "right" }}>${Number(item.total).toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Total */}
            <div style={{ display: "flex", justifyContent: "flex-end" }}>
              <div style={{ width: 260 }}>
                <div style={{ display: "flex", justifyContent: "space-between", padding: "10px 0", borderTop: "2px solid #0D2B4E" }}>
                  <span style={{ fontSize: 15, fontWeight: 700, color: "#0D2B4E" }}>Total Due</span>
                  <span style={{ fontSize: 22, fontWeight: 800, color: "#0D2B4E" }}>${Number(invoice.total).toFixed(2)}</span>
                </div>
              </div>
            </div>

            {invoice.notes && (
              <div style={{ marginTop: 24, padding: 16, background: "#f8fafc", borderLeft: "3px solid #F9A825", borderRadius: 4, fontSize: 13, color: "#64748b" }}>
                <div style={{ fontWeight: 600, color: "#334155", marginBottom: 4 }}>Notes</div>
                {invoice.notes}
              </div>
            )}
          </div>

          {/* Footer */}
          <div style={{ borderTop: "1px solid #f1f5f9", padding: "20px 40px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div style={{ fontSize: 11, color: "#94a3b8" }}>
              Thank you for choosing Harbor Grove Care &amp; Mobility
            </div>
            <div style={{ fontSize: 11, color: "#94a3b8", textAlign: "right" }}>
              (208) 297-3601 · harborgrovecare@gmail.com
            </div>
          </div>

          {/* Bottom accent bar */}
          <div style={{ height: 4, background: "linear-gradient(90deg, #F9A825 0%, #0D2B4E 100%)" }} />
        </div>
      </div>
    </>
  );
}
