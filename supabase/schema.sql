-- ════════════════════════════════════════════════════════════════════════
-- Gestor de Investimento — Schema Supabase (Postgres + Auth)
-- Executar no SQL Editor do projeto Supabase, por esta ordem:
--   1) schema.sql
--   2) policies.sql
--   3) seed.sql   (opcional — via "npx tsx supabase/seed.ts", não SQL puro:
--                  precisa da Admin API para criar o utilizador inicial)
-- ════════════════════════════════════════════════════════════════════════

create extension if not exists "pgcrypto";

-- ── Perfis ─────────────────────────────────────────────────────────────
-- Estende auth.users (Supabase Auth trata de password/sessão/tokens; esta
-- tabela só guarda os dados próprios da app). Criado automaticamente via
-- trigger sempre que um utilizador é criado (ver handle_new_user, abaixo) —
-- sempre pela Admin API (auth.admin.createUser), nunca signup público: é
-- uma app familiar/fechada, membros são adicionados por quem já lá está
-- (ver src/app/(app)/settings/users).
create table if not exists public.profiles (
  id         uuid primary key references auth.users (id) on delete cascade,
  email      text not null unique,
  name       text not null,
  created_at timestamptz not null default now()
);

comment on table public.profiles is 'Dados complementares de cada membro da família com acesso à app.';

-- ── Ativos ─────────────────────────────────────────────────────────────
-- Um ativo do portefólio: ação, ETF, cripto, imóvel, depósito, poupança...
-- A categoria é texto livre, definida pelo próprio utilizador.
create table if not exists public.assets (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  category    text not null,
  currency    text not null default 'EUR' check (char_length(currency) = 3),
  notes       text,
  is_archived boolean not null default false,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists assets_category_idx on public.assets (category);

-- ── Transações ─────────────────────────────────────────────────────────
-- Uma linha do livro-razão. Append-only por natureza: editar só para
-- corrigir erros de introdução, nunca para "ajustar" ao valor de mercado —
-- isso é o papel de valuation_snapshots. O efeito de cada "type" no cost
-- basis/rendimento está definido em src/lib/calculations.ts (TX_META), não
-- aqui — o "check" abaixo só garante que o valor é um dos conhecidos.
create table if not exists public.transactions (
  id          uuid primary key default gen_random_uuid(),
  asset_id    uuid not null references public.assets (id) on delete cascade,
  type        text not null check (type in ('BUY', 'SELL', 'DEPOSIT', 'WITHDRAWAL', 'DIVIDEND', 'INTEREST', 'FEE')),
  date        timestamptz not null,
  quantity    numeric,             -- null para ativos sem unidades (depósitos, imóveis...)
  unit_price  numeric,
  amount      numeric not null check (amount > 0),  -- sempre positivo; o sinal/efeito vem do "type"
  notes       text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists transactions_asset_date_idx on public.transactions (asset_id, date);
create index if not exists transactions_date_idx on public.transactions (date);
create index if not exists transactions_type_idx on public.transactions (type);

-- ── Marcações de valorização ───────────────────────────────────────────
-- Marcação manual e periódica do valor de mercado de um ativo, independente
-- das transações. É a partir daqui que se calcula o valor atual e o
-- desempenho ao longo do tempo (ver src/lib/calculations.ts).
create table if not exists public.valuation_snapshots (
  id         uuid primary key default gen_random_uuid(),
  asset_id   uuid not null references public.assets (id) on delete cascade,
  date       timestamptz not null,
  value      numeric not null check (value >= 0),
  notes      text,
  created_at timestamptz not null default now(),
  -- Uma marcação por ativo/dia: reintroduzir "hoje" atualiza em vez de
  -- duplicar (ver upsert em src/adapters/supabase/valuationRepository.ts).
  -- O "unique" já cria o índice (asset_id, date) — não duplicar com um
  -- "create index" à parte para as mesmas colunas (ver auditoria, achado
  -- corrigido em 2026-08-21: existia um índice repetido aqui).
  unique (asset_id, date)
);

-- ── Row Level Security ──────────────────────────────────────────────────
alter table public.profiles           enable row level security;
alter table public.assets             enable row level security;
alter table public.transactions       enable row level security;
alter table public.valuation_snapshots enable row level security;

-- ── Triggers: updated_at automático ────────────────────────────────────
create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_updated_at on public.assets;
create trigger set_updated_at before update on public.assets
  for each row execute function public.set_updated_at();

drop trigger if exists set_updated_at on public.transactions;
create trigger set_updated_at before update on public.transactions
  for each row execute function public.set_updated_at();

-- ── Trigger: criar perfil automaticamente ao criar um utilizador ──────
-- O admin cria o utilizador via Supabase Admin API (auth.admin.createUser),
-- passando "name" em user_metadata (ver
-- src/adapters/supabase/identityAdminProvider.ts); este trigger copia
-- email/nome para public.profiles.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email, name)
  values (new.id, new.email, coalesce(new.raw_user_meta_data ->> 'name', new.email))
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
