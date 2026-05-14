import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json();
  const { name, address, email, phone, contact, active } = body;
  const facility = await prisma.facility.update({
    where: { id },
    data: {
      ...(name !== undefined && { name }),
      ...(address !== undefined && { address }),
      ...(email !== undefined && { email }),
      ...(phone !== undefined && { phone }),
      ...(contact !== undefined && { contact }),
      ...(active !== undefined && { active }),
    },
  });
  return NextResponse.json(facility);
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await prisma.facility.update({ where: { id }, data: { active: false } });
  return new NextResponse(null, { status: 204 });
}
