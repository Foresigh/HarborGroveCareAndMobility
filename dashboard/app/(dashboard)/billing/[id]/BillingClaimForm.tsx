"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import Link from "next/link";

const statusColor: Record<string, string> = {
  PENDING: "bg-amber-100 text-amber-700",
  SUBMITTED: "bg-blue-100 text-blue-700",
  PAID: "bg-emerald-100 text-emerald-700",
  DENIED: "bg-rose-100 text-rose-700",
};

const STATUS_OPTIONS = ["PENDING", "SUBMITTED", "PAID", "DENIED"];

interface Claim {
  id: string; status: string; payer: string; claimNumber: string | null;
  amount: unknown; denialReason: string | null; submittedAt: Date | null; paidAt: Date | null;
  ride: {
    id: string; scheduledAt: Date; pickupAddress: string; dropoffAddress: string;
    client: { firstName: string; lastName: string; phone: string; };
  };
}

export function BillingClaimForm({ claim }: { claim: Claim }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState(claim.status);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    const fd = new FormData(e.currentTarget);
    const body = Object.fromEntries(fd.entries());
    const res = await fetch(`/api/billing/${claim.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    setLoading(false);
    if (res.ok) { toast.success("Claim updated"); router.refresh(); }
    else toast.error("Failed to save changes");
  }

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-5">
      {/* Ride summary */}
      <div className="pb-4 border-b border-slate-100">
        <div className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">Ride</div>
        <div className="font-semibold text-slate-800">{claim.ride.client.firstName} {claim.ride.client.lastName}</div>
        <div className="text-sm text-slate-500">{new Date(claim.ride.scheduledAt).toLocaleDateString()} · {claim.ride.pickupAddress}</div>
        <Link href={`/rides/${claim.ride.id}`} className="text-xs text-blue-600 hover:underline mt-1 inline-block">View ride →</Link>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Status</label>
            <select name="status" defaultValue={claim.status} onChange={(e) => setStatus(e.target.value)}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
              {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div className="flex items-end">
            <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${statusColor[status] ?? "bg-slate-100 text-slate-600"}`}>
              {status}
            </span>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Payer</label>
            <select name="payer" defaultValue={claim.payer}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
              {["PRIVATE_PAY", "FACILITY", "THIRD_PARTY"].map((p) => (
                <option key={p} value={p}>{p.replace("_", " ")}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Claim #</label>
            <input name="claimNumber" defaultValue={claim.claimNumber ?? ""}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Amount ($)</label>
            <input name="amount" type="number" step="0.01" min="0" defaultValue={claim.amount ? Number(claim.amount) : ""}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          {status === "DENIED" && (
            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Denial Reason</label>
              <input name="denialReason" defaultValue={claim.denialReason ?? ""}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
          )}
        </div>
        <button type="submit" disabled={loading}
          className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-6 py-2.5 rounded-lg text-sm transition disabled:opacity-60">
          {loading ? "Saving…" : "Save Changes"}
        </button>
      </form>
    </div>
  );
}
