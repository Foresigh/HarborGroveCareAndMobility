import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { RideType } from "@/lib/generated/prisma/enums";
import { sendSms, notifyOwners } from "@/lib/sms";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS });
}

function mobilityToRideType(mobility: string): RideType {
  if (mobility === "Wheelchair") return RideType.WHEELCHAIR;
  if (mobility === "Stretcher / Gurney") return RideType.STRETCHER;
  return RideType.AMBULATORY;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { firstName, lastName, phone, date, time, pickup, destination, mobility, notes } = body;

    if (!firstName || !lastName || !phone || !date || !pickup || !destination) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400, headers: CORS });
    }

    // Find or create client by phone — always use the name submitted in the form
    let client = await prisma.client.findFirst({ where: { phone } });
    let nameChanged = false;
    let previousName = "";
    if (!client) {
      client = await prisma.client.create({
        data: { firstName, lastName, phone, mobilityNeeds: mobility || null, billingType: "PRIVATE_PAY" },
      });
    } else {
      const existingName = `${client.firstName} ${client.lastName}`.trim();
      const submittedName = `${firstName} ${lastName}`.trim();
      if (existingName.toLowerCase() !== submittedName.toLowerCase()) {
        nameChanged = true;
        previousName = existingName;
      }
      client = await prisma.client.update({
        where: { id: client.id },
        data: { firstName, lastName, mobilityNeeds: mobility || client.mobilityNeeds },
      });
    }

    const [year, month, day] = date.split("-").map(Number);
    const [hour, minute] = (time || "09:00").split(":").map(Number);
    const scheduledAt = new Date(year, month - 1, day, hour, minute);

    const ride = await prisma.ride.create({
      data: {
        clientId: client.id,
        pickupAddress: pickup,
        dropoffAddress: destination,
        scheduledAt,
        rideType: mobilityToRideType(mobility || ""),
        billingType: "PRIVATE_PAY",
        notes: [notes, nameChanged ? `⚠️ Name changed from "${previousName}" to "${firstName} ${lastName}"` : null].filter(Boolean).join("\n") || null,
        status: "SCHEDULED",
      },
    });

    await prisma.notification.create({
      data: {
        title: "New Ride Request",
        message: `${firstName} ${lastName} requested a ride on ${scheduledAt.toLocaleDateString()} at ${scheduledAt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`,
        type: "INFO",
        link: `/rides/${ride.id}`,
      },
    });

    // SMS to owner
    const dateStr = scheduledAt.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
    const timeStr = scheduledAt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    const ownerMsg = [
      `NEW RIDE REQUEST - HarborGrove`,
      `Name: ${firstName} ${lastName}`,
      `Phone: ${phone}`,
      `Date: ${dateStr} at ${timeStr}`,
      `From: ${pickup}`,
      `To: ${destination}`,
      mobility ? `Mobility: ${mobility}` : null,
      notes ? `Notes: ${notes}` : null,
    ].filter(Boolean).join("\n");

    await notifyOwners(ownerMsg);

    // SMS confirmation to client
    await sendSms(
      phone,
      `REQUEST RECEIVED - Harbor Grove Care & Mobility\nHi ${firstName}, we received your ride request for ${dateStr} at ${timeStr}. We will confirm shortly.\nQuestions? Reply STOP to opt out.`
    );

    return NextResponse.json({ success: true, rideId: ride.id }, { headers: CORS });
  } catch (err) {
    console.error("Ride request error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500, headers: CORS });
  }
}
