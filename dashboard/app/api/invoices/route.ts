import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

function generateInvoiceNum(): string {
  const now = new Date();
  const yy = String(now.getFullYear()).slice(-2);
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const rand = String(Math.floor(Math.random() * 9000) + 1000);
  return `HG-${yy}${mm}-${rand}`;
}

export async function GET() {
  const invoices = await prisma.invoice.findMany({
    include: { client: true, facility: true, items: true },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(invoices);
}

export async function POST(req: Request) {
  const body = await req.json();
  const { clientId, facilityId, dueDate, notes, items, billingPeriodStart, billingPeriodEnd, paymentTerms } = body;

  const subtotal = items.reduce((sum: number, item: { total: number }) => sum + (Number(item.total) || 0), 0);

  const invoice = await prisma.invoice.create({
    data: {
      invoiceNum: generateInvoiceNum(),
      clientId: clientId || null,
      facilityId: facilityId || null,
      billingPeriodStart: billingPeriodStart ? new Date(billingPeriodStart) : null,
      billingPeriodEnd: billingPeriodEnd ? new Date(billingPeriodEnd) : null,
      paymentTerms: paymentTerms || "Net 30",
      dueDate: new Date(dueDate),
      subtotal,
      tax: 0,
      total: subtotal,
      notes: notes || null,
      items: {
        create: items.map((item: {
          description: string; quantity: number; unitPrice: number; total: number; rideId?: string;
          serviceType?: string; tripType?: string; patientName?: string; patientDob?: string;
          serviceDate?: string; miles?: number; ownWheelchair?: boolean; needsO2?: boolean; weight?: number;
        }) => ({
          description: item.description,
          quantity: item.quantity || 1,
          unitPrice: Number(item.unitPrice) || 0,
          total: Number(item.total) || 0,
          rideId: item.rideId || null,
          serviceType: item.serviceType || null,
          tripType: item.tripType || null,
          patientName: item.patientName || null,
          patientDob: item.patientDob || null,
          serviceDate: item.serviceDate ? new Date(item.serviceDate) : null,
          miles: item.miles != null ? item.miles : null,
          ownWheelchair: item.ownWheelchair ?? null,
          needsO2: item.needsO2 ?? null,
          weight: item.weight || null,
        })),
      },
    },
    include: { items: true, client: true, facility: true },
  });

  return NextResponse.json(invoice, { status: 201 });
}
