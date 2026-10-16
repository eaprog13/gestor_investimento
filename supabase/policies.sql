-- ════════════════════════════════════════════════════════════════════════
-- Row Level Security — base de dados FECHADA às chaves públicas.
--
-- Esta app só lê e escreve dados no servidor, com a chave service_role (que
-- ignora o RLS — ver src/lib/supabase/admin.ts e src/composition/container.ts).
-- A chave anon é pública (vai no bundle do browser, para o "esqueci a
-- password") e um utilizador "authenticated" pode ser QUALQUER conta do
-- Supabase Auth — incluindo uma criada pelo signup público, se estiver
-- ligado. Por isso:
--   - RLS ligado em todas as tabelas (schema.sql) e NENHUMA policy para
--     anon/authenticated: o PostgREST não devolve nem aceita nada com essas
--     chaves (sem policy = tudo recusado);
--   - sem privilégios de tabela para anon/authenticated (segunda barreira,
--     caso alguém um dia crie uma policy por engano).
-- Antes havia policies "to authenticated using (true)" (livro-razão
-- partilhado): a app nunca as usou, e com o signup público ligado davam a
-- qualquer desconhecido acesso total aos dados da família pela API REST.
-- ════════════════════════════════════════════════════════════════════════

-- ── Policies antigas (acesso total para "authenticated") ────────────────
drop policy if exists "profiles: utilizador vê o próprio perfil" on public.profiles;
drop policy if exists "profiles: utilizador atualiza o próprio perfil" on public.profiles;
drop policy if exists "assets: membros autenticados têm acesso total" on public.assets;
drop policy if exists "transactions: membros autenticados têm acesso total" on public.transactions;
drop policy if exists "valuation_snapshots: membros autenticados têm acesso total" on public.valuation_snapshots;

-- ── RLS ligado (já vem do schema.sql; repetido para este ficheiro bastar) ──
alter table public.profiles            enable row level security;
alter table public.assets              enable row level security;
alter table public.transactions        enable row level security;
alter table public.valuation_snapshots enable row level security;

-- ── Sem privilégios para as chaves públicas ─────────────────────────────
revoke all on table public.profiles            from anon, authenticated;
revoke all on table public.assets              from anon, authenticated;
revoke all on table public.transactions        from anon, authenticated;
revoke all on table public.valuation_snapshots from anon, authenticated;

-- tabelas futuras neste esquema também nascem fechadas
alter default privileges in schema public revoke all on tables from anon, authenticated;

-- as funções dos triggers não são para chamar pela API (/rpc)
revoke execute on function public.handle_new_user() from public, anon, authenticated;
revoke execute on function public.set_updated_at() from public, anon, authenticated;
