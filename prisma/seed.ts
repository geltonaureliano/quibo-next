import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaClient } from "../src/generated/prisma/client";
import path from "path";

const DB_URL = `file:${path.resolve(process.cwd(), "dev.db")}`;
const adapter = new PrismaBetterSqlite3({ url: DB_URL });
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("Populando banco de dados...");

  const alice = await prisma.user.upsert({
    where: { email: "alice@quibo.dev" },
    update: {},
    create: { name: "Alice Ferreira", email: "alice@quibo.dev" },
  });

  const bob = await prisma.user.upsert({
    where: { email: "bob@quibo.dev" },
    update: {},
    create: { name: "Bob Santos", email: "bob@quibo.dev" },
  });

  const postsData = [
    {
      title: "Introdução ao Next.js 16",
      content: "O Next.js 16 traz melhorias significativas no App Router e Server Actions...",
      published: true,
      authorId: alice.id,
    },
    {
      title: "Prisma 7: o que mudou",
      content: "A versão 7 do Prisma introduz um novo sistema de configuração com prisma.config.ts e driver adapters obrigatórios.",
      published: true,
      authorId: alice.id,
    },
    {
      title: "Rascunho: Deploy no Vercel",
      content: null,
      published: false,
      authorId: bob.id,
    },
  ];

  for (const post of postsData) {
    const existing = await prisma.post.findFirst({ where: { title: post.title } });
    if (!existing) {
      await prisma.post.create({ data: post });
    }
  }

  const userCount = await prisma.user.count();
  const postCount = await prisma.post.count();
  console.log(`Seed concluído! ${userCount} usuários, ${postCount} posts.`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
