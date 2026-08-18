// Semeia o utilizador inicial (a partir de variáveis de ambiente) e, em
// desenvolvimento, alguns dados de demonstração para exercitar os cálculos
// de YTD/alocação/série temporal. Idempotente — pode correr-se várias vezes.

import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { hashPassword } from "../src/lib/auth/password";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

async function seedInitialUser() {
  const email = process.env.INITIAL_USER_EMAIL;
  const password = process.env.INITIAL_USER_PASSWORD;
  const name = process.env.INITIAL_USER_NAME ?? "Admin";

  if (!email || !password) {
    console.warn(
      "INITIAL_USER_EMAIL / INITIAL_USER_PASSWORD não definidos — nenhum utilizador foi criado."
    );
    return;
  }

  await prisma.user.upsert({
    where: { email },
    update: { name, passwordHash: hashPassword(password) },
    create: { email, name, passwordHash: hashPassword(password) },
  });

  console.log(`Utilizador "${email}" pronto.`);
}

async function seedDemoData() {
  if (process.env.SEED_DEMO_DATA !== "true") return;

  const existing = await prisma.asset.findFirst({ where: { name: "ETF MSCI World" } });
  if (existing) {
    console.log("Dados de demonstração já existem — a ignorar.");
    return;
  }

  const etf = await prisma.asset.create({
    data: {
      name: "ETF MSCI World",
      category: "Ações",
      currency: "EUR",
      transactions: {
        create: [
          { type: "BUY", date: new Date("2025-01-10"), quantity: 10, unitPrice: 80, amount: 800 },
          { type: "BUY", date: new Date("2025-06-01"), quantity: 5, unitPrice: 90, amount: 450 },
          { type: "DIVIDEND", date: new Date("2026-03-01"), amount: 20 },
        ],
      },
      valuations: {
        create: [
          { date: new Date("2025-12-31"), value: 900 },
          { date: new Date("2026-08-01"), value: 1400 },
        ],
      },
    },
  });

  const deposito = await prisma.asset.create({
    data: {
      name: "Depósito a Prazo — Banco X",
      category: "Depósitos",
      currency: "EUR",
      transactions: {
        create: [
          { type: "DEPOSIT", date: new Date("2024-03-01"), amount: 5000 },
          { type: "INTEREST", date: new Date("2025-03-01"), amount: 100 },
          { type: "INTEREST", date: new Date("2026-03-01"), amount: 110 },
        ],
      },
      valuations: {
        create: [
          { date: new Date("2025-12-31"), value: 5100 },
          { date: new Date("2026-08-01"), value: 5210 },
        ],
      },
    },
  });

  const cripto = await prisma.asset.create({
    data: {
      name: "Bitcoin",
      category: "Cripto",
      currency: "EUR",
      transactions: {
        create: [
          { type: "BUY", date: new Date("2025-11-15"), quantity: 0.05, unitPrice: 40000, amount: 2000 },
        ],
      },
      valuations: {
        create: [{ date: new Date("2026-08-01"), value: 2650 }],
      },
    },
  });

  console.log(`Dados de demonstração criados: ${[etf, deposito, cripto].map((a) => a.name).join(", ")}`);
}

async function main() {
  await seedInitialUser();
  await seedDemoData();
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
