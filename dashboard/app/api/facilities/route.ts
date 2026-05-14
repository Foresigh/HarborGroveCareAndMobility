import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const facilities = await prisma.facility.findMany({
    where: { active: true },
    orderBy: { name: "asc" },
  });
  return NextResponse.json(facilities);
}

export async function POST(req: Request) {
  const body = await req.json();
  const { name, address, email, phone, contact } = body;
  if (!name) return NextResponse.json({ error: "Name is required" }, { status: 400 });
  const facility = await prisma.facility.create({
    data: { name, address, email, phone, contact },
  });
  return NextResponse.json(facility, { status: 201 });
}
