"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { loadStripe } from "@stripe/stripe-js";
import { Elements, PaymentElement, useStripe, useElements } from "@stripe/react-stripe-js";

const NAVY = "#0D2B4E";
const GOLD = "#F9A825";

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ?? "");

interface Rates {
  AMBULATORY_RATE: number; WHEELCHAIR_RATE: number; STRETCHER_RATE: number;
  MILEAGE_RATE: number; INCLUDED_MILES: number;
}
interface Client { id: string; firstName: string; lastName: string; phone?: string; email?: string; }
type ServiceType = "AMBULATORY" | "WHEELCHAIR" | "STRETCHER";
type TripType    = "ONE_WAY" | "ROUND_TRIP";
type Tab         = "charge" | "link";

const SERVICE_LABELS: Record<ServiceType, string> = { AMBULATORY: "Ambulatory", WHEELCHAIR: "Wheelchair", STRETCHER: "Stretcher" };

// miles = 0 → $0 total (no trip). miles > 0 → base rate + mileage surcharge.
function calcPrice(customRate: number, mileageRate: number, includedMiles: number, trip: TripType, miles: number) {
  if (miles === 0) return { baseTotal: 0, mileageCharge: 0, billable: 0, total: 0 };
  const isRound       = trip === "ROUND_TRIP";
  const billable      = Math.max(0, miles - includedMiles);
  const mileageCharge = billable * mileageRate;
  const baseTotal     = isRound ? customRate * 2 : customRate;
  return { baseTotal, mileageCharge, billable, total: Math.round((baseTotal + mileageCharge) * 100) / 100 };
}

function defaultRate(rates: Rates, service: ServiceType) {
  if (service === "AMBULATORY") return rates.AMBULATORY_RATE;
  if (service === "WHEELCHAIR") return rates.WHEELCHAIR_RATE;
  return rates.STRETCHER_RATE;
}

// ── Stripe card form ────────────────────────────────────────────────────────
function ChargeForm({ clientSecret, invoiceNum, total, onSuccess }: {
  clientSecret: string; invoiceNum: string; total: number; onSuccess: () => void;
}) {
  const stripe   = useStripe();
  const elements = useElements();
  const [error, setError]       = useState("");
  const [charging, setCharging] = useState(false);

  async function handleCharge(e: React.FormEvent) {
    e.preventDefault();
    if (!stripe || !elements) return;
    setCharging(true); setError("");
    const result = await stripe.confirmPayment({ elements, redirect: "if_required" });
    setCharging(false);
    if (result.error) setError(result.error.message ?? "Payment failed");
    else onSuccess();
  }

  return (
    <form onSubmit={handleCharge} className="space-y-4">
      <div className="bg-white rounded-xl border border-slate-200 p-5">
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Card Details</p>
        <PaymentElement options={{ layout: "tabs" }} />
      </div>
      {error && <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-700">{error}</div>}
      <button type="submit" disabled={charging || !stripe}
        style={{ background: NAVY }} className="w-full text-white font-bold py-3.5 rounded-xl text-sm hover:opacity-90 transition disabled:opacity-60">
        {charging ? "Processing…" : `Charge $${total.toFixed(2)}`}
      </button>
      <p className="text-center text-xs text-slate-400">Secured by Stripe · Invoice {invoiceNum}</p>
    </form>
  );
}

// ── Main page ───────────────────────────────────────────────────────────────
export default function QuickPaymentPage() {
  const router = useRouter();

  const [rates, setRates]         = useState<Rates>({ AMBULATORY_RATE: 35, WHEELCHAIR_RATE: 45, STRETCHER_RATE: 145, MILEAGE_RATE: 3.65, INCLUDED_MILES: 10 });
  const [clients, setClients]     = useState<Client[]>([]);
  const [tab, setTab]             = useState<Tab>("charge");

  // Trip fields
  const [clientId, setClientId]   = useState("");
  const [service, setService]     = useState<ServiceType>("AMBULATORY");
  const [customRate, setCustomRate] = useState<string>("35");
  const [trip, setTrip]           = useState<TripType>("ONE_WAY");
  const [miles, setMiles]         = useState("");
  const [serviceDate, setDate]    = useState(new Date().toISOString().slice(0, 10));
  const [notes, setNotes]         = useState("");

  // Charge Now state
  const [clientSecret, setClientSecret]     = useState<string | null>(null);
  const [pendingInvoice, setPending]         = useState<{ invoiceNum: string; total: number } | null>(null);
  const [preparing, setPreparing]           = useState(false);
  const [prepareError, setPrepareError]     = useState("");
  const [chargeSuccess, setChargeSuccess]   = useState(false);

  // Send Link state
  const [linkEmail, setLinkEmail] = useState("");
  const [linkPhone, setLinkPhone] = useState("");
  const [sending, setSending]     = useState(false);
  const [linkResult, setLinkResult] = useState<{ url: string; invoiceNum: string; total: number } | null>(null);
  const [linkError, setLinkError] = useState("");
  const [copied, setCopied]       = useState(false);

  useEffect(() => {
    const n = (v: string, d: number) => { const x = Number(v); return isNaN(x) ? d : x; };
    fetch("/api/settings").then(r => r.json()).then(d => {
      const loaded: Rates = {
        AMBULATORY_RATE: n(d.AMBULATORY_RATE, 35), WHEELCHAIR_RATE: n(d.WHEELCHAIR_RATE, 45),
        STRETCHER_RATE: n(d.STRETCHER_RATE, 145), MILEAGE_RATE: n(d.MILEAGE_RATE, 3.65),
        INCLUDED_MILES: n(d.INCLUDED_MILES, 10),
      };
      setRates(loaded);
      setCustomRate(String(loaded.AMBULATORY_RATE));
    });
    fetch("/api/clients").then(r => r.json()).then(d => { if (Array.isArray(d)) setClients(d); });
  }, []);

  // When service type changes, reset customRate to that service's settings value
  function handleServiceChange(s: ServiceType) {
    setService(s);
    setCustomRate(String(defaultRate(rates, s)));
  }

  // Auto-fill contact when client selected
  useEffect(() => {
    if (!clientId) return;
    const c = clients.find(cl => cl.id === clientId);
    if (c) { if (c.email) setLinkEmail(c.email); if (c.phone) setLinkPhone(c.phone); }
  }, [clientId, clients]);

  const mi         = miles === "" ? 0 : Math.max(0, Number(miles) || 0);
  const rateNum    = Math.max(0, Number(customRate) || 0);
  const calc       = calcPrice(rateNum, rates.MILEAGE_RATE, rates.INCLUDED_MILES, trip, mi);

  const tripPayload = () => ({
    clientId: clientId || null,
    serviceType: service,
    tripType: trip,
    miles: mi,
    customRate: rateNum,
    serviceDate,
    notes,
  });

  async function handlePrepareCharge() {
    setPreparing(true);
    setPrepareError("");
    try {
      const res  = await fetch("/api/stripe/payment-intent", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(tripPayload()) });
      let data: Record<string, unknown> = {};
      try { data = await res.json(); } catch { /* non-JSON error body */ }
      if (res.ok) { setClientSecret(data.clientSecret as string); setPending({ invoiceNum: data.invoiceNum as string, total: data.total as number }); }
      else setPrepareError((data.error as string) || `Server error (${res.status}) — check Railway logs`);
    } catch (err) {
      setPrepareError(err instanceof Error ? err.message : "Network error — try again");
    } finally {
      setPreparing(false);
    }
  }

  function handleChargeSuccess() { setChargeSuccess(true); setClientSecret(null); }

  async function handleSendLink(e: React.FormEvent) {
    e.preventDefault();
    setSending(true);
    setLinkError("");
    try {
      const res  = await fetch("/api/stripe/checkout", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...tripPayload(), clientEmail: linkEmail || null, clientPhone: linkPhone || null }),
      });
      let data: Record<string, unknown> = {};
      try { data = await res.json(); } catch { /* non-JSON error body */ }
      if (res.ok) {
        setLinkResult({ url: data.url as string, invoiceNum: data.invoiceNum as string, total: data.total as number });
      } else {
        setLinkError((data.error as string) || `Server error (${res.status}) — check Railway logs`);
      }
    } catch (err) {
      setLinkError(err instanceof Error ? err.message : "Network error — try again");
    } finally {
      setSending(false);
    }
  }

  function copyLink() {
    if (!linkResult) return;
    navigator.clipboard.writeText(linkResult.url);
    setCopied(true); setTimeout(() => setCopied(false), 2000);
  }

  function resetAll() {
    setClientSecret(null); setPending(null); setChargeSuccess(false);
    setLinkResult(null); setCopied(false); setLinkError(""); setPrepareError(""); setMiles("");
  }

  const segBtn = (active: boolean) =>
    `flex-1 py-2 text-sm font-medium rounded-lg transition-all ${active ? "text-white shadow-sm" : "text-slate-600 hover:bg-slate-100"}`;

  // ── Shared trip form ────────────────────────────────────────────────────────
  const TripCard = (
    <>
      {/* Client + Date */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-4">
        <div>
          <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Client <span className="font-normal normal-case">(optional)</span></label>
          <select value={clientId} onChange={e => setClientId(e.target.value)}
            className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#F9A825]">
            <option value="">Walk-in / No client</option>
            {clients.map(c => <option key={c.id} value={c.id}>{c.firstName} {c.lastName}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Service Date</label>
          <input type="date" value={serviceDate} onChange={e => setDate(e.target.value)} required
            className="border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#F9A825]" />
        </div>
      </div>

      {/* Service type + editable rate */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-4">
        <div>
          <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Service Type</label>
          <div className="grid grid-cols-3 gap-2">
            {(["AMBULATORY", "WHEELCHAIR", "STRETCHER"] as ServiceType[]).map(s => (
              <button key={s} type="button" onClick={() => handleServiceChange(s)}
                className={`rounded-xl border-2 p-3 text-center transition-all ${service === s ? "border-[#F9A825] bg-[#FEF9EC]" : "border-slate-200 hover:border-slate-300"}`}>
                <div className={`text-sm font-semibold ${service === s ? "" : "text-slate-700"}`} style={service === s ? { color: NAVY } : {}}>
                  {SERVICE_LABELS[s]}
                </div>
                <div className="text-xs text-slate-400 mt-0.5">${defaultRate(rates, s)} default</div>
              </button>
            ))}
          </div>
        </div>

        {/* Editable rate for selected service */}
        <div className="flex items-center justify-between gap-4 bg-slate-50 rounded-lg px-4 py-3">
          <div>
            <div className="text-sm font-semibold text-slate-700">{SERVICE_LABELS[service]} Rate</div>
            <div className="text-xs text-slate-400 mt-0.5">Edit to override for this trip</div>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-sm font-semibold text-slate-500">$</span>
            <input
              type="number" min="0" step="0.01"
              value={customRate}
              onChange={e => setCustomRate(e.target.value)}
              className="border border-slate-200 rounded-lg px-3 py-2 text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#F9A825] w-24 text-right"
            />
          </div>
        </div>
      </div>

      {/* Trip type + Miles */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-4">
        <div>
          <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Trip Type</label>
          <div className="flex gap-1 bg-slate-100 p-1 rounded-lg">
            <button type="button" onClick={() => setTrip("ONE_WAY")} className={segBtn(trip === "ONE_WAY")} style={trip === "ONE_WAY" ? { background: NAVY } : {}}>One-Way</button>
            <button type="button" onClick={() => setTrip("ROUND_TRIP")} className={segBtn(trip === "ROUND_TRIP")} style={trip === "ROUND_TRIP" ? { background: NAVY } : {}}>Round Trip</button>
          </div>
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Total Miles</label>
          <div className="flex items-center gap-2">
            <input type="number" min="0" step="0.1" placeholder="0" value={miles} onChange={e => setMiles(e.target.value)}
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

        {mi === 0 ? (
          <div className="flex justify-between text-sm">
            <span className="text-slate-400 italic">No miles entered — enter miles to calculate</span>
            <span className="text-slate-400">$0.00</span>
          </div>
        ) : (
          <>
            <div className="flex justify-between text-sm">
              <span className="text-slate-600">{SERVICE_LABELS[service]} rate {trip === "ROUND_TRIP" ? "(×2)" : "(×1)"}</span>
              <span className="font-medium text-slate-800">${calc.baseTotal.toFixed(2)}</span>
            </div>
            {calc.billable > 0 ? (
              <div className="flex justify-between text-sm">
                <span className="text-slate-600">Mileage ({calc.billable.toFixed(1)} mi × ${rates.MILEAGE_RATE})</span>
                <span className="font-medium text-slate-800">+${calc.mileageCharge.toFixed(2)}</span>
              </div>
            ) : (
              <div className="flex justify-between text-sm">
                <span className="text-slate-400 italic">{mi} mi within {rates.INCLUDED_MILES}-mile free zone</span>
                <span className="text-slate-400">$0.00</span>
              </div>
            )}
          </>
        )}

        <div className="border-t border-amber-200 pt-2.5 flex justify-between">
          <span className="font-bold text-slate-800">Total</span>
          <span className="font-bold text-xl" style={{ color: NAVY }}>${calc.total.toFixed(2)}</span>
        </div>
      </div>

      {/* Notes */}
      <div className="bg-white rounded-xl border border-slate-200 p-5">
        <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Notes <span className="font-normal normal-case">(optional)</span></label>
        <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2} placeholder="Authorization #, driver name, etc."
          className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#F9A825] resize-none" />
      </div>
    </>
  );

  // ── Charge success screen ───────────────────────────────────────────────────
  if (chargeSuccess && pendingInvoice) {
    return (
      <div className="max-w-md mx-auto mt-12">
        <div className="bg-white rounded-2xl border border-slate-200 p-10 text-center shadow-sm">
          <div style={{ width: 56, height: 56, borderRadius: "50%", background: "#d1fae5", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px" }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2.5" width="28" height="28"><path d="M20 6L9 17l-5-5"/></svg>
          </div>
          <h2 className="text-xl font-bold text-slate-800 mb-1">Payment Successful</h2>
          <p className="text-sm text-slate-500 mb-6">Card charged via Stripe.</p>
          <div className="bg-slate-50 rounded-xl p-5 text-left space-y-2 mb-6">
            <div className="flex justify-between text-sm"><span className="text-slate-500">Invoice #</span><span className="font-mono font-semibold">{pendingInvoice.invoiceNum}</span></div>
            <div className="flex justify-between text-sm"><span className="text-slate-500">Amount</span><span className="font-bold text-green-600">${pendingInvoice.total.toFixed(2)}</span></div>
          </div>
          <div className="flex gap-3">
            <button onClick={resetAll} className="flex-1 border border-slate-200 text-slate-700 font-medium py-2.5 rounded-lg text-sm hover:bg-slate-50 transition">New Payment</button>
            <button onClick={() => router.push("/invoices")} style={{ background: NAVY }} className="flex-1 text-white font-semibold py-2.5 rounded-lg text-sm hover:opacity-90 transition">View Invoices</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-xl mx-auto">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-slate-800">Accept Payment</h1>
        <p className="text-sm text-slate-500 mt-1">Charge a card now or send a payment link to the client.</p>
      </div>

      {/* Tab switcher */}
      <div className="flex gap-1 bg-slate-100 p-1 rounded-xl mb-5">
        <button type="button" onClick={() => { setTab("charge"); resetAll(); }}
          className={`flex-1 py-2.5 text-sm font-semibold rounded-lg transition-all flex items-center justify-center gap-2 ${tab === "charge" ? "text-white shadow" : "text-slate-600 hover:bg-white/60"}`}
          style={tab === "charge" ? { background: NAVY } : {}}>
          <svg viewBox="0 0 24 24" fill="currentColor" width="15" height="15"><path d="M20 4H4c-1.11 0-2 .89-2 2v12c0 1.11.89 2 2 2h16c1.11 0 2-.89 2-2V6c0-1.11-.89-2-2-2zm0 14H4v-6h16v6zm0-10H4V6h16v2z"/></svg>
          Charge Card Now
        </button>
        <button type="button" onClick={() => { setTab("link"); resetAll(); }}
          className={`flex-1 py-2.5 text-sm font-semibold rounded-lg transition-all flex items-center justify-center gap-2 ${tab === "link" ? "text-white shadow" : "text-slate-600 hover:bg-white/60"}`}
          style={tab === "link" ? { background: NAVY } : {}}>
          <svg viewBox="0 0 24 24" fill="currentColor" width="15" height="15"><path d="M3.9 12c0-1.71 1.39-3.1 3.1-3.1h4V7H7c-2.76 0-5 2.24-5 5s2.24 5 5 5h4v-1.9H7c-1.71 0-3.1-1.39-3.1-3.1zM8 13h8v-2H8v2zm9-6h-4v1.9h4c1.71 0 3.1 1.39 3.1 3.1s-1.39 3.1-3.1 3.1h-4V17h4c2.76 0 5-2.24 5-5s-2.24-5-5-5z"/></svg>
          Send Payment Link
        </button>
      </div>

      {/* Charge Now tab */}
      {tab === "charge" && (
        <div className="space-y-5">
          {TripCard}
          {prepareError && (
            <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-700">{prepareError}</div>
          )}
          {!clientSecret && (
            <button type="button" onClick={handlePrepareCharge} disabled={preparing}
              style={{ background: NAVY }} className="w-full text-white font-bold py-3.5 rounded-xl text-sm hover:opacity-90 transition disabled:opacity-60">
              {preparing ? "Preparing…" : `Enter Card Details — $${calc.total.toFixed(2)}`}
            </button>
          )}
          {clientSecret && pendingInvoice && (
            <Elements stripe={stripePromise} options={{ clientSecret, appearance: { theme: "stripe", variables: { colorPrimary: NAVY, borderRadius: "8px" } } }}>
              <ChargeForm clientSecret={clientSecret} invoiceNum={pendingInvoice.invoiceNum} total={pendingInvoice.total} onSuccess={handleChargeSuccess} />
            </Elements>
          )}
        </div>
      )}

      {/* Send Link tab */}
      {tab === "link" && (
        <form onSubmit={handleSendLink} className="space-y-5">
          {TripCard}
          <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-4">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Send link to client</p>
            <div>
              <label className="block text-xs text-slate-500 mb-1.5">Email <span className="font-normal">(optional)</span></label>
              <input type="email" value={linkEmail} onChange={e => setLinkEmail(e.target.value)} placeholder="client@example.com"
                className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#F9A825]" />
            </div>
            <div>
              <label className="block text-xs text-slate-500 mb-1.5">Phone / SMS <span className="font-normal">(optional)</span></label>
              <input type="tel" value={linkPhone} onChange={e => setLinkPhone(e.target.value)} placeholder="+12085551234"
                className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#F9A825]" />
            </div>
            <p className="text-xs text-slate-400">Leave blank to just generate the link and copy it manually.</p>
          </div>

          {linkResult && (
            <div className="bg-green-50 border border-green-200 rounded-xl p-5 space-y-3">
              <div className="flex items-center gap-2 text-green-700 font-semibold text-sm">
                <svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>
                Payment link created — Invoice {linkResult.invoiceNum}
              </div>
              <div className="bg-white rounded-lg border border-green-200 px-3 py-2.5 text-xs font-mono text-slate-600 break-all">{linkResult.url}</div>
              <div className="flex gap-2">
                <button type="button" onClick={copyLink} className="flex-1 border border-green-300 text-green-700 font-medium py-2 rounded-lg text-sm hover:bg-green-100 transition">
                  {copied ? "Copied!" : "Copy Link"}
                </button>
                <a href={linkResult.url} target="_blank" rel="noreferrer" className="flex-1 text-center border border-green-300 text-green-700 font-medium py-2 rounded-lg text-sm hover:bg-green-100 transition">
                  Open Link
                </a>
              </div>
              <p className="text-xs text-slate-500">Invoice will auto-update to PAID once the client completes payment.</p>
            </div>
          )}

          {linkError && (
            <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-700">{linkError}</div>
          )}
          {!linkResult && (
            <button type="submit" disabled={sending} style={{ background: NAVY }} className="w-full text-white font-bold py-3.5 rounded-xl text-sm hover:opacity-90 transition disabled:opacity-60">
              {sending ? "Generating…" : `Generate Payment Link — $${calc.total.toFixed(2)}`}
            </button>
          )}
          {linkResult && (
            <button type="button" onClick={resetAll} className="w-full border border-slate-200 text-slate-700 font-medium py-2.5 rounded-xl text-sm hover:bg-slate-50 transition">
              Start New Payment
            </button>
          )}
        </form>
      )}
    </div>
  );
}
