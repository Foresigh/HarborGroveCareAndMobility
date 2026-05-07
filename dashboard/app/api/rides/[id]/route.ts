import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { RideStatus, RideType, BillingType } from "@/lib/generated/prisma/enums";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json();

  const ride = await prisma.ride.update({
    where: { id },
    data: {
      status: body.status as RideStatus,
      scheduledAt: body.scheduledAt ? new Date(body.scheduledAt) : undefined,
      pickupAddress: body.pickupAddress,
      dropoffAddress: body.dropoffAddress,
      rideType: body.rideType as RideType,
      billingType: body.billingType as BillingType,
      driverId: body.driverId || null,
      vehicleId: body.vehicleId || null,
      providerName: body.providerName || null,
      amount: body.amount ? parseFloat(body.amount) : null,
      notes: body.notes || null,
    },
  });

  return NextResponse.json(ride);
}
