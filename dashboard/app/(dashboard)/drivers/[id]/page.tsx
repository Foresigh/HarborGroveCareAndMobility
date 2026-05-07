export const dynamic = "force-dynamic";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import Link from "next/link";
import { DriverEditForm } from "./DriverEditForm";

export default async function DriverDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const [driver, vehicles] = await Promise.all([
    prisma.driver.findUnique({
      where: { id },
      include: { vehicle: true, rides: { orderBy: { scheduledAt: "desc" }, take: 5 } },
    }),
    prisma.vehicle.findMany({ where: { active: true }, orderBy: { name: "asc" } }),
  ]);

  if (!driver) notFound();

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      <Link href="/drivers" className="text-sm text-blue-600 hover:underline">← Back to Drivers</Link>
      <DriverEditForm driver={driver} vehicles={vehicles} />
    </div>
  );
}
