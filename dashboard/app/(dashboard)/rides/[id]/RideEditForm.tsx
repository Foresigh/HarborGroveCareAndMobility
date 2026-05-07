"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import Link from "next/link";

const statusColor: Record<string, string> = {
  SCHEDULED: "bg-blue-100 text-blue-700",
  EN_ROUTE: "bg-amber-100 text-amber-700",
  PICKED_UP: "bg-sky-100 text-sky-700",
  COMPLETED: "bg-emerald-100 text-emerald-700",
  CANCELLED: "bg-slate-100 text-slate-500",
  NO_SHOW: "bg-rose-100 text-rose-700",
};

interface Driver { id: string; firstName: string; lastName: string; }
interface Vehicle { id: string; name: string; }
interface Ride {
  id: string;
  status: string;
  scheduledAt: Date;
  pickupAddress: string;
  dropoffAddress: string;
  rideType: string;
  billingType: string;
  driverId: string | null;
  vehicleId: string | null;
  providerName: string | null;
  amount: unknown;
  notes: string | null;
  createdAt: Date;
  client: { firstName: string; lastName: string; phone: string; };
}

const STATUS_OPTIONS = ["SCHEDULED", "EN_ROUTE", "PICKED_UP", "COMPLETED", "CANCELLED", "NO_SHOW"];
const RIDE_TYPES = ["AMBULATORY", "WHEELCHAIR", "STRETCHER", "BARIATRIC"];
const BILLING_TYPES = ["MEDICAID", "PRIVATE_PAY", "FACILITY", "THIRD_PARTY"];

export function RideEditForm({ ride, drivers, vehicles }: { ride: Ride; drivers: Driver[]; vehicles: Vehicle[] }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState(ride.status);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    const fd = new FormData(e.currentTarget);
    const body = Object.fromEntries(fd.entries());
    const res = await fetch(`/api/rides/${ride.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    setLoading(false);
    if (res.ok) {
      toast.success("Ride updated");
      router.refresh();
    } else {
      toast.error("Failed to save changes");
    }
  }

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-6">
      {/* Client */}
      <div className="pb-4 border-b border-slate-100 flex items-start justify-between">
        <div>
          <div className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1">Client</div>
          <div className="font-semibold text-slate-800">{ride.client.firstName} {ride.client.lastName}</div>
          <div className="text-sm text-slate-500">{ride.client.phone}</div>
        </div>
        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${statusColor[status] ?? "bg-slate-100 text-slate-600"}`}>
          {status.replace("_", " ")}
        </span>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Status</label>
            <select name="status" defaultValue={ride.status} onChange={(e) => setStatus(e.target.value)}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
              {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s.replace("_", " ")}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Scheduled</label>
            <input name="scheduledAt" type="datetime-local"
              defaultValue={new Date(ride.scheduledAt).toISOString().slice(0, 16)}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div className="md:col-span-2">
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Pickup Address</label>
            <input name="pickupAddress" type="text" defaultValue={ride.pickupAddress}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div className="md:col-span-2">
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Drop-off Address</label>
            <input name="dropoffAddress" type="text" defaultValue={ride.dropoffAddress}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Ride Type</label>
            <select name="rideType" defaultValue={ride.rideType}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
              {RIDE_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Billing Type</label>
            <select name="billingType" defaultValue={ride.billingType}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
              {BILLING_TYPES.map((t) => <option key={t} value={t}>{t.replace("_", " ")}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Driver</label>
            <select name="driverId" defaultValue={ride.driverId ?? ""}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="">Unassigned</option>
              {drivers.map((d) => <option key={d.id} value={d.id}>{d.firstName} {d.lastName}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Vehicle</label>
            <select name="vehicleId" defaultValue={ride.vehicleId ?? ""}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="">None</option>
              {vehicles.map((v) => <option key={v.id} value={v.id}>{v.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Provider / Facility</label>
            <input name="providerName" type="text" defaultValue={ride.providerName ?? ""}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Amount ($)</label>
            <input name="amount" type="number" step="0.01" min="0"
              defaultValue={ride.amount ? Number(ride.amount) : ""}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div className="md:col-span-2">
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Notes</label>
            <textarea name="notes" rows={3} defaultValue={ride.notes ?? ""}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
          </div>
        </div>

        <div className="flex gap-3 pt-2">
          <button type="submit" disabled={loading}
            className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-6 py-2.5 rounded-lg text-sm transition disabled:opacity-60">
            {loading ? "Saving…" : "Save Changes"}
          </button>
          <Link href="/rides" className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold px-6 py-2.5 rounded-lg text-sm transition">
            Cancel
          </Link>
        </div>
      </form>

      <div className="pt-2 border-t border-slate-100 text-xs text-slate-400">
        Ride ID: {ride.id} · Created {new Date(ride.createdAt).toLocaleDateString()}
      </div>
    </div>
  );
}
