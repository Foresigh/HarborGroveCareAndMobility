"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { toast } from "sonner";

interface Client { id: string; firstName: string; lastName: string; }
interface Facility { id: string; name: string; address?: string; email?: string; phone?: string; contact?: string; }
interface Rates { AMBULATORY_RATE: number; WHEELCHAIR_RATE: number; STRETCHER_RATE: number; MILEAGE_RATE: number; INCLUDED_MILES: number; }

interface TripRow {
  serviceDate: string; patientName: string; patientDob: string;
  serviceType: string; tripType: string; miles: string;
  ownWheelchair: boolean; needsO2: boolean; weight: string;
}

function blankTrip(): TripRow {
  return { serviceDate: "", patientName: "", patientDob: "", serviceType: "WHEELCHAIR", tripType: "ONE_WAY", miles: "", ownWheelchair: false, needsO2: false, weight: "" };
}

function calcTripTotal(trip: TripRow, rates: Rates): number {
  const rateMap: Record<string, number> = {
    AMBULATORY: rates.AMBULATORY_RATE,
    WHEELCHAIR: rates.WHEELCHAIR_RATE,
    STRETCHER: rates.STRETCHER_RATE,
  };
  const base = rateMap[trip.serviceType] ?? 0;
  const totalMiles = Number(trip.miles) || 0;
  const qty = trip.tripType === "ROUND_TRIP" ? 2 : 1;
  const billableMiles = Math.max(0, totalMiles - rates.INCLUDED_MILES);
  return base * qty + billableMiles * rates.MILEAGE_RATE;
}

function applyDiscount(subtotal: number, discount: string, discountType: "FLAT" | "PERCENT"): number {
  const val = Number(discount) || 0;
  if (discountType === "PERCENT") return Math.max(0, subtotal - subtotal * (val / 100));
  return Math.max(0, subtotal - val);
}

export default function EditInvoicePage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [billTo, setBillTo] = useState<"facility" | "client">("facility");
  const [clients, setClients] = useState<Client[]>([]);
  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [clientId, setClientId] = useState("");
  const [facilityId, setFacilityId] = useState("");
  const [billingPeriodStart, setBillingPeriodStart] = useState("");
  const [billingPeriodEnd, setBillingPeriodEnd] = useState("");
  const [paymentTerms, setPaymentTerms] = useState("Net 10");
  const [dueDate, setDueDate] = useState("");
  const [trips, setTrips] = useState<TripRow[]>([blankTrip()]);
  const [notes, setNotes] = useState("");
  const [discount, setDiscount] = useState("");
  const [discountType, setDiscountType] = useState<"FLAT" | "PERCENT">("FLAT");
  const [rates, setRates] = useState<Rates>({ AMBULATORY_RATE: 35, WHEELCHAIR_RATE: 45, STRETCHER_RATE: 145, MILEAGE_RATE: 3.65, INCLUDED_MILES: 10 });
  const [invoiceNum, setInvoiceNum] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    Promise.all([
      fetch(`/api/invoices/${id}`).then((r) => r.json()),
      fetch("/api/clients").then((r) => r.json()),
      fetch("/api/facilities").then((r) => r.json()),
      fetch("/api/settings").then((r) => r.json()),
    ]).then(([inv, c, f, s]) => {
      setClients(c);
      setFacilities(f);
      setRates({
        AMBULATORY_RATE: Number(s.AMBULATORY_RATE) || 35,
        WHEELCHAIR_RATE: Number(s.WHEELCHAIR_RATE) || 45,
        STRETCHER_RATE: Number(s.STRETCHER_RATE) || 145,
        MILEAGE_RATE: Number(s.MILEAGE_RATE) || 3.65,
        INCLUDED_MILES: Number(s.INCLUDED_MILES) || 10,
      });

      setInvoiceNum(inv.invoiceNum);
      if (inv.facilityId) { setBillTo("facility"); setFacilityId(inv.facilityId); }
      else { setBillTo("client"); setClientId(inv.clientId ?? ""); }
      setBillingPeriodStart(inv.billingPeriodStart ? new Date(inv.billingPeriodStart).toISOString().split("T")[0] : "");
      setBillingPeriodEnd(inv.billingPeriodEnd ? new Date(inv.billingPeriodEnd).toISOString().split("T")[0] : "");
      setPaymentTerms(inv.paymentTerms ?? "Net 10");
      setDueDate(new Date(inv.dueDate).toISOString().split("T")[0]);
      setNotes(inv.notes ?? "");
      if (inv.discount) { setDiscount(String(Number(inv.discount))); setDiscountType((inv.discountType as "FLAT" | "PERCENT") ?? "FLAT"); }

      if (inv.items?.length) {
        setTrips(inv.items.map((item: {
          serviceDate?: string; patientName?: string; patientDob?: string;
          serviceType?: string; tripType?: string; miles?: number;
          ownWheelchair?: boolean; needsO2?: boolean; weight?: number;
        }) => ({
          serviceDate: item.serviceDate ? new Date(item.serviceDate).toISOString().split("T")[0] : "",
          patientName: item.patientName ?? "",
          patientDob: item.patientDob ?? "",
          serviceType: item.serviceType ?? "WHEELCHAIR",
          tripType: item.tripType ?? "ONE_WAY",
          miles: item.miles != null ? String(item.miles) : "",
          ownWheelchair: item.ownWheelchair ?? false,
          needsO2: item.needsO2 ?? false,
          weight: item.weight != null ? String(item.weight) : "",
        })));
      }
      setLoading(false);
    });
  }, [id]);

  function updateTrip(i: number, field: keyof TripRow, value: string | boolean) {
    setTrips((prev) => prev.map((t, idx) => idx === i ? { ...t, [field]: value } : t));
  }

  const subtotal = trips.reduce((sum, t) => sum + calcTripTotal(t, rates), 0);
  const grandTotal = discount ? applyDiscount(subtotal, discount, discountType) : subtotal;
  const discountAmount = subtotal - grandTotal;

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (trips.length === 0) { toast.error("Add at least one trip"); return; }
    setSaving(true);

    const rateMap: Record<string, number> = {
      AMBULATORY: rates.AMBULATORY_RATE,
      WHEELCHAIR: rates.WHEELCHAIR_RATE,
      STRETCHER: rates.STRETCHER_RATE,
    };
    const items = trips.map((t) => {
      const total = calcTripTotal(t, rates);
      const qty = t.tripType === "ROUND_TRIP" ? 2 : 1;
      return {
        description: `${t.serviceType} — ${t.tripType === "ROUND_TRIP" ? "Round Trip" : "One Way"} — ${t.patientName || "Patient"}`,
        quantity: qty,
        unitPrice: rateMap[t.serviceType] ?? 0,
        total,
        serviceType: t.serviceType,
        tripType: t.tripType,
        patientName: t.patientName,
        patientDob: t.patientDob,
        serviceDate: t.serviceDate || null,
        miles: t.miles ? Number(t.miles) : null,
        ownWheelchair: t.ownWheelchair,
        needsO2: t.needsO2,
        weight: t.weight ? Number(t.weight) : null,
      };
    });

    const res = await fetch(`/api/invoices/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        clientId: billTo === "client" ? clientId : null,
        facilityId: billTo === "facility" ? facilityId : null,
        billingPeriodStart: billingPeriodStart || null,
        billingPeriodEnd: billingPeriodEnd || null,
        paymentTerms,
        dueDate,
        notes,
        items,
        discount: discount ? Number(discount) : null,
        discountType: discount ? discountType : null,
      }),
    });
    setSaving(false);
    if (res.ok) {
      toast.success("Invoice updated");
      router.push(`/invoices/${id}`);
    } else {
      toast.error("Failed to save changes");
    }
  }

  const inputCls = "w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#F9A825]";
  const labelCls = "block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1";

  if (loading) return <div className="text-slate-400 text-sm p-8">Loading…</div>;

  return (
    <div className="max-w-5xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => router.back()} className="text-slate-500 hover:text-slate-800 text-sm">← Back</button>
        <h1 className="text-xl font-bold text-slate-800">Edit Invoice</h1>
        <span className="text-sm text-slate-400 font-mono">{invoiceNum}</span>
      </div>

      <form onSubmit={handleSave} className="space-y-5">
        {/* Bill To */}
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <div className="flex gap-3 mb-5">
            {(["facility", "client"] as const).map((t) => (
              <button key={t} type="button" onClick={() => setBillTo(t)}
                className={`px-4 py-2 rounded-lg text-sm font-semibold border transition ${billTo === t ? "bg-[#0D2B4E] text-white border-[#0D2B4E]" : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"}`}>
                {t === "facility" ? "Bill to Facility" : "Bill to Client"}
              </button>
            ))}
          </div>
          {billTo === "facility" ? (
            <div>
              <label className={labelCls}>Facility</label>
              <select value={facilityId} onChange={(e) => setFacilityId(e.target.value)} className={inputCls}>
                <option value="">Select facility…</option>
                {facilities.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
              </select>
            </div>
          ) : (
            <div>
              <label className={labelCls}>Client</label>
              <select value={clientId} onChange={(e) => setClientId(e.target.value)} className={inputCls}>
                <option value="">Select client…</option>
                {clients.map((c) => <option key={c.id} value={c.id}>{c.firstName} {c.lastName}</option>)}
              </select>
            </div>
          )}
        </div>

        {/* Invoice details */}
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <h2 className="text-sm font-semibold text-slate-700 mb-4">Invoice Details</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <label className={labelCls}>Billing Period Start</label>
              <input type="date" value={billingPeriodStart} onChange={(e) => setBillingPeriodStart(e.target.value)} className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Billing Period End</label>
              <input type="date" value={billingPeriodEnd} onChange={(e) => setBillingPeriodEnd(e.target.value)} className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Payment Terms</label>
              <select value={paymentTerms} onChange={(e) => setPaymentTerms(e.target.value)} className={inputCls}>
                <option>Net 10</option><option>Net 15</option><option>Net 30</option><option>Due on Receipt</option>
              </select>
            </div>
            <div>
              <label className={labelCls}>Due Date</label>
              <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className={inputCls} />
            </div>
          </div>
        </div>

        {/* Trip log */}
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-slate-700">Trip Detail Log</h2>
            <div className="text-xs text-slate-400">
              Amb ${rates.AMBULATORY_RATE} · W/C ${rates.WHEELCHAIR_RATE} · Str ${rates.STRETCHER_RATE} · +${rates.MILEAGE_RATE}/mi after {rates.INCLUDED_MILES}mi
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-slate-200">
                  {["Date", "Patient Name", "DOB", "Service Type", "Trip Type", "Miles", "Own W/C", "O2", "Weight", "Total", ""].map((h) => (
                    <th key={h} className="text-left px-2 py-2 text-xs font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {trips.map((trip, i) => (
                  <tr key={i}>
                    <td className="px-2 py-2"><input type="date" value={trip.serviceDate} onChange={(e) => updateTrip(i, "serviceDate", e.target.value)} className="border border-slate-200 rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-[#F9A825] w-32" /></td>
                    <td className="px-2 py-2"><input value={trip.patientName} onChange={(e) => updateTrip(i, "patientName", e.target.value)} placeholder="Full name" className="border border-slate-200 rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-[#F9A825] w-36" /></td>
                    <td className="px-2 py-2"><input value={trip.patientDob} onChange={(e) => updateTrip(i, "patientDob", e.target.value)} placeholder="MM/DD/YYYY" className="border border-slate-200 rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-[#F9A825] w-28" /></td>
                    <td className="px-2 py-2">
                      <select value={trip.serviceType} onChange={(e) => updateTrip(i, "serviceType", e.target.value)} className="border border-slate-200 rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-[#F9A825]">
                        <option value="AMBULATORY">Ambulatory</option>
                        <option value="WHEELCHAIR">Wheelchair</option>
                        <option value="STRETCHER">Stretcher</option>
                      </select>
                    </td>
                    <td className="px-2 py-2">
                      <select value={trip.tripType} onChange={(e) => updateTrip(i, "tripType", e.target.value)} className="border border-slate-200 rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-[#F9A825]">
                        <option value="ONE_WAY">One Way</option>
                        <option value="ROUND_TRIP">Round Trip</option>
                      </select>
                    </td>
                    <td className="px-2 py-2"><input type="number" min="0" step="0.1" value={trip.miles} onChange={(e) => updateTrip(i, "miles", e.target.value)} placeholder="0" className="border border-slate-200 rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-[#F9A825] w-20" /></td>
                    <td className="px-2 py-2 text-center"><input type="checkbox" checked={trip.ownWheelchair} onChange={(e) => updateTrip(i, "ownWheelchair", e.target.checked)} className="rounded" /></td>
                    <td className="px-2 py-2 text-center"><input type="checkbox" checked={trip.needsO2} onChange={(e) => updateTrip(i, "needsO2", e.target.checked)} className="rounded" /></td>
                    <td className="px-2 py-2"><input type="number" value={trip.weight} onChange={(e) => updateTrip(i, "weight", e.target.value)} placeholder="lbs" className="border border-slate-200 rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-[#F9A825] w-16" /></td>
                    <td className="px-2 py-2 font-semibold text-slate-800 whitespace-nowrap">${calcTripTotal(trip, rates).toFixed(2)}</td>
                    <td className="px-2 py-2"><button type="button" onClick={() => setTrips((p) => p.filter((_, idx) => idx !== i))} className="text-rose-400 hover:text-rose-600 text-base leading-none">×</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex items-end justify-between mt-4 pt-4 border-t border-slate-100">
            <button type="button" onClick={() => setTrips((p) => [...p, blankTrip()])}
              className="text-sm text-[#0D2B4E] font-semibold hover:underline self-end">+ Add Trip</button>

            <div className="text-right space-y-2">
              <div className="text-xs text-slate-500">{trips.length} trip{trips.length !== 1 ? "s" : ""} · Subtotal: <span className="font-semibold text-slate-700">${subtotal.toFixed(2)}</span></div>
              <div className="flex items-center gap-2 justify-end">
                <span className="text-xs text-slate-500">Discount:</span>
                <div className="flex rounded-lg border border-slate-200 overflow-hidden text-xs">
                  <button type="button" onClick={() => setDiscountType("FLAT")}
                    className={`px-2.5 py-1.5 font-semibold transition ${discountType === "FLAT" ? "bg-[#0D2B4E] text-white" : "bg-white text-slate-600 hover:bg-slate-50"}`}>$</button>
                  <button type="button" onClick={() => setDiscountType("PERCENT")}
                    className={`px-2.5 py-1.5 font-semibold transition ${discountType === "PERCENT" ? "bg-[#0D2B4E] text-white" : "bg-white text-slate-600 hover:bg-slate-50"}`}>%</button>
                </div>
                <input
                  type="number" min="0" step="0.01"
                  value={discount}
                  onChange={(e) => setDiscount(e.target.value)}
                  placeholder="0"
                  className="border border-slate-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-[#F9A825] w-24 text-right"
                />
              </div>
              {discountAmount > 0 && (
                <div className="text-xs text-emerald-600 font-medium">− ${discountAmount.toFixed(2)} discount applied</div>
              )}
              <div className="text-lg font-bold text-[#0D2B4E]">Total: ${grandTotal.toFixed(2)}</div>
            </div>
          </div>
        </div>

        {/* Notes */}
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <label className={labelCls}>Notes (optional)</label>
          <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3}
            placeholder="Payment instructions, special notes…"
            className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#F9A825] resize-none" />
        </div>

        <div className="flex gap-3">
          <button type="submit" disabled={saving}
            className="bg-[#0D2B4E] hover:bg-[#0a2240] text-white font-semibold px-6 py-2.5 rounded-lg text-sm transition disabled:opacity-60">
            {saving ? "Saving…" : "Save Changes"}
          </button>
          <button type="button" onClick={() => router.back()}
            className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold px-6 py-2.5 rounded-lg text-sm transition">
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
