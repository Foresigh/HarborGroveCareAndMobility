import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Resend } from "resend";

const APP_URL = (process.env.NEXT_PUBLIC_APP_URL ?? "https://dashboard.harborgrovecareandmobility.com").replace(/\/$/, "");
const FROM = process.env.RESEND_FROM ?? "Harbor Grove Care & Mobility <noreply@harborgrovecareandmobility.com>";

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const invoice = await prisma.invoice.findUnique({
    where: { id },
    include: { client: true, facility: true, items: true },
  });

  if (!invoice) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Load pricing settings (fall back to defaults) so the emailed breakdown matches the dashboard
  const settingRows = await prisma.setting.findMany();
  const cfg: Record<string, string> = {};
  for (const r of settingRows) cfg[r.key] = r.value;
  const num = (k: string, d: number) => { const x = Number(cfg[k]); return isNaN(x) ? d : x; };
  const MILEAGE_RATE = num("MILEAGE_RATE", 3.65);
  const INCLUDED_MILES = num("INCLUDED_MILES", 0);
  const SERVICE_RATES: Record<string, number> = {
    AMBULATORY: num("AMBULATORY_RATE", 35),
    WHEELCHAIR: num("WHEELCHAIR_RATE", 45),
    STRETCHER: num("STRETCHER_RATE", 145),
  };

  const toEmail = invoice.facility?.email ?? invoice.client?.email;
  if (!toEmail) return NextResponse.json({ error: "No email address on file for this client or facility" }, { status: 400 });

  const billToName = invoice.facility?.name ?? (invoice.client ? `${invoice.client.firstName} ${invoice.client.lastName}` : "");
  const payUrl = `${APP_URL}/pay/${invoice.invoiceNum}`;

  // Trip rows
  const tripRows = invoice.items.map((item) => `
    <tr style="border-bottom:1px solid #f1f5f9;">
      <td style="padding:7px 10px;color:#334155;">${item.serviceDate ? new Date(item.serviceDate).toLocaleDateString() : "—"}</td>
      <td style="padding:7px 10px;font-weight:600;color:#334155;">${item.patientName || "—"}</td>
      <td style="padding:7px 10px;color:#64748b;text-align:center;">${item.serviceType ? item.serviceType.charAt(0) + item.serviceType.slice(1).toLowerCase() : "—"}</td>
      <td style="padding:7px 10px;color:#64748b;text-align:center;">${item.tripType === "ROUND_TRIP" ? "Round Trip" : item.tripType === "ONE_WAY" ? "One Way" : "—"}</td>
      <td style="padding:7px 10px;color:#64748b;text-align:center;">${item.miles != null ? Number(item.miles).toFixed(1) : "—"}</td>
      <td style="padding:7px 10px;font-weight:600;color:#0D2B4E;text-align:right;">$${Number(item.total).toFixed(2)}</td>
    </tr>`).join("");

  // Pricing summary by service type
  const breakdownRows = ["AMBULATORY", "WHEELCHAIR", "STRETCHER"].map((type) => {
    const typeItems = invoice.items.filter((i) => i.serviceType === type);
    if (typeItems.length === 0) return "";
    const oneWay = typeItems.filter((i) => i.tripType === "ONE_WAY");
    const roundTrip = typeItems.filter((i) => i.tripType === "ROUND_TRIP");
    const totalMiles = typeItems.reduce((s, i) => s + (Number(i.miles) || 0), 0);
    const billableMiles = Math.max(0, totalMiles - typeItems.length * INCLUDED_MILES);
    const baseRate = SERVICE_RATES[type] ?? 0;
    const baseFees = typeItems.reduce((s, i) => s + (i.tripType === "ROUND_TRIP" ? baseRate * 2 : baseRate), 0);
    const lineTotal = baseFees + billableMiles * MILEAGE_RATE;
    return `
      <tr style="border-bottom:1px solid #f1f5f9;">
        <td style="padding:7px 10px;font-weight:600;color:#334155;">${type.charAt(0) + type.slice(1).toLowerCase()}</td>
        <td style="padding:7px 10px;text-align:center;color:#64748b;">$${baseRate}</td>
        <td style="padding:7px 10px;text-align:center;color:#64748b;">${oneWay.length}</td>
        <td style="padding:7px 10px;text-align:center;color:#64748b;">${roundTrip.length}</td>
        <td style="padding:7px 10px;text-align:center;color:#64748b;">$${baseFees.toFixed(2)}</td>
        <td style="padding:7px 10px;text-align:center;color:#64748b;">${billableMiles.toFixed(1)}</td>
        <td style="padding:7px 10px;text-align:right;font-weight:700;color:#0D2B4E;">$${lineTotal.toFixed(2)}</td>
      </tr>`;
  }).join("");

  const periodStr = invoice.billingPeriodStart && invoice.billingPeriodEnd
    ? `${new Date(invoice.billingPeriodStart).toLocaleDateString()} – ${new Date(invoice.billingPeriodEnd).toLocaleDateString()}`
    : "";

  const html = `<!DOCTYPE html><html><body style="margin:0;padding:0;background:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:32px 16px;">
<table width="640" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 2px 16px rgba(0,0,0,.08);">

  <!-- Header with logo -->
  <tr><td style="background:#0D2B4E;padding:28px 40px;">
    <table width="100%" cellpadding="0" cellspacing="0"><tr>
      <td><img src="${APP_URL}/logo-white.svg" alt="Harbor Grove Care &amp; Mobility" height="44" style="display:block;" /></td>
      <td style="text-align:right;">
        <div style="color:rgba(255,255,255,.5);font-size:10px;text-transform:uppercase;letter-spacing:1px;">Invoice</div>
        <div style="color:#F9A825;font-size:22px;font-weight:800;">${invoice.invoiceNum}</div>
      </td>
    </tr></table>
  </td></tr>

  <!-- Bill To + Invoice Meta -->
  <tr><td style="padding:20px 40px;border-bottom:1px solid #f1f5f9;">
    <table width="100%" cellpadding="0" cellspacing="0"><tr>
      <td width="50%" style="vertical-align:top;">
        <div style="font-size:10px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:1px;margin-bottom:6px;">Bill To</div>
        <div style="font-size:15px;font-weight:700;color:#0D2B4E;">${billToName}</div>
        ${invoice.facility?.address ? `<div style="font-size:12px;color:#64748b;">${invoice.facility.address}</div>` : ""}
        <div style="font-size:12px;color:#64748b;">${toEmail}</div>
        ${invoice.facility?.phone ? `<div style="font-size:12px;color:#64748b;">${invoice.facility.phone}</div>` : ""}
      </td>
      <td width="50%" style="vertical-align:top;text-align:right;font-size:12px;color:#64748b;">
        <div><strong style="color:#334155;">Invoice #</strong> ${invoice.invoiceNum}</div>
        <div><strong style="color:#334155;">Payment Terms</strong> ${invoice.paymentTerms}</div>
        ${periodStr ? `<div><strong style="color:#334155;">Billing Period</strong> ${periodStr}</div>` : ""}
        <div><strong style="color:#334155;">Invoice Date</strong> ${new Date(invoice.issueDate).toLocaleDateString()}</div>
        <div><strong style="color:#334155;">Due Date</strong> <strong style="color:#0D2B4E;">${new Date(invoice.dueDate).toLocaleDateString()}</strong></div>
      </td>
    </tr></table>
  </td></tr>

  ${breakdownRows ? `
  <!-- Pricing Summary -->
  <tr><td style="padding:16px 40px;border-bottom:1px solid #f1f5f9;">
    <div style="font-size:10px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:1px;margin-bottom:8px;">Pricing Summary</div>
    <table width="100%" cellpadding="0" cellspacing="0" style="font-size:12px;border-collapse:collapse;">
      <thead><tr style="border-bottom:2px solid #0D2B4E;">
        <th style="padding:6px 10px;text-align:left;font-size:10px;color:#0D2B4E;text-transform:uppercase;">Service</th>
        <th style="padding:6px 10px;text-align:center;font-size:10px;color:#0D2B4E;text-transform:uppercase;">Rate</th>
        <th style="padding:6px 10px;text-align:center;font-size:10px;color:#0D2B4E;text-transform:uppercase;">One-Way</th>
        <th style="padding:6px 10px;text-align:center;font-size:10px;color:#0D2B4E;text-transform:uppercase;">Round Trip</th>
        <th style="padding:6px 10px;text-align:center;font-size:10px;color:#0D2B4E;text-transform:uppercase;">Base Fees</th>
        <th style="padding:6px 10px;text-align:center;font-size:10px;color:#0D2B4E;text-transform:uppercase;">Billable Mi.</th>
        <th style="padding:6px 10px;text-align:right;font-size:10px;color:#0D2B4E;text-transform:uppercase;">Line Total</th>
      </tr></thead>
      <tbody>${breakdownRows}</tbody>
    </table>
  </td></tr>` : ""}

  ${tripRows ? `
  <!-- Trip Detail -->
  <tr><td style="padding:16px 40px;border-bottom:1px solid #f1f5f9;">
    <div style="font-size:10px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:1px;margin-bottom:8px;">Trip Detail Log</div>
    <table width="100%" cellpadding="0" cellspacing="0" style="font-size:12px;border-collapse:collapse;">
      <thead><tr style="border-bottom:2px solid #0D2B4E;">
        <th style="padding:6px 10px;text-align:left;font-size:10px;color:#0D2B4E;text-transform:uppercase;">Date</th>
        <th style="padding:6px 10px;text-align:left;font-size:10px;color:#0D2B4E;text-transform:uppercase;">Patient</th>
        <th style="padding:6px 10px;text-align:center;font-size:10px;color:#0D2B4E;text-transform:uppercase;">Service</th>
        <th style="padding:6px 10px;text-align:center;font-size:10px;color:#0D2B4E;text-transform:uppercase;">Trip Type</th>
        <th style="padding:6px 10px;text-align:center;font-size:10px;color:#0D2B4E;text-transform:uppercase;">Miles</th>
        <th style="padding:6px 10px;text-align:right;font-size:10px;color:#0D2B4E;text-transform:uppercase;">Total</th>
      </tr></thead>
      <tbody>${tripRows}</tbody>
    </table>
  </td></tr>` : ""}

  <!-- Total Due -->
  <tr><td style="padding:20px 40px;border-bottom:1px solid #f1f5f9;text-align:right;">
    <div style="display:inline-block;border-top:2px solid #0D2B4E;padding-top:10px;min-width:240px;">
      <table width="100%" cellpadding="0" cellspacing="0">
        <tr>
          <td style="font-size:15px;font-weight:700;color:#0D2B4E;">Total Due</td>
          <td style="font-size:22px;font-weight:800;color:#0D2B4E;text-align:right;">$${Number(invoice.total).toFixed(2)}</td>
        </tr>
      </table>
    </div>
  </td></tr>

  <!-- Pay Now Button -->
  <tr><td style="padding:24px 40px;text-align:center;border-bottom:1px solid #f1f5f9;">
    <a href="${payUrl}" style="display:inline-block;background:#0D2B4E;color:#fff;font-weight:700;font-size:15px;padding:14px 36px;border-radius:10px;text-decoration:none;letter-spacing:0.01em;">
      Pay Now — $${Number(invoice.total).toFixed(2)} →
    </a>
    <div style="margin-top:10px;font-size:11px;color:#94a3b8;">Secure payment powered by Stripe</div>
  </td></tr>

  <!-- Footer -->
  <tr><td style="padding:16px 40px 24px;text-align:center;font-size:11px;color:#94a3b8;">
    Harbor Grove Care &amp; Mobility, LLC · Boise, ID · 208-206-0694<br>
    <a href="https://www.harborgrovecareandmobility.com" style="color:#94a3b8;">www.harborgrovecareandmobility.com</a>
  </td></tr>

</table></td></tr></table></body></html>`;

  const resend = new Resend(process.env.RESEND_API_KEY);
  const { error } = await resend.emails.send({
    from: FROM,
    to: toEmail,
    subject: `Invoice ${invoice.invoiceNum} — Harbor Grove Care & Mobility`,
    html,
  });

  if (error) {
    console.error(`Invoice send FAILED — ${invoice.invoiceNum} to ${toEmail}:`, error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  console.log(`Invoice sent — ${invoice.invoiceNum} to ${toEmail}`);

  await prisma.invoice.update({
    where: { id },
    data: { status: "SENT", sentAt: new Date() },
  });

  return NextResponse.json({ ok: true });
}
