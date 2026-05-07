export const dynamic = "force-dynamic";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { InvoiceStatus } from "@/lib/generated/prisma/enums";

const statusColor: Record<InvoiceStatus, string> = {
  DRAFT: "bg-slate-100 text-slate-600",
  SENT: "bg-blue-100 text-blue-700",
  PAID: "bg-emerald-100 text-emerald-700",
  OVERDUE: "bg-rose-100 text-rose-700",
};

export default async function InvoicesPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const params = await searchParams;

  const invoices = await prisma.invoice.findMany({
    where: params.status ? { status: params.status as InvoiceStatus } : {},
    include: { client: true, items: true },
    orderBy: { createdAt: "desc" },
  });

  const counts = await prisma.invoice.groupBy({ by: ["status"], _count: true });
  const countMap = Object.fromEntries(counts.map((c) => [c.status, c._count]));

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2 items-center justify-between">
        <div className="flex gap-2 flex-wrap">
          {(["DRAFT", "SENT", "PAID", "OVERDUE"] as InvoiceStatus[]).map((s) => (
            <Link
              key={s}
              href={`/invoices?status=${s}`}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${params.status === s ? "bg-slate-800 text-white border-slate-800" : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"}`}
            >
              {s} ({countMap[s] ?? 0})
            </Link>
          ))}
        </div>
        <Link href="/invoices/new" className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold px-4 py-2 rounded-lg transition-colors">
          + New Invoice
        </Link>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50">
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Invoice #</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Client</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide hidden md:table-cell">Issue Date</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide hidden md:table-cell">Due Date</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Total</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Status</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {invoices.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-10 text-center text-slate-400">
                  No invoices yet. <Link href="/invoices/new" className="text-blue-600 underline">Create one</Link>
                </td>
              </tr>
            ) : (
              invoices.map((inv) => (
                <tr key={inv.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-3 font-mono text-slate-700 font-medium">{inv.invoiceNum}</td>
                  <td className="px-4 py-3 font-medium text-slate-800">{inv.client.firstName} {inv.client.lastName}</td>
                  <td className="px-4 py-3 text-slate-600 hidden md:table-cell">{inv.issueDate.toLocaleDateString()}</td>
                  <td className="px-4 py-3 hidden md:table-cell">
                    <span className={inv.status === "OVERDUE" ? "text-rose-600 font-medium" : "text-slate-600"}>
                      {inv.dueDate.toLocaleDateString()}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-semibold text-slate-800">${Number(inv.total).toFixed(2)}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${statusColor[inv.status]}`}>
                      {inv.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <Link href={`/invoices/${inv.id}`} className="text-xs text-blue-600 hover:underline">View</Link>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
