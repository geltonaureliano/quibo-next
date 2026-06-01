import { PrismaPg } from "@prisma/adapter-pg";
import "dotenv/config";
import { Pool } from "pg";
import { PrismaClient } from "../src/generated/prisma/client";
import { hashPassword } from "../src/lib/auth";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error("DATABASE_URL não definida no .env");

const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("Populando banco de dados com usuário demo...");

  const alice = await prisma.user.upsert({
    where: { email: "geltonaureliano@hotmail.com" },
    update: {},
    create: {
      name: "Gelton Aureliano",
      email: "geltonaureliano@hotmail.com",
      password: hashPassword("senha123"),
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
