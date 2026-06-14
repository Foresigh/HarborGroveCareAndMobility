import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { RideStatus, RideType, BillingType } from "@/lib/generated/prisma/enums";
import { sendSms } from "@/lib/sms";
import { notifyOwnersEmail, rideRequestOwnerEmail, sendEmail, rideConfirmedEmail } from "@/lib/email";

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
  // SMS confirmation to client
  const client = await prisma.client.findUnique({ where: { id: ride.clientId } });
  if (client?.phone) {
    const dt = new Date(ride.scheduledAt);
    const dateStr = dt.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
    const timeStr = dt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    await sendSms(
      client.phone,
      `CONFIRMED - Harbor Grove Care & Mobility\nHi ${client.firstName}, your ride is confirmed.\nDate: ${dateStr} at ${timeStr}\nFrom: ${ride.pickupAddress}\nTo: ${ride.dropoffAddress}\nQuestions? Reply STOP to opt out.`
    );
  }

  const dateStr = new Date(ride.scheduledAt).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
  const timeStr = new Date(ride.scheduledAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  if (client) {
    // Email owner
    await notifyOwnersEmail(
      `Ride Booked — ${client.firstName} ${client.lastName}`,
      rideRequestOwnerEmail({
        firstName: client.firstName, lastName: client.lastName, phone: client.phone ?? "",
        dateStr, timeStr, pickup: ride.pickupAddress, dropoff: ride.dropoffAddress, rideId: ride.id,
      })
    );
    // Email client confirmation
    if (client.email) {
      await sendEmail(
        client.email,
        "Your Ride is Confirmed — Harbor Grove Care & Mobility",
        rideConfirmedEmail({ firstName: client.firstName, dateStr, timeStr, pickup: ride.pickupAddress, dropoff: ride.dropoffAddress })
      );
    }
  }

  return NextResponse.json(ride, { status: 201 });
}
