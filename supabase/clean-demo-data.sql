-- ════════════════════════════════════════════════════════════════════════
-- Remove os dados de demonstração inseridos por supabase/seed.ts quando
-- SEED_DEMO_DATA=true (ETF MSCI World, Depósito a Prazo — Banco X,
-- Bitcoin) — corre isto no SQL Editor do Supabase quando estiveres pronto
-- para começar a usar a app a sério.
--
-- Só apaga os 3 ativos de demonstração pelo nome exato usado no seed —
-- nunca ativos criados por ti, mesmo que por coincidência tenhas um ativo
-- com um desses nomes (nesse caso, edita a lista abaixo antes de correr).
-- "on delete cascade" em transactions/valuation_snapshots (ver schema.sql)
-- trata de apagar as transações e valorizações associadas sozinho.
--
-- NÃO apaga utilizadores/contas — só dados de ativos/transações/
-- valorizações. Se criaste utilizadores de teste extra, removem-se em
-- Supabase → Authentication → Users (não há UI para isso na app ainda).
-- ════════════════════════════════════════════════════════════════════════

delete from public.assets
where name in ('ETF MSCI World', 'Depósito a Prazo — Banco X', 'Bitcoin');

-- Depois de correr, garante que SEED_DEMO_DATA não fica "true" no .env de
-- produção (Vercel → Settings → Environment Variables) — senão a próxima
-- vez que "npx tsx supabase/seed.ts" correr (ex.: por engano, ou num
-- redeploy que o chame), os mesmos dados de demonstração voltam a entrar.
