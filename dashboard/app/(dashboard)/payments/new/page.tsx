"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

const NAVY = "#0D2B4E";
const GOLD = "#F9A825";

interface Rates {
  AMBULATORY_RATE: number;
  WHEELCHAIR_RATE: number;
  STRETCHER_RATE: number;
  MILEAGE_RATE: number;
  INCLUDED_MILES: number;
}

interface Client { id: string; firstName: string; lastName: string; }

type ServiceType = "AMBULATORY" | "WHEELCHAIR" | "STRETCHER";
type TripType = "ONE_WAY" | "ROUND_TRIP";
type PayMethod = "Cash" | "Check" | "Card" | "Insurance" | "Other";

const SERVICE_LABELS: Record<ServiceType, string> = {
  AMBULATORY: "Ambulatory",
  WHEELCHAIR: "Wheelchair",
  STRETCHER:  "Stretcher",
};

const PAY_METHODS: PayMethod[] = ["Cash", "Check", "Card", "Insurance", "Other"];

function calcPrice(rates: Rates, service: ServiceType, trip: TripType, miles: number) {
  const base =
    service === "AMBULATORY" ? rates.AMBULATORY_RATE :
    service === "WHEELCHAIR" ? rates.WHEELCHAIR_RATE :
    rates.STRETCHER_RATE;
  const isRound      = trip === "ROUND_TRIP";
  const billable     = Math.max(0, miles - rates.INCLUDED_MILES);
  const mileageCharge = billable * rates.MILEAGE_RATE;
  const baseTotal    = isRound ? base * 2 : base;
  return { base, baseTotal, mileageCharge, billable, total: Math.round((baseTotal + mileageCharge) * 100) / 100 };
}

export default function QuickPaymentPage() {
  const router = useRouter();

  const [rates, setRates]           = useState<Rates>({ AMBULATORY_RATE: 35, WHEELCHAIR_RATE: 45, STRETCHER_RATE: 145, MILEAGE_RATE: 3.65, INCLUDED_MILES: 10 });
  const [clients, setClients]       = useState<Client[]>([]);
  const [clientId, setClientId]     = useState("");
  const [service, setService]       = useState<ServiceType>("AMBULATORY");
  const [trip, setTrip]             = useState<TripType>("ONE_WAY");
  const [miles, setMiles]           = useState("");
  const [serviceDate, setDate]      = useState(new Date().toISOString().slice(0, 10));
  const [payMethod, setPayMethod]   = useState<PayMethod>("Cash");
  const [notes, setNotes]           = useState("");
  const [saving, setSaving]         = useState(false);
  const [done, setDone]             = useState<{ invoiceNum: string; total: number; clientName: string } | null>(null);

  useEffect(() => {
    const n = (v: string, d: number) => { const x = Number(v); return isNaN(x) ? d : x; };
    fetch("/api/settings").then(r => r.json()).then(d => setRates({
      AMBULATORY_RATE: n(d.AMBULATORY_RATE, 35),
      WHEELCHAIR_RATE: n(d.WHEELCHAIR_RATE, 45),
      STRETCHER_RATE:  n(d.STRETCHER_RATE, 145),
      MILEAGE_RATE:    n(d.MILEAGE_RATE, 3.65),
      INCLUDED_MILES:  n(d.INCLUDED_MILES, 10),
    }));
    fetch("/api/clients").then(r => r.json()).then(d => setClients(Array.isArray(d) ? d : []));
  }, []);

  const mi   = Number(miles) || 0;
  const calc = calcPrice(rates, service, trip, mi);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const res = await fetch("/api/payments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ clientId: clientId || null, serviceType: service, tripType: trip, miles: mi, serviceDate, paymentMethod: payMethod, notes }),
    });
    const data = await res.json();
    setSaving(false);
    if (res.ok) {
      const clientName = clientId ? clients.find(c => c.id === clientId) : null;
      setDone({
        invoiceNum: data.invoiceNum,
        total: Number(data.total),
        clientName: clientName ? `${clientName.firstName} ${clientName.lastName}` : "Walk-in",
      });
    }
  }

  // ── Success screen ──────────────────────────────────────────────────────────
  if (done) {
    return (
      <div className="max-w-md mx-auto mt-12">
        <div className="bg-white rounded-2xl border border-slate-200 p-10 text-center shadow-sm">
          <div style={{ width: 56, height: 56, borderRadius: "50%", background: "#d1fae5", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px" }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2.5" width="28" height="28"><path d="M20 6L9 17l-5-5"/></svg>
          </div>
          <h2 className="text-xl font-bold text-slate-800 mb-1">Payment Recorded</h2>
          <p className="text-sm text-slate-500 mb-6">Invoice has been created and marked paid.</p>

          <div className="bg-slate-50 rounded-xl p-5 text-left space-y-2 mb-6">
            <div className="flex justify-between text-sm">
              <span className="text-slate-500">Invoice #</span>
              <span className="font-mono font-semibold text-slate-800">{done.invoiceNum}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-500">Client</span>
              <span className="font-medium text-slate-700">{done.clientName}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-500">Amount Paid</span>
              <span className="font-bold text-green-600 text-base">${done.total.toFixed(2)}</span>
            </div>
          </div>

          <div className="flex gap-3">
            <button onClick={() => setDone(null)}
              className="flex-1 border border-slate-200 text-slate-700 font-medium py-2.5 rounded-lg text-sm hover:bg-slate-50 transition">
              Record Another
            </button>
            <button onClick={() => router.push("/invoices")}
              style={{ background: NAVY }} className="flex-1 text-white font-semibold py-2.5 rounded-lg text-sm hover:opacity-90 transition">
              View Invoices
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Form ────────────────────────────────────────────────────────────────────
  const segBtn = (active: boolean) =>
    `flex-1 py-2 text-sm font-medium rounded-lg transition-all ${active ? "text-white shadow-sm" : "text-slate-600 hover:bg-slate-100"}`;

  return (
    <div className="max-w-xl mx-auto">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-slate-800">Quick Payment</h1>
        <p className="text-sm text-slate-500 mt-1">Enter trip details — price is calculated from your pricing settings.</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">

        {/* Client + Date */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Client <span className="font-normal normal-case">(optional)</span></label>
            <select value={clientId} onChange={e => setClientId(e.target.value)}
              className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#F9A825]">
              <option value="">Walk-in / No client</option>
              {clients.map(c => (
                <option key={c.id} value={c.id}>{c.firstName} {c.lastName}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Service Date</label>
            <input type="date" value={serviceDate} onChange={e => setDate(e.target.value)} required
              className="border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#F9A825]" />
          </div>
        </div>

        {/* Service type */}
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Service Type</label>
          <div className="grid grid-cols-3 gap-2">
            {(["AMBULATORY", "WHEELCHAIR", "STRETCHER"] as ServiceType[]).map(s => {
              const rateKey = `${s}_RATE` as keyof Rates;
              const active = service === s;
              return (
                <button key={s} type="button" onClick={() => setService(s)}
                  className={`rounded-xl border-2 p-3 text-center transition-all ${active ? "border-[#F9A825] bg-[#FEF9EC]" : "border-slate-200 hover:border-slate-300"}`}>
                  <div className={`text-sm font-semibold ${active ? "text-[#0D2B4E]" : "text-slate-700"}`}>{SERVICE_LABELS[s]}</div>
                  <div className="text-xs text-slate-500 mt-0.5">${rates[rateKey]}/trip</div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Trip type + Miles */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Trip Type</label>
            <div className="flex gap-1 bg-slate-100 p-1 rounded-lg">
              <button type="button" onClick={() => setTrip("ONE_WAY")}
                className={segBtn(trip === "ONE_WAY")}
                style={trip === "ONE_WAY" ? { background: NAVY } : {}}>
                One-Way
              </button>
              <button type="button" onClick={() => setTrip("ROUND_TRIP")}
                className={segBtn(trip === "ROUND_TRIP")}
                style={trip === "ROUND_TRIP" ? { background: NAVY } : {}}>
                Round Trip
              </button>
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Total Miles</label>
            <div className="flex items-center gap-2">
              <input type="number" min="0" step="0.1" placeholder="0" value={miles}
                onChange={e => setMiles(e.target.value)}
                className="border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#F9A825] w-32" />
              <span className="text-sm text-slate-400">miles</span>
            </div>
          </div>
        </div>

        {/* Live price breakdown */}
        <div className="rounded-xl border-2 p-5 space-y-2.5" style={{ borderColor: GOLD, background: "#FFFBF0" }}>
          <div className="flex items-center gap-2 mb-3">
            <div style={{ width: 4, height: 16, background: `linear-gradient(180deg,${GOLD},${NAVY})`, borderRadius: 2 }} />
            <span className="text-sm font-semibold text-slate-700">Price Breakdown</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-slate-600">
              {SERVICE_LABELS[service]} base {trip === "ROUND_TRIP" ? "(×2)" : "(×1)"}
            </span>
            <span className="font-medium text-slate-800">${calc.baseTotal.toFixed(2)}</span>
          </div>
          {calc.billable > 0 ? (
            <div className="flex justify-between text-sm">
              <span className="text-slate-600">
                Mileage ({calc.billable.toFixed(1)} mi × ${rates.MILEAGE_RATE})
              </span>
              <span className="font-medium text-slate-800">+${calc.mileageCharge.toFixed(2)}</span>
            </div>
          ) : (
            <div className="flex justify-between text-sm">
              <span className="text-slate-400 italic">
                {mi > 0 ? `${mi} mi within ${rates.INCLUDED_MILES}-mile free zone` : `First ${rates.INCLUDED_MILES} miles free`}
              </span>
              <span className="text-slate-400">$0.00</span>
            </div>
          )}
          <div className="border-t border-amber-200 pt-2.5 flex justify-between">
            <span className="font-bold text-slate-800">Total</span>
            <span className="font-bold text-xl" style={{ color: NAVY }}>${calc.total.toFixed(2)}</span>
          </div>
        </div>

        {/* Payment method */}
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Payment Method</label>
          <div className="flex flex-wrap gap-2">
            {PAY_METHODS.map(m => (
              <button key={m} type="button" onClick={() => setPayMethod(m)}
                className={`px-4 py-1.5 rounded-full text-sm font-medium border transition-all ${payMethod === m ? "text-white border-transparent" : "border-slate-200 text-slate-600 hover:border-slate-300"}`}
                style={payMethod === m ? { background: NAVY } : {}}>
                {m}
              </button>
            ))}
          </div>
        </div>

        {/* Notes */}
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Notes <span className="font-normal normal-case">(optional)</span></label>
          <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2} placeholder="Authorization #, driver name, etc."
            className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#F9A825] resize-none" />
        </div>

        <button type="submit" disabled={saving}
          style={{ background: NAVY }} className="w-full text-white font-bold py-3.5 rounded-xl text-sm hover:opacity-90 transition disabled:opacity-60">
          {saving ? "Recording…" : `Record Payment — $${calc.total.toFixed(2)}`}
        </button>
      </form>
    </div>
  );
}
