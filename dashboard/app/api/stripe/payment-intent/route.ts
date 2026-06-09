import { NextResponse } from "next/server";
import Stripe from "stripe";
import { prisma } from "@/lib/prisma";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY ?? "", { apiVersion: "2026-05-27.dahlia" });

const DEFAULTS: Record<string, string> = {
  AMBULATORY_RATE: "35", WHEELCHAIR_RATE: "45", STRETCHER_RATE: "145",
  MILEAGE_RATE: "3.65", INCLUDED_MILES: "10",
};

function invoiceNum() {
  const now = new Date();
  const yy = String(now.getFullYear()).slice(-2);
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  return `HG-${yy}${mm}-${String(Math.floor(Math.random() * 9000) + 1000)}`;
}

export async function POST(req: Request) {
  const body = await req.json();
  const { clientId, serviceType, tripType, miles, serviceDate, notes } = body;

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
  const totalMi = (miles !== null && miles !== undefined && miles !== "") ? Math.max(0, Number(miles) || 0) : 0;
  const isRound = tripType === "ROUND_TRIP";
  const billable = Math.max(0, totalMi - includedMiles);
  const total    = Math.round(((isRound ? base * 2 : base) + billable * mileageRate) * 100) / 100;

  const svcLabel = serviceType === "AMBULATORY" ? "Ambulatory" : serviceType === "WHEELCHAIR" ? "Wheelchair" : "Stretcher";
  const tripLabel = isRound ? "Round Trip" : "One-Way";

  // Create a pending invoice first so we can link it on success
  const invoice = await prisma.invoice.create({
    data: {
      invoiceNum: invoiceNum(),
      clientId: clientId || null,
      dueDate: new Date(),
      subtotal: total,
      tax: 0,
      total,
      status: "DRAFT",
      notes: notes || null,
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
  });

  // Create Stripe PaymentIntent
  const intent = await stripe.paymentIntents.create({
    amount: Math.round(total * 100), // cents
    currency: "usd",
    metadata: { invoiceId: invoice.id, invoiceNum: invoice.invoiceNum },
    description: `${svcLabel} Transport — ${tripLabel} | ${invoice.invoiceNum}`,
  });

  // Store stripeId on invoice
  await prisma.invoice.update({
    where: { id: invoice.id },
    data: { stripeId: intent.id },
  });

  return NextResponse.json({ clientSecret: intent.client_secret, invoiceId: invoice.id, invoiceNum: invoice.invoiceNum, total });
}
