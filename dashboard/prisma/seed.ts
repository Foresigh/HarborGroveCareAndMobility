import { PrismaClient } from "../lib/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

async function main() {
  const password = await bcrypt.hash("HarborGrove2026!", 12);
  const admin = await prisma.user.upsert({
    where: { email: "admin@harborgrove.com" },
    update: {},
    create: {
      name: "Admin",
      email: "admin@harborgrove.com",
      password,
      role: "ADMIN",
    },
  });
  console.log("Seeded admin user:", admin.email);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
