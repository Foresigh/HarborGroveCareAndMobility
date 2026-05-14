"use client";
import { useEffect, useState } from "react";
import { toast } from "sonner";

interface Facility {
  id: string;
  name: string;
  address: string | null;
  email: string | null;
  phone: string | null;
  contact: string | null;
  active: boolean;
}

const EMPTY: Omit<Facility, "id" | "active"> = { name: "", address: "", email: "", phone: "", contact: "" };

export default function FacilitiesPage() {
  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [addForm, setAddForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState(EMPTY);

  async function load() {
    const res = await fetch("/api/facilities");
    if (res.ok) setFacilities(await res.json());
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!addForm.name.trim()) return;
    setSaving(true);
    const res = await fetch("/api/facilities", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(addForm),
    });
    setSaving(false);
    if (res.ok) {
      toast.success("Facility added");
      setShowAdd(false);
      setAddForm(EMPTY);
      load();
    } else {
      toast.error("Failed to add facility");
    }
  }

  async function handleEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editId) return;
    setSaving(true);
    const res = await fetch(`/api/facilities/${editId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(editForm),
    });
    setSaving(false);
    if (res.ok) {
      toast.success("Facility updated");
      setEditId(null);
      load();
    } else {
      toast.error("Failed to update facility");
    }
  }

  async function handleDeactivate(id: string) {
    const res = await fetch(`/api/facilities/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active: false }),
    });
    if (res.ok) { toast.success("Facility removed"); load(); }
    else toast.error("Failed to remove facility");
  }

  function startEdit(f: Facility) {
    setEditId(f.id);
    setEditForm({ name: f.name, address: f.address ?? "", email: f.email ?? "", phone: f.phone ?? "", contact: f.contact ?? "" });
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-800">Facilities</h1>
          <p className="text-sm text-slate-500 mt-0.5">Manage facility partners for billing and invoicing.</p>
        </div>
        <button
          onClick={() => { setShowAdd(true); setEditId(null); }}
          className="bg-[#F9A825] hover:bg-[#e09b1e] text-white font-semibold px-4 py-2 rounded-lg text-sm transition flex items-center gap-2"
        >
          <svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16"><path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/></svg>
          Add Facility
        </button>
      </div>

      {/* Add form */}
      {showAdd && (
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <h2 className="text-sm font-semibold text-slate-700 mb-4">New Facility</h2>
          <form onSubmit={handleAdd} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Facility Name *</label>
                <input required value={addForm.name} onChange={(e) => setAddForm({ ...addForm, name: e.target.value })}
                  placeholder="St. Luke's Medical Center"
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Contact Person</label>
                <input value={addForm.contact ?? ""} onChange={(e) => setAddForm({ ...addForm, contact: e.target.value })}
                  placeholder="Billing department contact"
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Phone</label>
                <input type="tel" value={addForm.phone ?? ""} onChange={(e) => setAddForm({ ...addForm, phone: e.target.value })}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Email</label>
                <input type="email" value={addForm.email ?? ""} onChange={(e) => setAddForm({ ...addForm, email: e.target.value })}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Address</label>
                <input value={addForm.address ?? ""} onChange={(e) => setAddForm({ ...addForm, address: e.target.value })}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
            </div>
            <div className="flex gap-3">
              <button type="submit" disabled={saving}
                className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-5 py-2 rounded-lg text-sm transition disabled:opacity-60">
                {saving ? "Saving…" : "Add Facility"}
              </button>
              <button type="button" onClick={() => setShowAdd(false)}
                className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold px-5 py-2 rounded-lg text-sm transition">
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Facility list */}
      {loading ? (
        <div className="text-sm text-slate-400 py-8 text-center">Loading…</div>
      ) : facilities.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-10 text-center text-slate-400 text-sm">
          No facilities yet. Click "Add Facility" to get started.
        </div>
      ) : (
        <div className="space-y-3">
          {facilities.map((f) => (
            <div key={f.id} className="bg-white rounded-xl border border-slate-200 p-5">
              {editId === f.id ? (
                <form onSubmit={handleEdit} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="md:col-span-2">
                      <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Facility Name *</label>
                      <input required value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                        className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Contact Person</label>
                      <input value={editForm.contact ?? ""} onChange={(e) => setEditForm({ ...editForm, contact: e.target.value })}
                        className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Phone</label>
                      <input type="tel" value={editForm.phone ?? ""} onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                        className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Email</label>
                      <input type="email" value={editForm.email ?? ""} onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                        className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Address</label>
                      <input value={editForm.address ?? ""} onChange={(e) => setEditForm({ ...editForm, address: e.target.value })}
                        className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <button type="submit" disabled={saving}
                      className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-5 py-2 rounded-lg text-sm transition disabled:opacity-60">
                      {saving ? "Saving…" : "Save Changes"}
                    </button>
                    <button type="button" onClick={() => setEditId(null)}
                      className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold px-5 py-2 rounded-lg text-sm transition">
                      Cancel
                    </button>
                  </div>
                </form>
              ) : (
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-1 min-w-0">
                    <div className="font-semibold text-slate-800">{f.name}</div>
                    <div className="flex flex-wrap gap-x-4 gap-y-0.5 text-sm text-slate-500">
                      {f.contact && <span>{f.contact}</span>}
                      {f.phone && <span>{f.phone}</span>}
                      {f.email && <span>{f.email}</span>}
                      {f.address && <span>{f.address}</span>}
                    </div>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <button onClick={() => startEdit(f)}
                      className="text-xs font-medium px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition">
                      Edit
                    </button>
                    <button onClick={() => handleDeactivate(f.id)}
                      className="text-xs font-medium px-3 py-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600 transition">
                      Remove
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
