"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

interface Client { id: string; firstName: string; lastName: string; phone: string; billingType: string; }
interface Driver { id: string; firstName: string; lastName: string; status: string; }
interface Vehicle { id: string; name: string; type: string; }

export default function BookRidePage() {
  const router = useRouter();
  const [clients, setClients] = useState<Client[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    Promise.all([
      fetch("/api/clients").then((r) => r.json()),
      fetch("/api/drivers").then((r) => r.json()),
      fetch("/api/vehicles").then((r) => r.json()),
    ]).then(([c, d, v]) => {
      setClients(c);
      setDrivers(d);
      setVehicles(v);
    });
  }, []);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    const fd = new FormData(e.currentTarget);
    const body = Object.fromEntries(fd.entries());
    const res = await fetch("/api/rides", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    setLoading(false);
    if (res.ok) {
      toast.success("Ride booked successfully");
      router.push("/rides");
    } else {
      toast.error("Failed to book ride");
    }
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <h2 className="text-lg font-semibold text-slate-800 mb-6">Book a Ride</h2>
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Client *</label>
              <select name="clientId" required className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="">Select client…</option>
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>{c.firstName} {c.lastName} — {c.phone}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Scheduled Date & Time *</label>
              <input name="scheduledAt" type="datetime-local" required className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-1">Pickup Address *</label>
              <input name="pickupAddress" type="text" required placeholder="123 Main St, Boise, ID" className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-1">Drop-off Address *</label>
              <input name="dropoffAddress" type="text" required placeholder="St. Luke's Hospital, Boise, ID" className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Ride Type *</label>
              <select name="rideType" required className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="AMBULATORY">Ambulatory</option>
                <option value="WHEELCHAIR">Wheelchair</option>
                <option value="STRETCHER">Stretcher</option>
                <option value="BARIATRIC">Bariatric</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Billing Type</label>
              <select name="billingType" className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="PRIVATE_PAY">Private Pay</option>
                <option value="FACILITY">Facility Contract</option>
                <option value="THIRD_PARTY">Third Party</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Assign Driver</label>
              <select name="driverId" className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="">Unassigned</option>
                {drivers.map((d) => (
                  <option key={d.id} value={d.id}>{d.firstName} {d.lastName} ({d.status})</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Vehicle</label>
              <select name="vehicleId" className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="">Select vehicle…</option>
                {vehicles.map((v) => (
                  <option key={v.id} value={v.id}>{v.name} ({v.type})</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Provider / Facility Name</label>
              <input name="providerName" type="text" placeholder="St. Luke's Medical Center" className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Ride Amount ($)</label>
              <input name="amount" type="number" step="0.01" min="0" placeholder="0.00" className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-1">Notes</label>
              <textarea name="notes" rows={3} placeholder="Special instructions, mobility notes…" className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
            </div>
          </div>
          <div className="flex gap-3 pt-2">
            <button type="submit" disabled={loading} className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-6 py-2.5 rounded-lg text-sm transition disabled:opacity-60">
              {loading ? "Booking…" : "Book Ride"}
            </button>
            <button type="button" onClick={() => router.back()} className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold px-6 py-2.5 rounded-lg text-sm transition">
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
