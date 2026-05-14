import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { RideStatus, RideType, BillingType } from "@/lib/generated/prisma/enums";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const clientId = searchParams.get("clientId");
  const status = searchParams.get("status");
  const unbilled = searchParams.get("unbilled") === "true";

  const where: Record<string, unknown> = {};
  if (clientId) where.clientId = clientId;
  if (status) where.status = status as RideStatus;
  if (unbilled) where.billingClaim = null;

  const rides = await prisma.ride.findMany({
    where,
    include: { client: true, driver: true },
    orderBy: { scheduledAt: "desc" },
  });
  return NextResponse.json(rides);
}

export async function POST(req: Request) {
  const body = await req.json();
  const ride = await prisma.ride.create({
    data: {
      clientId: body.clientId,
      driverId: body.driverId || null,
      vehicleId: body.vehicleId || null,
      pickupAddress: body.pickupAddress,
      dropoffAddress: body.dropoffAddress,
      scheduledAt: new Date(body.scheduledAt),
      rideType: (body.rideType as RideType) ?? RideType.AMBULATORY,
      billingType: (body.billingType as BillingType) ?? BillingType.PRIVATE_PAY,
      providerName: body.providerName || null,
      notes: body.notes || null,
      amount: body.amount ? parseFloat(body.amount) : null,
    },
  });
  return NextResponse.json(ride, { status: 201 });
}
