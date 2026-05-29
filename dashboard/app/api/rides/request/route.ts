import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { RideType } from "@/lib/generated/prisma/enums";
import twilio from "twilio";

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

    // Find or create client by phone
    let client = await prisma.client.findFirst({ where: { phone } });
    if (!client) {
      client = await prisma.client.create({
        data: {
          firstName,
          lastName,
          phone,
          mobilityNeeds: mobility || null,
          billingType: "PRIVATE_PAY",
        },
      });
    }

    // Build scheduledAt — default to 09:00 if no time provided
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
        notes: notes || null,
        status: "SCHEDULED",
      },
    });

    await prisma.notification.create({
      data: {
        title: "New Ride Request",
        message: `${firstName} ${lastName} requested a ride on ${new Date(scheduledAt).toLocaleDateString()} at ${new Date(scheduledAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`,
        type: "INFO",
        link: `/rides/${ride.id}`,
      },
    });

    // Send SMS notification to owner
    const sid = process.env.TWILIO_ACCOUNT_SID;
    const token = process.env.TWILIO_AUTH_TOKEN;
    const from = process.env.TWILIO_FROM;
    const to = process.env.NOTIFY_PHONE;

    if (sid && token && from && to) {
      try {
        const apptDate = new Date(scheduledAt).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
        const apptTime = new Date(scheduledAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
        const smsBody = [
          `NEW RIDE REQUEST - HarborGrove`,
          `Name: ${firstName} ${lastName}`,
          `Phone: ${phone}`,
          `Date: ${apptDate} at ${apptTime}`,
          `From: ${pickup}`,
          `To: ${destination}`,
          mobility ? `Mobility: ${mobility}` : null,
          notes ? `Notes: ${notes}` : null,
        ].filter(Boolean).join("\n");

        const client = twilio(sid, token);
        await client.messages.create({ body: smsBody, from, to });
      } catch (smsErr) {
        console.error("Twilio SMS error:", smsErr);
      }
    }

    return NextResponse.json({ success: true, rideId: ride.id }, { headers: CORS });
  } catch (err) {
    console.error("Ride request error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500, headers: CORS });
  }
}
