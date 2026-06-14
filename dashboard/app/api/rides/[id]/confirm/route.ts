import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendSms, notifyOwners } from "@/lib/sms";
import { sendEmail, notifyOwnersEmail, rideConfirmedEmail } from "@/lib/email";

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  try {
    const ride = await prisma.ride.update({
      where: { id },
      data: { confirmedAt: new Date() },
      include: { client: true },
    });

    const dt = new Date(ride.scheduledAt);
    const dateStr = dt.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
    const timeStr = dt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    const clientName = `${ride.client.firstName} ${ride.client.lastName}`;

    // Notify client
    if (ride.client.phone) {
      await sendSms(
        ride.client.phone,
        `CONFIRMED - Harbor Grove Care & Mobility\nHi ${ride.client.firstName}, your ride is confirmed.\nDate: ${dateStr} at ${timeStr}\nFrom: ${ride.pickupAddress}\nTo: ${ride.dropoffAddress}\nQuestions? Reply STOP to opt out.`
      );
    }
    if (ride.client.email) {
      await sendEmail(
        ride.client.email,
        "Your Ride is Confirmed — Harbor Grove Care & Mobility",
        rideConfirmedEmail({
          firstName: ride.client.firstName,
          dateStr,
          timeStr,
          pickup: ride.pickupAddress,
          dropoff: ride.dropoffAddress,
        })
      );
    }

    // Notify owners
    await notifyOwners(
      `RIDE CONFIRMED - HarborGrove\nClient: ${clientName}\nDate: ${dateStr} at ${timeStr}\nFrom: ${ride.pickupAddress}\nTo: ${ride.dropoffAddress}`
    );
    await notifyOwnersEmail(
      `Ride Confirmed — ${clientName}`,
      rideConfirmedEmail({
        firstName: clientName,
        dateStr,
        timeStr,
        pickup: ride.pickupAddress,
        dropoff: ride.dropoffAddress,
      })
    );

    return NextResponse.json({ ok: true, confirmedAt: ride.confirmedAt });
  } catch (err) {
    console.error("Confirm ride error:", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
