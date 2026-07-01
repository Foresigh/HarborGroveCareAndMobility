import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const DEFAULTS: Record<string, string> = {
  AMBULATORY_RATE: "35",
  WHEELCHAIR_RATE: "45",
  STRETCHER_RATE: "145",
  MILEAGE_RATE: "3.65",
  INCLUDED_MILES: "0",
};

export async function GET() {
  const rows = await prisma.setting.findMany();
  const settings: Record<string, string> = { ...DEFAULTS };
  for (const row of rows) settings[row.key] = row.value;
  return NextResponse.json(settings);
}

export async function PATCH(req: Request) {
  const body: Record<string, string> = await req.json();
  const updates = await Promise.all(
    Object.entries(body).map(([key, value]) =>
      prisma.setting.upsert({
        where: { key },
        update: { value: String(value) },
        create: { key, value: String(value) },
      })
    )
  );
  return NextResponse.json(updates);
}
