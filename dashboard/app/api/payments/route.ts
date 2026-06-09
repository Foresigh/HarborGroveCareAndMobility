import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const DEFAULTS: Record<string, string> = {
  AMBULATORY_RATE: "35",
  WHEELCHAIR_RATE: "45",
  STRETCHER_RATE: "145",
  MILEAGE_RATE: "3.65",
  INCLUDED_MILES: "10",
};

function invoiceNum(): string {
  const now = new Date();
  const yy = String(now.getFullYear()).slice(-2);
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const rand = String(Math.floor(Math.random() * 9000) + 1000);
  return `HG-${yy}${mm}-${rand}`;
}

export async function POST(req: Request) {
  const body = await req.json();
  const { clientId, serviceType, tripType, miles, serviceDate, paymentMethod, notes } = body;

  const rows = await prisma.setting.findMany();
  const s: Record<string, string> = { ...DEFAULTS };
  for (const r of rows) s[r.key] = r.value;

  const n = (k: string, d: number) => { const x = Number(s[k]); return isNaN(x) ? d : x; };
  const baseRates: Record<string, number> = {
    AMBULATORY: n("AMBULATORY_RATE", 35),
    WHEELCHAIR: n("WHEELCHAIR_RATE", 45),
    STRETCHER:  n("STRETCHER_RATE", 145),
  };
  const mileageRate   = n("MILEAGE_RATE", 3.65);
  const includedMiles = n("INCLUDED_MILES", 10);

  const base    = baseRates[serviceType] ?? 35;
  const totalMi = Number(miles) || 0;
  const isRound = tripType === "ROUND_TRIP";
  const billableMiles = Math.max(0, totalMi - includedMiles);
  const subtotal = (isRound ? base * 2 : base) + billableMiles * mileageRate;
  const total = Math.round(subtotal * 100) / 100;

  const svcLabel =
    serviceType === "AMBULATORY" ? "Ambulatory" :
    serviceType === "WHEELCHAIR" ? "Wheelchair" : "Stretcher";
  const tripLabel = isRound ? "Round Trip" : "One-Way";

  const fullNotes = [
    paymentMethod ? `Payment: ${paymentMethod}` : null,
    notes || null,
  ].filter(Boolean).join(" | ") || null;

  const invoice = await prisma.invoice.create({
    data: {
      invoiceNum: invoiceNum(),
      clientId: clientId || null,
      dueDate: new Date(),
      subtotal: total,
      tax: 0,
      total,
      status: "PAID",
      paidAt: new Date(),
      notes: fullNotes,
      items: {
        create: [{
          description: `${svcLabel} Transport — ${tripLabel}`,
          quantity: 1,
          unitPrice: total,
          total,
          serviceType,
          tripType,
          serviceDate: serviceDate ? new Date(serviceDate) : new Date(),
          miles: totalMi > 0 ? totalMi : null,
        }],
      },
    },
    include: { client: true },
  });

  return NextResponse.json(invoice, { status: 201 });
}
