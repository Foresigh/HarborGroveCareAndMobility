export const dynamic = "force-dynamic";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import Link from "next/link";
import { BillingClaimForm } from "./BillingClaimForm";

export default async function BillingClaimPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const claim = await prisma.billingClaim.findUnique({
    where: { id },
    include: { ride: { include: { client: true } } },
  });

  if (!claim) notFound();

  return (
    <div className="max-w-xl mx-auto space-y-4">
      <Link href="/billing" className="text-sm text-blue-600 hover:underline">← Back to Billing</Link>
      <BillingClaimForm claim={claim} />
    </div>
  );
}
