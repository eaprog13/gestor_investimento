// Semeia o utilizador inicial (a partir de variáveis de ambiente) e, em
// desenvolvimento, alguns dados de demonstração para exercitar os cálculos
// de YTD/alocação/série temporal. Idempotente — pode correr-se várias vezes.
//
// Script TS (não SQL puro, ao contrário de schema.sql/policies.sql):
// criar um utilizador tem de passar pela Admin API do Supabase Auth
// (auth.admin.createUser), não por um "insert" direto — só ela sabe gerar o
// hash da password e criar a entrada em auth.users que o trigger
// handle_new_user (ver schema.sql) espera para criar o perfil.
//
//   npx tsx supabase/seed.ts

import "dotenv/config";
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const chaveServico = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !chaveServico) {
  console.error("NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY em falta no .env.");
  process.exit(1);
}

const bd = createClient(url, chaveServico, { auth: { autoRefreshToken: false, persistSession: false } });

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

  const { data: existentes, error: erroListar } = await bd.auth.admin.listUsers();
  if (erroListar) throw new Error(erroListar.message);

  const existente = existentes.users.find((u) => u.email === email);
  if (existente) {
    const { error } = await bd.auth.admin.updateUserById(existente.id, {
      password,
      user_metadata: { name },
    });
    if (error) throw new Error(error.message);
    console.log(`Utilizador "${email}" atualizado.`);
    return;
  }

  const { error } = await bd.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { name },
  });
  if (error) throw new Error(error.message);
  console.log(`Utilizador "${email}" criado.`);
}

async function seedDemoData() {
  if (process.env.SEED_DEMO_DATA !== "true") return;

  const { data: existing } = await bd.from("assets").select("id").eq("name", "ETF MSCI World").maybeSingle();
  if (existing) {
    console.log("Dados de demonstração já existem — a ignorar.");
    return;
  }

  const ativos = [
    {
      name: "ETF MSCI World",
      category: "Ações",
      currency: "EUR",
      transactions: [
        { type: "BUY", date: "2025-01-10", quantity: 10, unit_price: 80, amount: 800 },
        { type: "BUY", date: "2025-06-01", quantity: 5, unit_price: 90, amount: 450 },
        { type: "DIVIDEND", date: "2026-03-01", amount: 20 },
      ],
      valuations: [
        { date: "2025-12-31", value: 900 },
        { date: "2026-08-01", value: 1400 },
      ],
    },
    {
      name: "Depósito a Prazo — Banco X",
      category: "Depósitos",
      currency: "EUR",
      transactions: [
        { type: "DEPOSIT", date: "2024-03-01", amount: 5000 },
        { type: "INTEREST", date: "2025-03-01", amount: 100 },
        { type: "INTEREST", date: "2026-03-01", amount: 110 },
      ],
      valuations: [
        { date: "2025-12-31", value: 5100 },
        { date: "2026-08-01", value: 5210 },
      ],
    },
    {
      name: "Bitcoin",
      category: "Cripto",
      currency: "EUR",
      transactions: [{ type: "BUY", date: "2025-11-15", quantity: 0.05, unit_price: 40000, amount: 2000 }],
      valuations: [{ date: "2026-08-01", value: 2650 }],
    },
  ];

  for (const { transactions, valuations, ...ativo } of ativos) {
    const { data: criado, error } = await bd.from("assets").insert(ativo).select("id").single();
    if (error || !criado) throw new Error(error?.message);

    if (transactions.length > 0) {
      const { error: erroTx } = await bd
        .from("transactions")
        .insert(transactions.map((t) => ({ ...t, asset_id: criado.id })));
      if (erroTx) throw new Error(erroTx.message);
    }
    if (valuations.length > 0) {
      const { error: erroVal } = await bd
        .from("valuation_snapshots")
        .insert(valuations.map((v) => ({ ...v, asset_id: criado.id })));
      if (erroVal) throw new Error(erroVal.message);
    }
  }

  console.log(`Dados de demonstração criados: ${ativos.map((a) => a.name).join(", ")}`);
}

async function main() {
  await seedInitialUser();
  await seedDemoData();
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
