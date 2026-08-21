-- ════════════════════════════════════════════════════════════════════════
-- Row Level Security — segunda linha de defesa a nível da base de dados,
-- independente da validação já feita nas Server Actions (defense in depth).
--
-- Modelo de autorização desta app: livro-razão PARTILHADO por toda a
-- família — ao contrário do helpdesk (onde cada cliente só vê os seus
-- próprios tickets), aqui qualquer membro autenticado tem acesso total a
-- todos os ativos/transações/valorizações. A fronteira que importa é
-- "autenticado ou não", não "de quem é este registo" — por isso as policies
-- abaixo são "to authenticated using (true)", não scoped por utilizador.
-- ════════════════════════════════════════════════════════════════════════

-- ── profiles ────────────────────────────────────────────────────────────
create policy "profiles: utilizador vê o próprio perfil"
  on public.profiles for select
  to authenticated
  using (id = auth.uid());

create policy "profiles: utilizador atualiza o próprio perfil"
  on public.profiles for update
  to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

-- Criação de novos membros é feita exclusivamente pela Admin API (chave
-- service_role, que ignora RLS — ver src/app/(app)/settings/users/actions.ts)
-- de propósito: não há policy de insert para "authenticated" aqui.

-- ── assets / transactions / valuation_snapshots ────────────────────────
-- Livro-razão partilhado: qualquer membro autenticado lê e escreve tudo.
create policy "assets: membros autenticados têm acesso total"
  on public.assets for all
  to authenticated
  using (true)
  with check (true);

create policy "transactions: membros autenticados têm acesso total"
  on public.transactions for all
  to authenticated
  using (true)
  with check (true);

create policy "valuation_snapshots: membros autenticados têm acesso total"
  on public.valuation_snapshots for all
  to authenticated
  using (true)
  with check (true);
