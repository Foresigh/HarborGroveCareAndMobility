import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

const SERVICE_RATES: Record<string, number> = { AMBULATORY: 35, WHEELCHAIR: 45, STRETCHER: 145 };
const MILEAGE_RATE = 3.65;
const INCLUDED_MILES = 10;

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

  const toEmail = invoice.facility?.email ?? invoice.client?.email;
  if (!toEmail) return NextResponse.json({ error: "No email address on file for this client or facility" }, { status: 400 });

  const billToName = invoice.facility?.name ?? (invoice.client ? `${invoice.client.firstName} ${invoice.client.lastName}` : "");

  // Build trip rows
  const tripRows = invoice.items.map((item) => `
    <tr style="border-bottom:1px solid #f1f5f9;">
      <td style="padding:7px 10px;color:#334155;">${item.serviceDate ? new Date(item.serviceDate).toLocaleDateString() : "—"}</td>
      <td style="padding:7px 10px;font-weight:600;color:#334155;">${item.patientName || "—"}</td>
      <td style="padding:7px 10px;color:#64748b;text-align:center;">${item.serviceType ? item.serviceType.charAt(0) + item.serviceType.slice(1).toLowerCase() : "—"}</td>
      <td style="padding:7px 10px;color:#64748b;text-align:center;">${item.tripType === "ROUND_TRIP" ? "Round Trip" : item.tripType === "ONE_WAY" ? "One Way" : "—"}</td>
      <td style="padding:7px 10px;color:#64748b;text-align:center;">${item.miles != null ? Number(item.miles).toFixed(1) : "—"}</td>
      <td style="padding:7px 10px;font-weight:600;color:#0D2B4E;text-align:right;">$${Number(item.total).toFixed(2)}</td>
    </tr>`).join("");

  // Build pricing summary by service type
  const types = ["AMBULATORY", "WHEELCHAIR", "STRETCHER"];
  const breakdownRows = types.map((type) => {
    const typeItems = invoice.items.filter((i) => i.serviceType === type);
    if (typeItems.length === 0) return "";
    const oneWay = typeItems.filter((i) => i.tripType === "ONE_WAY");
    const roundTrip = typeItems.filter((i) => i.tripType === "ROUND_TRIP");
    const totalMiles = typeItems.reduce((s, i) => s + (Number(i.miles) || 0), 0);
    const includedMiles = typeItems.length * INCLUDED_MILES;
    const billableMiles = Math.max(0, totalMiles - includedMiles);
    const baseRate = SERVICE_RATES[type] ?? 0;
    const baseFees = typeItems.reduce((s, i) => s + (i.tripType === "ROUND_TRIP" ? baseRate * 2 : baseRate), 0);
    const mileageCharges = billableMiles * MILEAGE_RATE;
    const lineTotal = baseFees + mileageCharges;
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

  const html = `
    <div style="font-family:Arial,sans-serif;max-width:700px;margin:0 auto;background:#fff;">
      <div style="height:5px;background:linear-gradient(90deg,#0D2B4E 0%,#F9A825 100%);"></div>
      <div style="background:#0D2B4E;padding:28px 40px;">
        <div style="display:flex;justify-content:space-between;align-items:flex-start;">
          <div>
            <div style="color:#fff;font-size:20px;font-weight:800;">HarborGrove Care &amp; Mobility, LLC</div>
            <div style="color:rgba(255,255,255,.5);font-size:12px;margin-top:2px;">Non-Emergency Medical Transportation</div>
            <div style="color:rgba(255,255,255,.4);font-size:11px;margin-top:2px;">6023 S Manzanita Way, Boise ID 83709 · 208-206-0694</div>
          </div>
          <div style="text-align:right;">
            <div style="color:rgba(255,255,255,.5);font-size:10px;text-transform:uppercase;letter-spacing:1px;">Monthly NEMT Invoice</div>
            <div style="color:#F9A825;font-size:22px;font-weight:800;">${invoice.invoiceNum}</div>
          </div>
        </div>
      </div>

      <div style="padding:20px 40px;border-bottom:1px solid #f1f5f9;display:grid;grid-template-columns:1fr 1fr;gap:20px;">
        <div>
          <div style="font-size:10px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:1px;margin-bottom:6px;">Bill To</div>
          <div style="font-size:15px;font-weight:700;color:#0D2B4E;">${billToName}</div>
          ${invoice.facility?.address ? `<div style="font-size:12px;color:#64748b;">${invoice.facility.address}</div>` : ""}
          <div style="font-size:12px;color:#64748b;">${toEmail}</div>
          ${invoice.facility?.phone ? `<div style="font-size:12px;color:#64748b;">${invoice.facility.phone}</div>` : ""}
        </div>
        <div style="text-align:right;font-size:12px;color:#64748b;">
          <div><strong style="color:#334155;">Invoice #</strong> ${invoice.invoiceNum}</div>
          <div><strong style="color:#334155;">Payment Terms</strong> ${invoice.paymentTerms}</div>
          ${periodStr ? `<div><strong style="color:#334155;">Billing Period</strong> ${periodStr}</div>` : ""}
          <div><strong style="color:#334155;">Invoice Date</strong> ${invoice.issueDate.toLocaleDateString()}</div>
          <div><strong style="color:#334155;">Due Date</strong> ${invoice.dueDate.toLocaleDateString()}</div>
        </div>
      </div>

      ${breakdownRows ? `
      <div style="padding:16px 40px;border-bottom:1px solid #f1f5f9;">
        <div style="font-size:10px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:1px;margin-bottom:8px;">Pricing Summary</div>
        <table style="width:100%;border-collapse:collapse;font-size:12px;">
          <thead><tr style="border-bottom:2px solid #0D2B4E;">
            <th style="padding:6px 10px;text-align:left;font-size:10px;color:#0D2B4E;text-transform:uppercase;">Service Type</th>
            <th style="padding:6px 10px;text-align:center;font-size:10px;color:#0D2B4E;text-transform:uppercase;">Base Rate</th>
            <th style="padding:6px 10px;text-align:center;font-size:10px;color:#0D2B4E;text-transform:uppercase;">One-Way</th>
            <th style="padding:6px 10px;text-align:center;font-size:10px;color:#0D2B4E;text-transform:uppercase;">Round Trip</th>
            <th style="padding:6px 10px;text-align:center;font-size:10px;color:#0D2B4E;text-transform:uppercase;">Base Fees</th>
            <th style="padding:6px 10px;text-align:center;font-size:10px;color:#0D2B4E;text-transform:uppercase;">Billable Miles</th>
            <th style="padding:6px 10px;text-align:right;font-size:10px;color:#0D2B4E;text-transform:uppercase;">Line Total</th>
          </tr></thead>
          <tbody>${breakdownRows}</tbody>
        </table>
      </div>` : ""}

      ${tripRows ? `
      <div style="padding:16px 40px;border-bottom:1px solid #f1f5f9;">
        <div style="font-size:10px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:1px;margin-bottom:8px;">Trip Detail Log</div>
        <table style="width:100%;border-collapse:collapse;font-size:12px;">
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
      </div>` : ""}

      <div style="padding:16px 40px;text-align:right;border-bottom:1px solid #f1f5f9;">
        <div style="display:inline-block;border-top:2px solid #0D2B4E;padding-top:10px;min-width:220px;">
          <div style="display:flex;justify-content:space-between;align-items:center;">
            <span style="font-size:15px;font-weight:700;color:#0D2B4E;">Total Due</span>
            <span style="font-size:22px;font-weight:800;color:#0D2B4E;">$${Number(invoice.total).toFixed(2)}</span>
          </div>
        </div>
      </div>

      <div style="padding:16px 40px;font-size:11px;color:#64748b;border-bottom:1px solid #f1f5f9;">
        Please make payment payable to <strong>HarborGrove Care &amp; Mobility LLC</strong>. Thank you for choosing HarborGrove Care &amp; Mobility LLC.<br/>
        Proudly Serving Boise &amp; Surrounding Areas · 208-206-0694 · harborgrovecare@gmail.com
      </div>
      <div style="height:4px;background:linear-gradient(90deg,#F9A825 0%,#0D2B4E 100%);"></div>
    </div>`;

  const { error } = await resend.emails.send({
    from: process.env.RESEND_FROM ?? "Harbor Grove Care & Mobility <onboarding@resend.dev>",
    to: toEmail,
    subject: `Invoice ${invoice.invoiceNum} — Harbor Grove Care & Mobility`,
    html,
  });

  if (error) {
    console.error("Resend error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  await prisma.invoice.update({
    where: { id },
    data: { status: "SENT", sentAt: new Date() },
  });

  return NextResponse.json({ ok: true });
}
