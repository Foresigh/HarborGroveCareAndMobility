import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT ?? 587),
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
  connectionTimeout: 10000,
  greetingTimeout: 10000,
  socketTimeout: 15000,
});

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const invoice = await prisma.invoice.findUnique({
    where: { id },
    include: { client: true, items: true },
  });

  if (!invoice) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (!invoice.client.email) return NextResponse.json({ error: "Client has no email" }, { status: 400 });

  const itemRows = invoice.items
    .map(
      (item) =>
        `<tr>
          <td style="padding:8px 12px;border-bottom:1px solid #eee;">${item.description}</td>
          <td style="padding:8px 12px;border-bottom:1px solid #eee;text-align:center;">${item.quantity}</td>
          <td style="padding:8px 12px;border-bottom:1px solid #eee;text-align:right;">$${Number(item.unitPrice).toFixed(2)}</td>
          <td style="padding:8px 12px;border-bottom:1px solid #eee;text-align:right;">$${Number(item.total).toFixed(2)}</td>
        </tr>`
    )
    .join("");

  const html = `
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#fff;">
      <div style="background:#0D2B4E;padding:32px 40px;">
        <h1 style="color:#fff;margin:0;font-size:24px;">Harbor Grove Care & Mobility</h1>
        <p style="color:rgba(255,255,255,.6);margin:4px 0 0;font-size:13px;">Non-Emergency Medical Transportation</p>
      </div>
      <div style="padding:32px 40px;">
        <div style="display:flex;justify-content:space-between;margin-bottom:24px;">
          <div>
            <div style="font-size:12px;color:#888;text-transform:uppercase;letter-spacing:1px;">Invoice</div>
            <div style="font-size:22px;font-weight:700;color:#0D2B4E;">${invoice.invoiceNum}</div>
          </div>
          <div style="text-align:right;">
            <div style="font-size:12px;color:#888;">Issue Date: ${invoice.issueDate.toLocaleDateString()}</div>
            <div style="font-size:12px;color:#888;">Due Date: ${invoice.dueDate.toLocaleDateString()}</div>
          </div>
        </div>
        <div style="margin-bottom:24px;">
          <div style="font-size:12px;color:#888;text-transform:uppercase;letter-spacing:1px;margin-bottom:4px;">Bill To</div>
          <div style="font-weight:600;color:#1a1a2e;">${invoice.client.firstName} ${invoice.client.lastName}</div>
          <div style="color:#555;font-size:14px;">${invoice.client.email}</div>
          <div style="color:#555;font-size:14px;">${invoice.client.phone}</div>
        </div>
        <table style="width:100%;border-collapse:collapse;margin-bottom:24px;">
          <thead>
            <tr style="background:#f8fafc;">
              <th style="padding:10px 12px;text-align:left;font-size:12px;color:#888;text-transform:uppercase;letter-spacing:1px;">Description</th>
              <th style="padding:10px 12px;text-align:center;font-size:12px;color:#888;text-transform:uppercase;letter-spacing:1px;">Qty</th>
              <th style="padding:10px 12px;text-align:right;font-size:12px;color:#888;text-transform:uppercase;letter-spacing:1px;">Unit Price</th>
              <th style="padding:10px 12px;text-align:right;font-size:12px;color:#888;text-transform:uppercase;letter-spacing:1px;">Total</th>
            </tr>
          </thead>
          <tbody>${itemRows}</tbody>
          <tfoot>
            <tr>
              <td colspan="3" style="padding:12px;text-align:right;font-weight:700;color:#0D2B4E;">Total Due</td>
              <td style="padding:12px;text-align:right;font-weight:700;font-size:18px;color:#0D2B4E;">$${Number(invoice.total).toFixed(2)}</td>
            </tr>
          </tfoot>
        </table>
        ${invoice.notes ? `<div style="background:#f8fafc;border-radius:8px;padding:16px;margin-bottom:24px;font-size:14px;color:#555;">${invoice.notes}</div>` : ""}
        <div style="font-size:13px;color:#888;text-align:center;">
          Questions? Contact us at <a href="tel:2082973601" style="color:#1565C0;">208-297-3601</a> or <a href="mailto:harborgrovecare@gmail.com" style="color:#1565C0;">harborgrovecare@gmail.com</a>
        </div>
      </div>
      <div style="background:#0D2B4E;padding:20px 40px;text-align:center;">
        <p style="color:rgba(255,255,255,.4);font-size:12px;margin:0;">© 2026 Harbor Grove Care & Mobility LLC · Meridian, ID 83642</p>
      </div>
    </div>
  `;

  try {
    await transporter.sendMail({
      from: process.env.SMTP_FROM,
      to: invoice.client.email,
      subject: `Invoice ${invoice.invoiceNum} — Harbor Grove Care & Mobility`,
      html,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "SMTP error";
    console.error("sendMail error:", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }

  await prisma.invoice.update({
    where: { id },
    data: { status: "SENT", sentAt: new Date() },
  });

  return NextResponse.json({ ok: true });
}
