import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { BillingType } from "@/lib/generated/prisma/enums";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json();

  const client = await prisma.client.update({
    where: { id },
    data: {
      firstName: body.firstName,
      lastName: body.lastName,
      phone: body.phone,
      email: body.email || null,
      dob: body.dob ? new Date(body.dob) : null,
      address: body.address || null,
      city: body.city || null,
      zip: body.zip || null,
      medicaidId: body.medicaidId || null,
      insuranceId: body.insuranceId || null,
      billingType: body.billingType as BillingType,
      mobilityNeeds: body.mobilityNeeds || null,
      specialNotes: body.specialNotes || null,
      emergencyName: body.emergencyName || null,
      emergencyPhone: body.emergencyPhone || null,
    },
  });

  return NextResponse.json(client);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await prisma.client.update({ where: { id }, data: { active: false } });
  return NextResponse.json({ ok: true });
}
