export const dynamic = "force-dynamic";
import Link from "next/link";
import { prisma } from "@/lib/prisma";

export default async function PaymentSuccessPage({ searchParams }: { searchParams: Promise<{ invoice?: string }> }) {
  const { invoice: invoiceNum } = await searchParams;

  const invoice = invoiceNum
    ? await prisma.invoice.findFirst({
        where: { invoiceNum },
        include: { client: true },
      })
    : null;

  return (
    <div className="max-w-md mx-auto mt-12">
      <div className="bg-white rounded-2xl border border-slate-200 p-10 text-center shadow-sm">
        <div style={{ width: 56, height: 56, borderRadius: "50%", background: "#d1fae5", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px" }}>
          <svg viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2.5" width="28" height="28"><path d="M20 6L9 17l-5-5"/></svg>
        </div>
        <h2 className="text-xl font-bold text-slate-800 mb-1">Payment Complete</h2>
        <p className="text-sm text-slate-500 mb-6">The card was charged successfully.</p>

        {invoice && (
          <div className="bg-slate-50 rounded-xl p-5 text-left space-y-2 mb-6">
            <div className="flex justify-between text-sm">
              <span className="text-slate-500">Invoice #</span>
              <span className="font-mono font-semibold text-slate-800">{invoice.invoiceNum}</span>
            </div>
            {invoice.client && (
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">Client</span>
                <span className="font-medium text-slate-700">{invoice.client.firstName} {invoice.client.lastName}</span>
              </div>
            )}
            <div className="flex justify-between text-sm">
              <span className="text-slate-500">Amount</span>
              <span className="font-bold text-green-600">${Number(invoice.total).toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-500">Status</span>
              <span className="text-xs font-semibold bg-green-100 text-green-700 px-2 py-0.5 rounded-full">PAID</span>
            </div>
          </div>
        )}

        <div className="flex gap-3">
          <Link href="/payments/new"
            className="flex-1 border border-slate-200 text-slate-700 font-medium py-2.5 rounded-lg text-sm hover:bg-slate-50 transition text-center">
            New Payment
          </Link>
          <Link href="/invoices"
            className="flex-1 text-white font-semibold py-2.5 rounded-lg text-sm hover:opacity-90 transition text-center"
            style={{ background: "#0D2B4E" }}>
            View Invoices
          </Link>
        </div>
      </div>
    </div>
  );
}
