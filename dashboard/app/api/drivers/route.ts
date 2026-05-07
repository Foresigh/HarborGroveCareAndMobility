import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const drivers = await prisma.driver.findMany({
    where: { active: true },
    include: { vehicle: true },
    orderBy: { lastName: "asc" },
  });
  return NextResponse.json(drivers);
}

export async function POST(req: Request) {
  const body = await req.json();
  const driver = await prisma.driver.create({ data: body });
  return NextResponse.json(driver, { status: 201 });
}
