export const dynamic = "force-dynamic";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ClientEditForm } from "./ClientEditForm";

export default async function ClientDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const client = await prisma.client.findUnique({
    where: { id },
    include: {
      rides: { orderBy: { scheduledAt: "desc" }, take: 10, include: { driver: true } },
    },
  });

  if (!client) notFound();

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      <Link href="/clients" className="text-sm text-blue-600 hover:underline">← Back to Clients</Link>
      <ClientEditForm client={client} />

      {/* Recent rides */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-100 bg-slate-50">
          <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Recent Rides</h3>
        </div>
        {client.rides.length === 0 ? (
          <div className="px-4 py-8 text-center text-sm text-slate-400">No rides yet</div>
        ) : (
          <table className="w-full text-sm">
            <tbody className="divide-y divide-slate-100">
              {client.rides.map((r) => (
                <tr key={r.id} className="hover:bg-slate-50">
                  <td className="px-4 py-2.5 text-slate-600">{new Date(r.scheduledAt).toLocaleDateString()}</td>
                  <td className="px-4 py-2.5 text-slate-700 truncate max-w-[160px]">{r.pickupAddress}</td>
                  <td className="px-4 py-2.5 text-slate-500 hidden md:table-cell">{r.driver ? `${r.driver.firstName} ${r.driver.lastName}` : "Unassigned"}</td>
                  <td className="px-4 py-2.5">
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-600">{r.status.replace("_", " ")}</span>
                  </td>
                  <td className="px-4 py-2.5">
                    <Link href={`/rides/${r.id}`} className="text-xs text-blue-600 hover:underline">View</Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
