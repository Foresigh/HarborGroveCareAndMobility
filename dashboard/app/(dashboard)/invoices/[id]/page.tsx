"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { toast } from "sonner";

interface TripItem {
  id: string; description: string; quantity: number; unitPrice: number; total: number;
  serviceType?: string; tripType?: string; patientName?: string; patientDob?: string;
  serviceDate?: string; miles?: number; ownWheelchair?: boolean; needsO2?: boolean; weight?: number;
}
interface InvoiceDetail {
  id: string; invoiceNum: string; status: string; paymentTerms: string;
  issueDate: string; dueDate: string; sentAt: string | null; paidAt: string | null;
  billingPeriodStart: string | null; billingPeriodEnd: string | null;
  subtotal: number; tax: number; total: number; notes: string | null;
  discount?: number | null; discountType?: string | null;
  client?: { firstName: string; lastName: string; email?: string; phone: string; address?: string; city?: string; state: string; } | null;
  facility?: { name: string; address?: string; email?: string; phone?: string; contact?: string; } | null;
  items: TripItem[];
}

interface Rates { AMBULATORY_RATE: number; WHEELCHAIR_RATE: number; STRETCHER_RATE: number; MILEAGE_RATE: number; INCLUDED_MILES: number; }
const DEFAULT_RATES: Rates = { AMBULATORY_RATE: 35, WHEELCHAIR_RATE: 45, STRETCHER_RATE: 145, MILEAGE_RATE: 3.65, INCLUDED_MILES: 10 };

function pricingBreakdown(items: TripItem[], rates: Rates) {
  const rateMap: Record<string, number> = { AMBULATORY: rates.AMBULATORY_RATE, WHEELCHAIR: rates.WHEELCHAIR_RATE, STRETCHER: rates.STRETCHER_RATE };
  const types = ["AMBULATORY", "WHEELCHAIR", "STRETCHER"];
  return types.map((type) => {
    const typeItems = items.filter((i) => i.serviceType === type);
    const oneWay = typeItems.filter((i) => i.tripType === "ONE_WAY");
    const roundTrip = typeItems.filter((i) => i.tripType === "ROUND_TRIP");
    const oneWayMiles = oneWay.reduce((s, i) => s + (Number(i.miles) || 0), 0);
    const roundTripMiles = roundTrip.reduce((s, i) => s + (Number(i.miles) || 0), 0);
    const totalTrips = typeItems.length;
    const includedMileCredit = totalTrips * rates.INCLUDED_MILES;
    const totalMiles = oneWayMiles + roundTripMiles;
    const billableMiles = Math.max(0, totalMiles - includedMileCredit);
    const baseRate = rateMap[type] ?? 0;
    const baseFees = typeItems.reduce((s, i) => s + (i.tripType === "ROUND_TRIP" ? baseRate * 2 : baseRate), 0);
    const mileageCharges = billableMiles * rates.MILEAGE_RATE;
    const discountValue = includedMileCredit * rates.MILEAGE_RATE;
    const lineTotal = baseFees + mileageCharges;
    return { type, baseRate, oneWayCount: oneWay.length, oneWayMiles, roundTripCount: roundTrip.length, roundTripMiles, billableMiles, baseFees, mileageCharges, includedMileCredit, discountValue, lineTotal };
  }).filter((r) => r.oneWayCount > 0 || r.roundTripCount > 0);
}

export default function InvoiceDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [invoice, setInvoice] = useState<InvoiceDetail | null>(null);
  const [rates, setRates] = useState<Rates>(DEFAULT_RATES);
  const [sending, setSending] = useState(false);
  const [marking, setMarking] = useState(false);

  useEffect(() => {
    const n = (v: string, d: number) => { const x = Number(v); return isNaN(x) ? d : x; };
    Promise.all([
      fetch(`/api/invoices/${id}`).then((r) => r.json()),
      fetch("/api/settings").then((r) => r.json()),
    ]).then(([inv, s]) => {
      setInvoice(inv);
      setRates({
        AMBULATORY_RATE: n(s.AMBULATORY_RATE, 35),
        WHEELCHAIR_RATE: n(s.WHEELCHAIR_RATE, 45),
        STRETCHER_RATE:  n(s.STRETCHER_RATE, 145),
        MILEAGE_RATE:    n(s.MILEAGE_RATE, 3.65),
        INCLUDED_MILES:  n(s.INCLUDED_MILES, 10),
      });
    });
  }, [id]);

  async function sendInvoice() {
    setSending(true);
    const res = await fetch(`/api/invoices/${id}/send`, { method: "POST" });
    setSending(false);
    if (res.ok) {
      toast.success("Invoice sent");
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

  if (!invoice) return <div className="text-slate-400 text-sm p-8">Loading…</div>;

  const breakdown = pricingBreakdown(invoice.items, rates);
  const isFacility = !!invoice.facility;
  const billTo = isFacility ? invoice.facility : invoice.client;

  const totalOneWayTrips = invoice.items.filter((i) => i.tripType === "ONE_WAY").length;
  const totalRoundTrips = invoice.items.filter((i) => i.tripType === "ROUND_TRIP").length;
  const totalBaseFees = breakdown.reduce((s, r) => s + r.baseFees, 0);
  const totalBillableMiles = breakdown.reduce((s, r) => s + r.billableMiles, 0);
  const totalMileageCharges = breakdown.reduce((s, r) => s + r.mileageCharges, 0);
  const totalDiscountedMiles = breakdown.reduce((s, r) => s + r.includedMileCredit, 0);
  const totalDiscountValue = breakdown.reduce((s, r) => s + r.discountValue, 0);

  const statusColor: Record<string, string> = {
    DRAFT: "bg-slate-100 text-slate-600", SENT: "bg-blue-100 text-blue-700",
    PAID: "bg-emerald-100 text-emerald-700", OVERDUE: "bg-rose-100 text-rose-700",
  };

  return (
    <>
      <style>{`
        @media print {
          @page { margin: 10mm; size: A4; }
          body * { visibility: hidden; }
          #invoice-printable, #invoice-printable * { visibility: visible; }
          #invoice-printable { position: fixed; inset: 0; width: 100%; border: none !important; border-radius: 0 !important; box-shadow: none !important; }
          #invoice-actions { display: none !important; }
        }
      `}</style>

      <div className="max-w-4xl mx-auto space-y-4">
        {/* Actions */}
        <div id="invoice-actions" className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <button onClick={() => router.back()} className="text-slate-500 hover:text-slate-800 text-sm">← Back</button>
            <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${statusColor[invoice.status] ?? "bg-slate-100 text-slate-600"}`}>{invoice.status}</span>
          </div>
          <div className="flex gap-2">
            <button onClick={() => window.print()} className="flex items-center gap-1.5 border border-slate-200 hover:border-slate-300 bg-white text-slate-700 text-xs font-semibold px-4 py-2 rounded-lg transition">
              <svg viewBox="0 0 24 24" fill="currentColor" width="14" height="14"><path d="M19 9h-4V3H9v6H5l7 7 7-7zm-8 2V5h2v6h1.17L12 13.17 9.83 11H11zm-6 7h14v2H5v-2z"/></svg>
              Download PDF
            </button>
            {invoice.status !== "PAID" && (
              <button onClick={() => router.push(`/invoices/${invoice.id}/edit`)}
                className="flex items-center gap-1.5 border border-slate-200 hover:border-slate-300 bg-white text-slate-700 text-xs font-semibold px-4 py-2 rounded-lg transition">
                <svg viewBox="0 0 24 24" fill="currentColor" width="14" height="14"><path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04a1 1 0 000-1.41l-2.34-2.34a1 1 0 00-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/></svg>
                Edit
              </button>
            )}
            {invoice.status !== "PAID" && (
              <button onClick={markPaid} disabled={marking} className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold px-4 py-2 rounded-lg transition disabled:opacity-60">
                {marking ? "Saving…" : "Mark as Paid"}
              </button>
            )}
            {invoice.status !== "PAID" && (
              <button onClick={sendInvoice} disabled={sending} className="bg-[#0D2B4E] hover:bg-[#0a2240] text-white text-xs font-semibold px-4 py-2 rounded-lg transition disabled:opacity-60">
                {sending ? "Sending…" : invoice.sentAt ? "Resend" : "Send Invoice"}
              </button>
            )}
          </div>
        </div>

        {/* Invoice document */}
        <div id="invoice-printable" className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden text-sm">

          {/* Top accent */}
          <div style={{ height: 5, background: "linear-gradient(90deg, #0D2B4E 0%, #F9A825 100%)" }} />

          {/* Header */}
          <div style={{ padding: "28px 40px 20px", borderBottom: "1px solid #f1f5f9" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <div>
                <img src="/logo.png" alt="Harbor Grove Care & Mobility" style={{ height: 54, width: "auto" }} />
                <div style={{ marginTop: 6, fontSize: 12, color: "#94a3b8" }}>HarborGrove Care &amp; Mobility, LLC</div>
                <div style={{ fontSize: 12, color: "#94a3b8" }}>6023 S Manzanita Way, Boise ID 83709</div>
                <div style={{ fontSize: 12, color: "#94a3b8" }}>harborgrovecare@gmail.com · 208-206-0694</div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: 11, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.1em" }}>Monthly NEMT Invoice</div>
                <div style={{ fontSize: 26, fontWeight: 800, color: "#0D2B4E", letterSpacing: "-0.5px" }}>{invoice.invoiceNum}</div>
                <div style={{ marginTop: 4 }}>
                  {invoice.status === "PAID" ? <span style={{ background: "#d1fae5", color: "#065f46", fontSize: 10, fontWeight: 700, padding: "2px 10px", borderRadius: 20, textTransform: "uppercase" }}>Paid</span>
                    : invoice.status === "OVERDUE" ? <span style={{ background: "#fee2e2", color: "#991b1b", fontSize: 10, fontWeight: 700, padding: "2px 10px", borderRadius: 20, textTransform: "uppercase" }}>Overdue</span>
                    : invoice.status === "SENT" ? <span style={{ background: "#dbeafe", color: "#1e40af", fontSize: 10, fontWeight: 700, padding: "2px 10px", borderRadius: 20, textTransform: "uppercase" }}>Sent</span>
                    : <span style={{ background: "#f1f5f9", color: "#475569", fontSize: 10, fontWeight: 700, padding: "2px 10px", borderRadius: 20, textTransform: "uppercase" }}>Draft</span>}
                </div>
              </div>
            </div>
          </div>

          {/* Bill To + Invoice Meta */}
          <div style={{ padding: "16px 40px", borderBottom: "1px solid #f1f5f9", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
            <div>
              <div style={{ fontSize: 10, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 6 }}>Bill To</div>
              {isFacility ? (
                <>
                  <div style={{ fontSize: 15, fontWeight: 700, color: "#0D2B4E" }}>{(billTo as typeof invoice.facility)?.name}</div>
                  {(billTo as typeof invoice.facility)?.address && <div style={{ fontSize: 12, color: "#64748b" }}>Facility Address: {(billTo as typeof invoice.facility)?.address}</div>}
                  {(billTo as typeof invoice.facility)?.email && <div style={{ fontSize: 12, color: "#64748b" }}>Facility Email: {(billTo as typeof invoice.facility)?.email}</div>}
                  {(billTo as typeof invoice.facility)?.phone && <div style={{ fontSize: 12, color: "#64748b" }}>Facility Phone: {(billTo as typeof invoice.facility)?.phone}</div>}
                </>
              ) : (
                <>
                  <div style={{ fontSize: 15, fontWeight: 700, color: "#0D2B4E" }}>{(billTo as typeof invoice.client)?.firstName} {(billTo as typeof invoice.client)?.lastName}</div>
                  {invoice.client?.email && <div style={{ fontSize: 12, color: "#64748b" }}>{invoice.client.email}</div>}
                  <div style={{ fontSize: 12, color: "#64748b" }}>{invoice.client?.phone}</div>
                </>
              )}
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 6 }}>Invoice Details</div>
              <table style={{ fontSize: 12, color: "#64748b", marginLeft: "auto" }}>
                <tbody>
                  <tr><td style={{ paddingRight: 16, fontWeight: 600, color: "#334155" }}>Invoice #</td><td>{invoice.invoiceNum}</td></tr>
                  <tr><td style={{ paddingRight: 16, fontWeight: 600, color: "#334155" }}>Payment Terms</td><td>{invoice.paymentTerms}</td></tr>
                  {invoice.billingPeriodStart && <tr><td style={{ paddingRight: 16, fontWeight: 600, color: "#334155" }}>Billing Period</td><td>{new Date(invoice.billingPeriodStart).toLocaleDateString()} – {invoice.billingPeriodEnd ? new Date(invoice.billingPeriodEnd).toLocaleDateString() : ""}</td></tr>}
                  <tr><td style={{ paddingRight: 16, fontWeight: 600, color: "#334155" }}>Invoice Date</td><td>{new Date(invoice.issueDate).toLocaleDateString()}</td></tr>
                  <tr><td style={{ paddingRight: 16, fontWeight: 600, color: "#334155" }}>Due Date</td><td>{new Date(invoice.dueDate).toLocaleDateString()}</td></tr>
                  {invoice.paidAt && <tr><td style={{ paddingRight: 16, fontWeight: 600, color: "#059669" }}>Paid</td><td style={{ color: "#059669" }}>{new Date(invoice.paidAt).toLocaleDateString()}</td></tr>}
                </tbody>
              </table>
            </div>
          </div>

          {/* Monthly summary stats */}
          <div style={{ padding: "14px 40px", background: "#f8fafc", borderBottom: "1px solid #f1f5f9" }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 10 }}>Pricing Summary &amp; Monthly Trip Totals</div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(8, 1fr)", gap: 8 }}>
              {[
                { label: "Monthly Total Due", value: `$${Number(invoice.total).toFixed(2)}`, highlight: true },
                { label: "Total Base Fees", value: `$${totalBaseFees.toFixed(2)}` },
                { label: "Total Billable Miles", value: totalBillableMiles.toFixed(1) },
                { label: "Total Mileage Charges", value: `$${totalMileageCharges.toFixed(2)}` },
                { label: "Total Discounted Miles", value: totalDiscountedMiles.toFixed(0) },
                { label: "Total Discount Value", value: `$${totalDiscountValue.toFixed(2)}` },
                { label: "Total One-Way Trips", value: totalOneWayTrips },
                { label: "Total Round Trips", value: totalRoundTrips },
              ].map((s) => (
                <div key={s.label} style={{ background: s.highlight ? "#0D2B4E" : "#fff", borderRadius: 8, padding: "8px 10px", border: "1px solid #e2e8f0" }}>
                  <div style={{ fontSize: 16, fontWeight: 800, color: s.highlight ? "#F9A825" : "#0D2B4E" }}>{s.value}</div>
                  <div style={{ fontSize: 9, color: s.highlight ? "rgba(255,255,255,0.7)" : "#94a3b8", marginTop: 2, lineHeight: 1.3 }}>{s.label}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Pricing breakdown by service type */}
          {breakdown.length > 0 && (
            <div style={{ padding: "16px 40px", borderBottom: "1px solid #f1f5f9" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11 }}>
                <thead>
                  <tr style={{ borderBottom: "2px solid #0D2B4E" }}>
                    {["Service Type", "Base Rate", "Mileage Rate", "One-Way Trips", "OW Miles", "Round Trips", "RT Miles", "Base Fees", "Billable Miles", "Mileage Charges", "Included Miles", "Discount", "Line Total"].map((h) => (
                      <th key={h} style={{ padding: "6px 8px", textAlign: "right", fontSize: 9, fontWeight: 700, color: "#0D2B4E", textTransform: "uppercase", letterSpacing: "0.06em", whiteSpace: "nowrap" }}
                        className={h === "Service Type" ? "text-left" : ""}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {breakdown.map((r) => (
                    <tr key={r.type} style={{ borderBottom: "1px solid #f1f5f9" }}>
                      <td style={{ padding: "8px", fontWeight: 600, color: "#334155" }}>{r.type.charAt(0) + r.type.slice(1).toLowerCase()}</td>
                      <td style={{ padding: "8px", textAlign: "right", color: "#64748b" }}>${r.baseRate.toFixed(2)}</td>
                      <td style={{ padding: "8px", textAlign: "right", color: "#64748b" }}>${rates.MILEAGE_RATE}</td>
                      <td style={{ padding: "8px", textAlign: "right", color: "#64748b" }}>{r.oneWayCount}</td>
                      <td style={{ padding: "8px", textAlign: "right", color: "#64748b" }}>{r.oneWayMiles.toFixed(1)}</td>
                      <td style={{ padding: "8px", textAlign: "right", color: "#64748b" }}>{r.roundTripCount}</td>
                      <td style={{ padding: "8px", textAlign: "right", color: "#64748b" }}>{r.roundTripMiles.toFixed(1)}</td>
                      <td style={{ padding: "8px", textAlign: "right", color: "#334155", fontWeight: 600 }}>${r.baseFees.toFixed(2)}</td>
                      <td style={{ padding: "8px", textAlign: "right", color: "#64748b" }}>{r.billableMiles.toFixed(1)}</td>
                      <td style={{ padding: "8px", textAlign: "right", color: "#64748b" }}>${r.mileageCharges.toFixed(2)}</td>
                      <td style={{ padding: "8px", textAlign: "right", color: "#64748b" }}>{r.includedMileCredit}</td>
                      <td style={{ padding: "8px", textAlign: "right", color: "#64748b" }}>${r.discountValue.toFixed(2)}</td>
                      <td style={{ padding: "8px", textAlign: "right", fontWeight: 700, color: "#0D2B4E" }}>${r.lineTotal.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Trip detail log */}
          {invoice.items.length > 0 && (
            <div style={{ padding: "16px 40px", borderBottom: "1px solid #f1f5f9" }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 10 }}>Trip Detail Log</div>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11 }}>
                <thead>
                  <tr style={{ borderBottom: "2px solid #0D2B4E" }}>
                    {["Date", "Patient Name", "DOB", "Service Type", "Trip Type", "Miles", "Own W/C", "O2", "Weight", "Total"].map((h) => (
                      <th key={h} style={{ padding: "6px 8px", textAlign: h === "Date" || h === "Patient Name" ? "left" : "center", fontSize: 9, fontWeight: 700, color: "#0D2B4E", textTransform: "uppercase", letterSpacing: "0.06em", whiteSpace: "nowrap" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {invoice.items.map((item, idx) => (
                    <tr key={item.id} style={{ borderBottom: "1px solid #f1f5f9", background: idx % 2 === 0 ? "#fff" : "#fafbfc" }}>
                      <td style={{ padding: "7px 8px", color: "#334155" }}>{item.serviceDate ? new Date(item.serviceDate).toLocaleDateString() : "—"}</td>
                      <td style={{ padding: "7px 8px", fontWeight: 600, color: "#334155" }}>{item.patientName || "—"}</td>
                      <td style={{ padding: "7px 8px", color: "#64748b", textAlign: "center" }}>{item.patientDob || "—"}</td>
                      <td style={{ padding: "7px 8px", color: "#334155", textAlign: "center" }}>{item.serviceType ? item.serviceType.charAt(0) + item.serviceType.slice(1).toLowerCase() : "—"}</td>
                      <td style={{ padding: "7px 8px", color: "#64748b", textAlign: "center" }}>{item.tripType === "ROUND_TRIP" ? "Round Trip" : item.tripType === "ONE_WAY" ? "One Way" : "—"}</td>
                      <td style={{ padding: "7px 8px", color: "#64748b", textAlign: "center" }}>{item.miles != null ? Number(item.miles).toFixed(1) : "—"}</td>
                      <td style={{ padding: "7px 8px", textAlign: "center", color: item.ownWheelchair ? "#059669" : "#94a3b8" }}>{item.ownWheelchair ? "Yes" : "No"}</td>
                      <td style={{ padding: "7px 8px", textAlign: "center", color: item.needsO2 ? "#059669" : "#94a3b8" }}>{item.needsO2 ? "Yes" : "No"}</td>
                      <td style={{ padding: "7px 8px", textAlign: "center", color: "#64748b" }}>{item.weight ? `${item.weight} lbs` : "—"}</td>
                      <td style={{ padding: "7px 8px", textAlign: "right", fontWeight: 600, color: "#0D2B4E" }}>${Number(item.total).toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Total due */}
          <div style={{ padding: "16px 40px", borderBottom: "1px solid #f1f5f9", display: "flex", justifyContent: "flex-end" }}>
            <div style={{ width: 300 }}>
              <div style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderTop: "1px solid #e2e8f0" }}>
                <span style={{ fontSize: 13, color: "#64748b" }}>Subtotal</span>
                <span style={{ fontSize: 13, color: "#64748b" }}>${Number(invoice.subtotal).toFixed(2)}</span>
              </div>
              {invoice.discount && Number(invoice.discount) > 0 && (
                <div style={{ display: "flex", justifyContent: "space-between", padding: "6px 0" }}>
                  <span style={{ fontSize: 13, color: "#059669" }}>
                    Discount {invoice.discountType === "PERCENT" ? `(${Number(invoice.discount)}%)` : ""}
                  </span>
                  <span style={{ fontSize: 13, color: "#059669", fontWeight: 600 }}>
                    − ${invoice.discountType === "PERCENT"
                      ? (Number(invoice.subtotal) * Number(invoice.discount) / 100).toFixed(2)
                      : Number(invoice.discount).toFixed(2)}
                  </span>
                </div>
              )}
              <div style={{ display: "flex", justifyContent: "space-between", padding: "10px 0", borderTop: "2px solid #0D2B4E", marginTop: 4 }}>
                <span style={{ fontSize: 15, fontWeight: 700, color: "#0D2B4E" }}>Total Due</span>
                <span style={{ fontSize: 22, fontWeight: 800, color: "#0D2B4E" }}>${Number(invoice.total).toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* Mileage note + notes */}
          <div style={{ padding: "12px 40px", borderBottom: "1px solid #f1f5f9", background: "#fafbfc" }}>
            <div style={{ fontSize: 10, color: "#94a3b8", lineHeight: 1.6 }}>
              <strong style={{ color: "#64748b" }}>How mileage is calculated:</strong> One-way trips: first {rates.INCLUDED_MILES} miles included per trip. Round trips: first {rates.INCLUDED_MILES} miles included only once when going to the facility; return mileage receives no additional {rates.INCLUDED_MILES}-mile discount. Mileage rate: ${rates.MILEAGE_RATE}/mi.
            </div>
          </div>

          {invoice.notes && (
            <div style={{ padding: "12px 40px", borderBottom: "1px solid #f1f5f9" }}>
              <div style={{ borderLeft: "3px solid #F9A825", paddingLeft: 12, fontSize: 12, color: "#64748b" }}>
                <strong style={{ color: "#334155" }}>Notes: </strong>{invoice.notes}
              </div>
            </div>
          )}

          {/* Payment info footer */}
          <div style={{ padding: "14px 40px", borderBottom: "1px solid #f1f5f9" }}>
            <div style={{ fontSize: 11, color: "#64748b", lineHeight: 1.8 }}>
              <strong style={{ color: "#334155" }}>Payment Information</strong><br />
              Please make payment payable to <strong>HarborGrove Care &amp; Mobility LLC</strong>. All pricing is one-way. Rates may vary based on exact trip details and service requirements.
              Thank you for choosing HarborGrove Care &amp; Mobility LLC.
            </div>
            <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 6 }}>
              Proudly Serving Boise &amp; Surrounding Areas · Call: 208-206-0694 · harborgrovecare@gmail.com
            </div>
          </div>

          {/* Bottom accent */}
          <div style={{ height: 4, background: "linear-gradient(90deg, #F9A825 0%, #0D2B4E 100%)" }} />
        </div>
      </div>
    </>
  );
}
