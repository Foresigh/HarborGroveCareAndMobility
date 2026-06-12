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

  const isPaid     = invoice.status === "PAID";
  const total      = Number(invoice.total);
  const item       = invoice.items[0];
  const clientName = invoice.client
    ? `${invoice.client.firstName} ${invoice.client.lastName}`
    : null;

  return (
    <div style={{ fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif", background: "#f1f5f9", minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
      <div style={{ background: "#fff", borderRadius: 20, boxShadow: "0 4px 24px rgba(0,0,0,0.08)", maxWidth: 420, width: "100%", overflow: "hidden" }}>

        {/* Header */}
        <div style={{ background: "#0D2B4E", padding: "28px 32px 24px", textAlign: "center" }}>
          <div style={{ color: "#F9A825", fontSize: 13, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase" }}>Harbor Grove</div>
          <div style={{ color: "#fff", fontSize: 18, fontWeight: 700, marginTop: 4 }}>Care &amp; Mobility</div>
        </div>

        {/* Body */}
        <div style={{ padding: 32 }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.06em" }}>Amount Due</div>
          <div style={{ fontSize: 48, fontWeight: 800, color: "#0D2B4E", lineHeight: 1, margin: "8px 0 4px" }}>${total.toFixed(2)}</div>
          <div style={{ fontSize: 13, color: "#94a3b8", fontFamily: "monospace" }}>Invoice {invoiceNum}</div>

          <hr style={{ border: "none", borderTop: "1px solid #f1f5f9", margin: "24px 0" }} />

          {clientName && (
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 14, marginBottom: 10 }}>
              <span style={{ color: "#64748b" }}>Client</span>
              <span style={{ color: "#1e293b", fontWeight: 500 }}>{clientName}</span>
            </div>
          )}
          {item?.description && (
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 14, marginBottom: 10 }}>
              <span style={{ color: "#64748b" }}>Service</span>
              <span style={{ color: "#1e293b", fontWeight: 500, textAlign: "right", maxWidth: 220 }}>{item.description}</span>
            </div>
          )}
          {item?.serviceDate && (
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 14, marginBottom: 10 }}>
              <span style={{ color: "#64748b" }}>Date</span>
              <span style={{ color: "#1e293b", fontWeight: 500 }}>
                {new Date(item.serviceDate).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}
              </span>
            </div>
          )}
          {item?.miles != null && (
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 14, marginBottom: 10 }}>
              <span style={{ color: "#64748b" }}>Miles</span>
              <span style={{ color: "#1e293b", fontWeight: 500 }}>{Number(item.miles).toFixed(1)} mi</span>
            </div>
          )}

          {isPaid ? (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, background: "#d1fae5", color: "#065f46", fontSize: 15, fontWeight: 700, borderRadius: 12, padding: 14, marginTop: 28 }}>
              <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>
              Payment Complete — Thank you!
            </div>
          ) : invoice.stripeUrl ? (
            <>
              <a href={invoice.stripeUrl} style={{ display: "block", width: "100%", background: "#F9A825", color: "#0D2B4E", fontSize: 16, fontWeight: 800, border: "none", borderRadius: 12, padding: 16, cursor: "pointer", textDecoration: "none", textAlign: "center", marginTop: 28, boxSizing: "border-box" }}>
                Pay ${total.toFixed(2)} Securely
              </a>
              <div style={{ textAlign: "center", fontSize: 11, color: "#94a3b8", marginTop: 12 }}>
                Secured by <span style={{ fontWeight: 700, color: "#635bff" }}>Stripe</span> · SSL encrypted
              </div>
            </>
          ) : (
            <div style={{ marginTop: 28, padding: 16, background: "#fef9ec", borderRadius: 12, fontSize: 14, color: "#92400e", textAlign: "center" }}>
              Payment link is no longer active. Please contact us.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
