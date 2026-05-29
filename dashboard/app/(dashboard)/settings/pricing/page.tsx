"use client";
import { useEffect, useState } from "react";
import { toast } from "sonner";

interface Settings {
  AMBULATORY_RATE: string;
  WHEELCHAIR_RATE: string;
  STRETCHER_RATE: string;
  MILEAGE_RATE: string;
  INCLUDED_MILES: string;
}

const FIELDS = [
  { key: "AMBULATORY_RATE", label: "Ambulatory Base Rate", prefix: "$", hint: "Per trip (one-way)" },
  { key: "WHEELCHAIR_RATE", label: "Wheelchair Base Rate", prefix: "$", hint: "Per trip (one-way)" },
  { key: "STRETCHER_RATE", label: "Stretcher Base Rate", prefix: "$", hint: "Per trip (one-way)" },
  { key: "MILEAGE_RATE", label: "Mileage Rate", prefix: "$", hint: "Per mile beyond included miles" },
  { key: "INCLUDED_MILES", label: "Included Miles Per Trip", prefix: "", hint: "Miles included free per one-way trip" },
];

export default function PricingSettingsPage() {
  const [settings, setSettings] = useState<Settings>({
    AMBULATORY_RATE: "35",
    WHEELCHAIR_RATE: "45",
    STRETCHER_RATE: "145",
    MILEAGE_RATE: "3.65",
    INCLUDED_MILES: "10",
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch("/api/settings")
      .then((r) => r.json())
      .then((data) => { setSettings((prev) => ({ ...prev, ...data })); setLoading(false); });
  }, []);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const res = await fetch("/api/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(settings),
    });
    setSaving(false);
    if (res.ok) toast.success("Pricing updated");
    else toast.error("Failed to save");
  }

  const inputCls = "border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#F9A825] w-36";

  return (
    <div className="max-w-xl mx-auto">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-slate-800">Pricing Settings</h1>
        <p className="text-sm text-slate-500 mt-1">These rates apply to all new invoices. Existing invoices are not affected.</p>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <div className="flex items-center gap-2 mb-5 pb-4 border-b border-slate-100">
          <div style={{ width: 4, height: 20, background: "linear-gradient(180deg,#F9A825,#0D2B4E)", borderRadius: 2 }} />
          <span className="text-sm font-semibold text-slate-700">Base Rates &amp; Mileage</span>
        </div>

        {loading ? (
          <div className="text-slate-400 text-sm py-4">Loading…</div>
        ) : (
          <form onSubmit={handleSave} className="space-y-5">
            {FIELDS.map(({ key, label, prefix, hint }) => (
              <div key={key} className="flex items-center justify-between gap-4">
                <div>
                  <div className="text-sm font-medium text-slate-700">{label}</div>
                  <div className="text-xs text-slate-400 mt-0.5">{hint}</div>
                </div>
                <div className="flex items-center gap-1.5">
                  {prefix && <span className="text-sm font-semibold text-slate-500">{prefix}</span>}
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={settings[key as keyof Settings]}
                    onChange={(e) => setSettings((prev) => ({ ...prev, [key]: e.target.value }))}
                    className={inputCls}
                  />
                </div>
              </div>
            ))}

            <div className="pt-4 border-t border-slate-100">
              <div className="bg-[#FEF9EC] rounded-lg p-4 text-xs text-slate-600 space-y-1 mb-5">
                <div className="font-semibold text-slate-700 mb-1">How pricing works</div>
                <div>• Round trips = base rate × 2</div>
                <div>• First <strong>{settings.INCLUDED_MILES} miles</strong> included free per one-way trip</div>
                <div>• Round trips get the {settings.INCLUDED_MILES}-mile credit only once (going leg)</div>
                <div>• Billable miles = total miles − included miles, billed at ${settings.MILEAGE_RATE}/mi</div>
              </div>
              <button type="submit" disabled={saving}
                className="bg-[#0D2B4E] hover:bg-[#0a2240] text-white font-semibold px-6 py-2.5 rounded-lg text-sm transition disabled:opacity-60">
                {saving ? "Saving…" : "Save Pricing"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
