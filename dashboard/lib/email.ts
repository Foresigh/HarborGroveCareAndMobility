import { Resend } from "resend";

function getResend() {
  return new Resend(process.env.RESEND_API_KEY);
}

const FROM = process.env.RESEND_FROM ?? "Harbor Grove <noreply@harborgrovecareandmobility.com>";
const OWNER_EMAIL = process.env.NOTIFY_EMAIL ?? "";

function ownerEmails(): string[] {
  return OWNER_EMAIL.split(",").map((e) => e.trim()).filter(Boolean);
}

export async function sendEmail(to: string, subject: string, html: string): Promise<void> {
  if (!process.env.RESEND_API_KEY || !to) return;
  try {
    const { error } = await getResend().emails.send({ from: FROM, to, subject, html });
    if (error) console.error(`Email FAILED to ${to} — ${error.message}`);
    else console.log(`Email sent to ${to} — "${subject}"`);
  } catch (err) {
    console.error(`Email exception to ${to}:`, err);
  }
}

export async function notifyOwnersEmail(subject: string, html: string): Promise<void> {
  const emails = ownerEmails();
  await Promise.all(emails.map((e) => sendEmail(e, subject, html)));
}

// ── Reusable HTML wrapper ────────────────────────────────────────────────────
function layout(body: string): string {
  return `<!DOCTYPE html><html><body style="margin:0;padding:0;background:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:32px 16px;">
<table width="520" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,.08);">
  <tr><td style="background:#0D2B4E;padding:24px 32px;text-align:center;">
    <div style="color:#F9A825;font-size:12px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;">Harbor Grove</div>
    <div style="color:#fff;font-size:18px;font-weight:700;margin-top:4px;">Care &amp; Mobility</div>
  </td></tr>
  <tr><td style="padding:32px;">${body}</td></tr>
  <tr><td style="padding:16px 32px 24px;text-align:center;font-size:11px;color:#94a3b8;">
    Harbor Grove Care &amp; Mobility · Boise, ID<br>
    <a href="https://www.harborgrovecareandmobility.com" style="color:#94a3b8;">www.harborgrovecareandmobility.com</a>
  </td></tr>
</table></td></tr></table></body></html>`;
}

function row(label: string, value: string): string {
  return `<tr><td style="padding:6px 0;font-size:13px;color:#64748b;width:130px;">${label}</td><td style="padding:6px 0;font-size:13px;color:#1e293b;font-weight:500;">${value}</td></tr>`;
}

// ── Emails sent to clients ───────────────────────────────────────────────────
export function rideConfirmedEmail(opts: {
  firstName: string; dateStr: string; timeStr: string;
  pickup: string; dropoff: string;
}): string {
  return layout(`
    <h2 style="margin:0 0 8px;font-size:20px;color:#0D2B4E;">Ride Confirmed ✓</h2>
    <p style="margin:0 0 24px;font-size:14px;color:#64748b;">Hi ${opts.firstName}, your ride is confirmed. See details below.</p>
    <table cellpadding="0" cellspacing="0" style="width:100%;border-top:1px solid #f1f5f9;">
      ${row("Date", opts.dateStr)}
      ${row("Time", opts.timeStr)}
      ${row("Pickup", opts.pickup)}
      ${row("Drop-off", opts.dropoff)}
    </table>
    <p style="margin:24px 0 0;font-size:13px;color:#94a3b8;">Questions? Call us or reply to this email.</p>
  `);
}

export function rideRequestClientEmail(opts: {
  firstName: string; dateStr: string; timeStr: string;
  pickup: string; dropoff: string;
}): string {
  return layout(`
    <h2 style="margin:0 0 8px;font-size:20px;color:#0D2B4E;">We Received Your Request</h2>
    <p style="margin:0 0 24px;font-size:14px;color:#64748b;">Hi ${opts.firstName}, we received your ride request. We will review it and reach out to you shortly to confirm.</p>
    <table cellpadding="0" cellspacing="0" style="width:100%;border-top:1px solid #f1f5f9;">
      ${row("Date", opts.dateStr)}
      ${row("Time", opts.timeStr)}
      ${row("Pickup", opts.pickup)}
      ${row("Drop-off", opts.dropoff)}
    </table>
    <p style="margin:24px 0 0;font-size:13px;color:#94a3b8;">Questions? Call us or reply to this email.</p>
  `);
}

export function rideStatusEmail(opts: { firstName: string; status: string; message: string }): string {
  return layout(`
    <h2 style="margin:0 0 8px;font-size:20px;color:#0D2B4E;">Ride Update</h2>
    <p style="margin:0 0 16px;font-size:14px;color:#64748b;">Hi ${opts.firstName},</p>
    <p style="margin:0 0 24px;font-size:15px;color:#1e293b;">${opts.message}</p>
    <p style="margin:0;font-size:13px;color:#94a3b8;">Thank you for riding with Harbor Grove Care &amp; Mobility.</p>
  `);
}

export function rideRequestOwnerEmail(opts: {
  firstName: string; lastName: string; phone: string;
  dateStr: string; timeStr: string; pickup: string; dropoff: string;
  mobility?: string; notes?: string; rideId: string;
}): string {
  const appUrl = (process.env.NEXT_PUBLIC_APP_URL ?? "https://dashboard.harborgrovecareandmobility.com").replace(/\/$/, "");
  return layout(`
    <h2 style="margin:0 0 8px;font-size:20px;color:#0D2B4E;">New Ride Request</h2>
    <p style="margin:0 0 24px;font-size:14px;color:#64748b;">A new ride has been requested. Review and confirm below.</p>
    <table cellpadding="0" cellspacing="0" style="width:100%;border-top:1px solid #f1f5f9;">
      ${row("Name", `${opts.firstName} ${opts.lastName}`)}
      ${row("Phone", opts.phone)}
      ${row("Date", opts.dateStr)}
      ${row("Time", opts.timeStr)}
      ${row("Pickup", opts.pickup)}
      ${row("Drop-off", opts.dropoff)}
      ${opts.mobility ? row("Mobility", opts.mobility) : ""}
      ${opts.notes ? row("Notes", opts.notes) : ""}
    </table>
    <a href="${appUrl}/rides/${opts.rideId}" style="display:inline-block;margin-top:24px;background:#0D2B4E;color:#fff;font-weight:700;font-size:14px;padding:12px 24px;border-radius:10px;text-decoration:none;">View Ride →</a>
  `);
}

export function paymentReceivedOwnerEmail(opts: {
  invoiceNum: string; total: number; clientName?: string;
}): string {
  return layout(`
    <h2 style="margin:0 0 8px;font-size:20px;color:#0D2B4E;">Payment Received 💰</h2>
    <p style="margin:0 0 24px;font-size:14px;color:#64748b;">A payment has been completed.</p>
    <table cellpadding="0" cellspacing="0" style="width:100%;border-top:1px solid #f1f5f9;">
      ${row("Invoice", opts.invoiceNum)}
      ${opts.clientName ? row("Client", opts.clientName) : ""}
      ${row("Amount", `$${opts.total.toFixed(2)}`)}
    </table>
  `);
}
