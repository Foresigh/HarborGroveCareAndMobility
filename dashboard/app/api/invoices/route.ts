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
    include: { client: true, items: true },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(invoices);
}

export async function POST(req: Request) {
  const body = await req.json();
  const { clientId, dueDate, notes, items } = body;

  const subtotal = items.reduce(
    (sum: number, item: { quantity: number; unitPrice: string }) =>
      sum + (Number(item.unitPrice) || 0) * (item.quantity || 1),
    0
  );

  const invoice = await prisma.invoice.create({
    data: {
      invoiceNum: generateInvoiceNum(),
      clientId,
      dueDate: new Date(dueDate),
      subtotal,
      tax: 0,
      total: subtotal,
      notes: notes || null,
      items: {
        create: items.map((item: { description: string; quantity: number; unitPrice: string; rideId?: string }) => ({
          description: item.description,
          quantity: item.quantity || 1,
          unitPrice: Number(item.unitPrice) || 0,
          total: (Number(item.unitPrice) || 0) * (item.quantity || 1),
          rideId: item.rideId || null,
        })),
      },
    },
    include: { items: true, client: true },
  });

  return NextResponse.json(invoice, { status: 201 });
}
