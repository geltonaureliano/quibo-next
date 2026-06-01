import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import { hashPassword } from "../src/lib/auth";
import "dotenv/config";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error("DATABASE_URL não definida no .env");

const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("Populando banco de dados com usuário demo...");

  const alice = await prisma.user.upsert({
    where: { email: "alice@quibo.dev" },
    update: {},
    create: {
      name: "Alice Ferreira",
      email: "alice@quibo.dev",
      password: hashPassword("quibo123"),
    },
  });

  console.log(`Usuário criado: ${alice.name} (${alice.email})`);
  console.log("Seed concluído!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    pool.end();
  });
