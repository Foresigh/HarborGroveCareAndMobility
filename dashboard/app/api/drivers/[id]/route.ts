import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json();

  const driver = await prisma.driver.update({
    where: { id },
    data: {
      firstName: body.firstName,
      lastName: body.lastName,
      phone: body.phone,
      email: body.email || null,
      licenseNum: body.licenseNum || null,
      status: body.status,
      vehicleId: body.vehicleId || null,
    },
  });

  return NextResponse.json(driver);
}
