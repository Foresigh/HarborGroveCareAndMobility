import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

function calcTotal(subtotal: number, discount: number | null, discountType: string | null): number {
  if (!discount || !discountType) return subtotal;
  if (discountType === "PERCENT") return Math.max(0, subtotal - subtotal * (discount / 100));
  return Math.max(0, subtotal - discount);
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const invoice = await prisma.invoice.findUnique({
    where: { id },
    include: { client: true, facility: true, items: { include: { ride: true } } },
  });
  if (!invoice) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(invoice);
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await req.json();

  // Full invoice edit (from edit page) — contains items array
  if (body.items) {
    const { clientId, facilityId, dueDate, notes, items, billingPeriodStart, billingPeriodEnd, paymentTerms, discount, discountType } = body;
    const subtotal = items.reduce((sum: number, item: { total: number }) => sum + (Number(item.total) || 0), 0);
    const total = calcTotal(subtotal, discount ? Number(discount) : null, discountType ?? null);

    // Delete old items then create new ones
    await prisma.invoiceItem.deleteMany({ where: { invoiceId: id } });

    const invoice = await prisma.invoice.update({
      where: { id },
      data: {
        clientId: clientId || null,
        facilityId: facilityId || null,
        billingPeriodStart: billingPeriodStart ? new Date(billingPeriodStart) : null,
        billingPeriodEnd: billingPeriodEnd ? new Date(billingPeriodEnd) : null,
        paymentTerms: paymentTerms || "Net 30",
        dueDate: dueDate ? new Date(dueDate) : undefined,
        subtotal,
        discount: discount ? Number(discount) : null,
        discountType: discountType || null,
        total,
        notes: notes || null,
        items: {
          create: items.map((item: {
            description: string; quantity: number; unitPrice: number; total: number;
            serviceType?: string; tripType?: string; patientName?: string; patientDob?: string;
            serviceDate?: string; miles?: number; ownWheelchair?: boolean; needsO2?: boolean; weight?: number;
          }) => ({
            description: item.description,
            quantity: item.quantity || 1,
            unitPrice: Number(item.unitPrice) || 0,
            total: Number(item.total) || 0,
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
    return NextResponse.json(invoice);
  }

  // Simple field update (status, paidAt, etc.)
  const invoice = await prisma.invoice.update({ where: { id }, data: body });
  return NextResponse.json(invoice);
}
