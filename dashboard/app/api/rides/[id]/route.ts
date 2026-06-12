import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { RideStatus, RideType, BillingType } from "@/lib/generated/prisma/enums";
import { sendSms } from "@/lib/sms";

const STATUS_SMS: Partial<Record<RideStatus, string>> = {
  EN_ROUTE:  "Your Harbor Grove driver is on the way. Please be ready at your pickup location.",
  PICKED_UP: "You are on your way! Thank you for riding with Harbor Grove Care & Mobility.",
  COMPLETED: "Your ride is complete. Thank you for choosing Harbor Grove Care & Mobility!",
  CANCELLED: "Your Harbor Grove ride has been cancelled. Please call us to reschedule.",
  NO_SHOW:   "We arrived but could not reach you. Please call us to reschedule your ride.",
};

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

  // SMS to client on status changes that matter to them
  if (body.status && STATUS_SMS[body.status as RideStatus]) {
    const full = await prisma.ride.findUnique({ where: { id }, include: { client: true } });
    if (full?.client?.phone) {
      await sendSms(full.client.phone, STATUS_SMS[body.status as RideStatus]!);
    }
  }

  return NextResponse.json(ride);
}
