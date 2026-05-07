"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

interface Client { id: string; firstName: string; lastName: string; email?: string; }
interface Ride { id: string; scheduledAt: string; pickupAddress: string; dropoffAddress: string; amount?: number; }

export default function NewInvoicePage() {
  const router = useRouter();
  const [clients, setClients] = useState<Client[]>([]);
  const [clientId, setClientId] = useState("");
  const [rides, setRides] = useState<Ride[]>([]);
  const [items, setItems] = useState([{ description: "", quantity: 1, unitPrice: "" }]);
  const [dueDate, setDueDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 30);
    return d.toISOString().split("T")[0];
  });
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch("/api/clients").then((r) => r.json()).then(setClients);
  }, []);

  useEffect(() => {
    if (!clientId) { setRides([]); return; }
    fetch(`/api/rides?clientId=${clientId}&status=COMPLETED&unbilled=true`)
      .then((r) => r.json()).then(setRides);
  }, [clientId]);

  function addItem() {
    setItems((prev) => [...prev, { description: "", quantity: 1, unitPrice: "" }]);
  }

  function removeItem(i: number) {
    setItems((prev) => prev.filter((_, idx) => idx !== i));
  }

  function updateItem(i: number, field: string, value: string | number) {
    setItems((prev) => prev.map((item, idx) => idx === i ? { ...item, [field]: value } : item));
  }

  function addRideAsItem(ride: Ride) {
    setItems((prev) => [
      ...prev,
      {
        description: `Transportation — ${new Date(ride.scheduledAt).toLocaleDateString()} | ${ride.pickupAddress} → ${ride.dropoffAddress}`,
        quantity: 1,
        unitPrice: ride.amount ? String(ride.amount) : "",
      },
    ]);
  }

  const subtotal = items.reduce((sum, item) => sum + (Number(item.unitPrice) || 0) * (item.quantity || 1), 0);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!clientId) { toast.error("Please select a client"); return; }
    setLoading(true);
    const res = await fetch("/api/invoices", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ clientId, dueDate, notes, items }),
    });
    setLoading(false);
    if (res.ok) {
      const data = await res.json();
      toast.success("Invoice created");
      router.push(`/invoices/${data.id}`);
    } else {
      toast.error("Failed to create invoice");
    }
  }

  return (
    <div className="max-w-3xl mx-auto">
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-4">
          <h2 className="text-lg font-semibold text-slate-800">Invoice Details</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Client *</label>
              <select
                value={clientId}
                onChange={(e) => setClientId(e.target.value)}
                required
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select client…</option>
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>{c.firstName} {c.lastName}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Due Date</label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>

        {rides.length > 0 && (
          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <h3 className="text-sm font-semibold text-slate-700 mb-3">Completed Rides (click to add)</h3>
            <div className="space-y-2">
              {rides.map((r) => (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => addRideAsItem(r)}
                  className="w-full text-left flex items-center justify-between border border-slate-200 rounded-lg px-4 py-2.5 hover:bg-blue-50 hover:border-blue-200 transition-colors text-sm"
                >
                  <span className="text-slate-700">{new Date(r.scheduledAt).toLocaleDateString()} — {r.pickupAddress.split(",")[0]} → {r.dropoffAddress.split(",")[0]}</span>
                  <span className="text-blue-600 font-semibold">{r.amount ? `$${Number(r.amount).toFixed(2)}` : "No amount"} +</span>
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <h3 className="text-sm font-semibold text-slate-700 mb-3">Line Items</h3>
          <div className="space-y-3">
            {items.map((item, i) => (
              <div key={i} className="grid grid-cols-12 gap-2 items-center">
                <input
                  value={item.description}
                  onChange={(e) => updateItem(i, "description", e.target.value)}
                  placeholder="Description"
                  className="col-span-6 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <input
                  type="number"
                  min={1}
                  value={item.quantity}
                  onChange={(e) => updateItem(i, "quantity", Number(e.target.value))}
                  className="col-span-2 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Qty"
                />
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={item.unitPrice}
                  onChange={(e) => updateItem(i, "unitPrice", e.target.value)}
                  placeholder="Unit $"
                  className="col-span-3 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                  type="button"
                  onClick={() => removeItem(i)}
                  className="col-span-1 text-rose-400 hover:text-rose-600 text-lg leading-none"
                >×</button>
              </div>
            ))}
          </div>
          <button type="button" onClick={addItem} className="mt-3 text-sm text-blue-600 hover:underline">+ Add line item</button>

          <div className="mt-4 pt-4 border-t border-slate-100 flex justify-end">
            <div className="text-right space-y-1">
              <div className="text-sm text-slate-500">Subtotal: <span className="font-semibold text-slate-800">${subtotal.toFixed(2)}</span></div>
              <div className="text-base font-bold text-slate-800">Total: ${subtotal.toFixed(2)}</div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <label className="block text-sm font-medium text-slate-700 mb-1">Notes (optional)</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            placeholder="Payment instructions, thank you message…"
            className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
          />
        </div>

        <div className="flex gap-3">
          <button type="submit" disabled={loading} className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-6 py-2.5 rounded-lg text-sm transition disabled:opacity-60">
            {loading ? "Creating…" : "Create Invoice"}
          </button>
          <button type="button" onClick={() => router.back()} className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold px-6 py-2.5 rounded-lg text-sm transition">
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
