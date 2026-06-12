export const dynamic = "force-dynamic";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";

export default async function PayPage({ params }: { params: Promise<{ invoiceNum: string }> }) {
  const { invoiceNum } = await params;

  const invoice = await prisma.invoice.findFirst({
    where: { invoiceNum },
    include: { client: true, items: true },
  });

  if (!invoice) notFound();

  const isPaid   = invoice.status === "PAID";
  const total    = Number(invoice.total);
  const item     = invoice.items[0];
  const clientName = invoice.client ? `${invoice.client.firstName} ${invoice.client.lastName}` : null;

  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>Pay Invoice {invoiceNum} — Harbor Grove Care & Mobility</title>
        <style>{`
          * { box-sizing: border-box; margin: 0; padding: 0; }
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #f1f5f9; min-height: 100vh; display: flex; align-items: center; justify-content: center; padding: 24px; }
          .card { background: #fff; border-radius: 20px; box-shadow: 0 4px 24px rgba(0,0,0,0.08); max-width: 420px; width: 100%; overflow: hidden; }
          .header { background: #0D2B4E; padding: 28px 32px 24px; text-align: center; }
          .logo-text { color: #F9A825; font-size: 13px; font-weight: 700; letter-spacing: 0.06em; text-transform: uppercase; }
          .company { color: #fff; font-size: 18px; font-weight: 700; margin-top: 4px; }
          .body { padding: 32px; }
          .label { font-size: 11px; font-weight: 600; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.06em; }
          .amount { font-size: 48px; font-weight: 800; color: #0D2B4E; line-height: 1; margin: 8px 0 4px; }
          .invoice-num { font-size: 13px; color: #94a3b8; font-family: monospace; }
          .divider { border: none; border-top: 1px solid #f1f5f9; margin: 24px 0; }
          .row { display: flex; justify-content: space-between; font-size: 14px; margin-bottom: 10px; }
          .row-label { color: #64748b; }
          .row-value { color: #1e293b; font-weight: 500; text-align: right; max-width: 220px; }
          .pay-btn { display: block; width: 100%; background: #F9A825; color: #0D2B4E; font-size: 16px; font-weight: 800; border: none; border-radius: 12px; padding: 16px; cursor: pointer; text-decoration: none; text-align: center; margin-top: 28px; transition: opacity 0.15s; }
          .pay-btn:hover { opacity: 0.9; }
          .paid-badge { display: flex; align-items: center; justify-content: center; gap: 8px; background: #d1fae5; color: #065f46; font-size: 15px; font-weight: 700; border-radius: 12px; padding: 14px; margin-top: 28px; }
          .secure { text-align: center; font-size: 11px; color: #94a3b8; margin-top: 14px; }
          .stripe-logo { display: inline-block; margin-left: 4px; font-weight: 700; color: #635bff; }
        `}</style>
      </head>
      <body>
        <div className="card">
          <div className="header">
            <div className="logo-text">Harbor Grove</div>
            <div className="company">Care &amp; Mobility</div>
          </div>
          <div className="body">
            <div className="label">Amount Due</div>
            <div className="amount">${total.toFixed(2)}</div>
            <div className="invoice-num">Invoice {invoiceNum}</div>

            <hr className="divider" />

            {clientName && (
              <div className="row">
                <span className="row-label">Client</span>
                <span className="row-value">{clientName}</span>
              </div>
            )}
            {item?.description && (
              <div className="row">
                <span className="row-label">Service</span>
                <span className="row-value">{item.description}</span>
              </div>
            )}
            {item?.serviceDate && (
              <div className="row">
                <span className="row-label">Date</span>
                <span className="row-value">{new Date(item.serviceDate).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}</span>
              </div>
            )}
            {item?.miles != null && (
              <div className="row">
                <span className="row-label">Miles</span>
                <span className="row-value">{Number(item.miles).toFixed(1)} mi</span>
              </div>
            )}

            {isPaid ? (
              <div className="paid-badge">
                <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>
                Payment Complete — Thank you!
              </div>
            ) : invoice.stripeUrl ? (
              <>
                <a href={invoice.stripeUrl} className="pay-btn">Pay ${total.toFixed(2)} Securely</a>
                <div className="secure">Secured by<span className="stripe-logo">Stripe</span> · SSL encrypted</div>
              </>
            ) : (
              <div style={{ marginTop: 28, padding: 16, background: "#fef9ec", borderRadius: 12, fontSize: 14, color: "#92400e", textAlign: "center" }}>
                Payment link is no longer active. Please contact us.
              </div>
            )}
          </div>
        </div>
      </body>
    </html>
  );
}
