"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

interface Client {
  id: string; firstName: string; lastName: string; phone: string; email: string | null;
  dob: Date | null; address: string | null; city: string | null; state: string; zip: string | null;
  insuranceId: string | null; medicaidId: string | null; billingType: string;
  mobilityNeeds: string | null; specialNotes: string | null;
  emergencyName: string | null; emergencyPhone: string | null;
}

const BILLING_TYPES = ["PRIVATE_PAY", "FACILITY", "THIRD_PARTY"];

export function ClientEditForm({ client }: { client: Client }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    const fd = new FormData(e.currentTarget);
    const body = Object.fromEntries(fd.entries());
    const res = await fetch(`/api/clients/${client.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    setLoading(false);
    if (res.ok) { toast.success("Client updated"); router.refresh(); }
    else toast.error("Failed to save changes");
  }

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-6">
      <h2 className="text-lg font-semibold text-slate-800 mb-6">{client.firstName} {client.lastName}</h2>
      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">First Name</label>
            <input name="firstName" defaultValue={client.firstName} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Last Name</label>
            <input name="lastName" defaultValue={client.lastName} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Phone</label>
            <input name="phone" defaultValue={client.phone} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Email</label>
            <input name="email" type="email" defaultValue={client.email ?? ""} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Date of Birth</label>
            <input name="dob" type="date" defaultValue={client.dob ? new Date(client.dob).toISOString().split("T")[0] : ""} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Billing Type</label>
            <select name="billingType" defaultValue={client.billingType} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
              {BILLING_TYPES.map((t) => <option key={t} value={t}>{t.replace("_", " ")}</option>)}
            </select>
          </div>
          <div className="md:col-span-2">
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Address</label>
            <input name="address" defaultValue={client.address ?? ""} placeholder="123 Main St" className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">City</label>
            <input name="city" defaultValue={client.city ?? ""} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">ZIP</label>
            <input name="zip" defaultValue={client.zip ?? ""} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Insurance ID</label>
            <input name="insuranceId" defaultValue={client.insuranceId ?? ""} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div className="md:col-span-2">
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Mobility Needs</label>
            <input name="mobilityNeeds" defaultValue={client.mobilityNeeds ?? ""} placeholder="e.g. Wheelchair, walker" className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Emergency Contact</label>
            <input name="emergencyName" defaultValue={client.emergencyName ?? ""} placeholder="Name" className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Emergency Phone</label>
            <input name="emergencyPhone" defaultValue={client.emergencyPhone ?? ""} placeholder="Phone" className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div className="md:col-span-2">
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Special Notes</label>
            <textarea name="specialNotes" rows={3} defaultValue={client.specialNotes ?? ""} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
          </div>
        </div>
        <button type="submit" disabled={loading} className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-6 py-2.5 rounded-lg text-sm transition disabled:opacity-60">
          {loading ? "Saving…" : "Save Changes"}
        </button>
      </form>
    </div>
  );
}
