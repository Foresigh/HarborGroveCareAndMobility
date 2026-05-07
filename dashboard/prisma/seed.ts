import { PrismaClient } from "../lib/generated/prisma";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

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
