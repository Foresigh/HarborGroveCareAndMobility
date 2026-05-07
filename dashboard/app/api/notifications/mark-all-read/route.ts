import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST() {
  await prisma.notification.updateMany({ where: { read: false }, data: { read: true } });
  return NextResponse.redirect(new URL("/notifications", process.env.NEXTAUTH_URL ?? "http://localhost:3000"));
}
