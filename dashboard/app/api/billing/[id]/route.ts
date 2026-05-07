import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ClaimStatus, BillingType } from "@/lib/generated/prisma/enums";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json();

  const claim = await prisma.billingClaim.update({
    where: { id },
    data: {
      status: body.status as ClaimStatus,
      payer: body.payer as BillingType,
      claimNumber: body.claimNumber || null,
      amount: body.amount ? parseFloat(body.amount) : null,
      denialReason: body.denialReason || null,
      submittedAt: body.status === "SUBMITTED" ? new Date() : undefined,
      paidAt: body.status === "PAID" ? new Date() : undefined,
    },
  });

  return NextResponse.json(claim);
}
