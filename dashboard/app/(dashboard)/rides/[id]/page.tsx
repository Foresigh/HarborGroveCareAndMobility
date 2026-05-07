export const dynamic = "force-dynamic";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import Link from "next/link";
import { RideEditForm } from "./RideEditForm";

export default async function RideDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const [ride, drivers, vehicles] = await Promise.all([
    prisma.ride.findUnique({ where: { id }, include: { client: true, driver: true, vehicle: true } }),
    prisma.driver.findMany({ where: { active: true }, orderBy: { firstName: "asc" } }),
    prisma.vehicle.findMany({ where: { active: true }, orderBy: { name: "asc" } }),
  ]);

  if (!ride) notFound();

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      <Link href="/rides" className="text-sm text-blue-600 hover:underline">← Back to Ride Board</Link>
      <RideEditForm ride={ride} drivers={drivers} vehicles={vehicles} />
    </div>
  );
}
