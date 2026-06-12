export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import Stripe from "stripe";
import { prisma } from "@/lib/prisma";

function getStripe() {
  return new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: "2026-05-27.dahlia" });
}

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
  const { clientId, serviceType, tripType, miles, customRate, serviceDate, notes, clientEmail, clientPhone } = body;

  const rows = await prisma.setting.findMany();
  const s: Record<string, string> = { ...DEFAULTS };
  for (const r of rows) s[r.key] = r.value;

  const n = (k: string, d: number) => { const x = Number(s[k]); return isNaN(x) ? d : x; };
  const mileageRate   = n("MILEAGE_RATE", 3.65);
  const includedMiles = n("INCLUDED_MILES", 10);

  const base    = Math.max(0, Number(customRate) || 0);
  const totalMi = (miles !== null && miles !== undefined && miles !== "") ? Math.max(0, Number(miles) || 0) : 0;
  const isRound = tripType === "ROUND_TRIP";
  const billable = totalMi === 0 ? 0 : Math.max(0, totalMi - includedMiles);
  const total    = totalMi === 0 ? 0 : Math.round(((isRound ? base * 2 : base) + billable * mileageRate) * 100) / 100;

  const svcLabel  = serviceType === "AMBULATORY" ? "Ambulatory" : serviceType === "WHEELCHAIR" ? "Wheelchair" : "Stretcher";
  const tripLabel = isRound ? "Round Trip" : "One-Way";
  const baseUrl   = (process.env.NEXT_PUBLIC_APP_URL ?? "").replace(/\/$/, "");

  // Create invoice as DRAFT (webhook will mark it PAID)
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

  // Build Checkout session
  const sessionParams: Stripe.Checkout.SessionCreateParams = {
    mode: "payment",
    line_items: [{
      price_data: {
        currency: "usd",
        product_data: {
          name: `${svcLabel} Transport — ${tripLabel}`,
          description: `Harbor Grove Care & Mobility | Invoice ${invoice.invoiceNum}`,
        },
        unit_amount: Math.round(total * 100),
      },
      quantity: 1,
    }],
    metadata: { invoiceId: invoice.id, invoiceNum: invoice.invoiceNum },
    success_url: `${baseUrl}/payments/success?invoice=${invoice.invoiceNum}`,
    cancel_url:  `${baseUrl}/payments/new`,
    payment_intent_data: {
      metadata: { invoiceId: invoice.id, invoiceNum: invoice.invoiceNum },
    },
  };

  if (clientEmail) sessionParams.customer_email = clientEmail;

  const session = await getStripe().checkout.sessions.create(sessionParams);

  await prisma.invoice.update({
    where: { id: invoice.id },
    data: { stripeId: session.id, stripeUrl: session.url },
  });

  const shortUrl = `${baseUrl}/pay/${invoice.invoiceNum}`;

  // SMS the short branded link to client
  if (clientPhone) {
    const { sendSms } = await import("@/lib/sms");
    await sendSms(
      clientPhone,
      `Harbor Grove Care & Mobility\nYour payment of $${total.toFixed(2)} is ready.\nPay here: ${shortUrl}\nInvoice ${invoice.invoiceNum}`
    );
  }

  return NextResponse.json({ url: shortUrl, invoiceId: invoice.id, invoiceNum: invoice.invoiceNum, total });
}
