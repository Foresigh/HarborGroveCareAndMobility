import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { ClaimStatus } from "@/lib/generated/prisma/enums";

const statusColor: Record<ClaimStatus, string> = {
  PENDING: "bg-amber-100 text-amber-700",
  SUBMITTED: "bg-blue-100 text-blue-700",
  PAID: "bg-emerald-100 text-emerald-700",
  DENIED: "bg-rose-100 text-rose-700",
};

export default async function BillingPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const params = await searchParams;

  const claims = await prisma.billingClaim.findMany({
    where: params.status ? { status: params.status as ClaimStatus } : {},
    include: { ride: { include: { client: true } } },
    orderBy: { createdAt: "desc" },
  });

  const counts = await prisma.billingClaim.groupBy({
    by: ["status"],
    _count: true,
  });
  const countMap = Object.fromEntries(counts.map((c: { status: string; _count: number }) => [c.status, c._count]));

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {(["PENDING", "SUBMITTED", "PAID", "DENIED"] as ClaimStatus[]).map((s) => (
          <Link
            key={s}
            href={`/billing?status=${s}`}
            className={`bg-white rounded-xl border p-4 hover:shadow-md transition-shadow ${params.status === s ? "border-blue-400 ring-2 ring-blue-200" : "border-slate-200"}`}
          >
            <div className="text-2xl font-bold text-slate-800">{countMap[s] ?? 0}</div>
            <div className={`mt-1 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${statusColor[s]}`}>{s}</div>
          </Link>
        ))}
      </div>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50">
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Client</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide hidden md:table-cell">Ride Date</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Payer</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide hidden lg:table-cell">Claim #</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Amount</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Status</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {claims.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-10 text-center text-slate-400">No billing claims found</td>
              </tr>
            ) : (
              claims.map((claim) => (
                <tr key={claim.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-3 font-medium text-slate-800">
                    {claim.ride.client.firstName} {claim.ride.client.lastName}
                  </td>
                  <td className="px-4 py-3 text-slate-600 hidden md:table-cell">
                    {claim.ride.scheduledAt.toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3 text-slate-600">{claim.payer.replace("_", " ")}</td>
                  <td className="px-4 py-3 text-slate-600 hidden lg:table-cell">{claim.claimNumber ?? "—"}</td>
                  <td className="px-4 py-3 text-slate-800 font-medium">
                    {claim.amount ? `$${Number(claim.amount).toFixed(2)}` : "—"}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${statusColor[claim.status]}`}>
                      {claim.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <Link href={`/billing/${claim.id}`} className="text-xs text-blue-600 hover:underline">Edit</Link>
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
