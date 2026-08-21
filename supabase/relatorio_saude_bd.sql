-- ════════════════════════════════════════════════════════════════════════
-- Relatório de saúde da base de dados — performance, ligações ("forks"),
-- segurança e roteamento de queries.
--
-- Como usar:
--   1. Supabase Studio → SQL Editor → cola e corre um bloco de cada vez
--      para inspeção pontual; OU
--   2. Supabase Studio → Reports → New custom report → "Add block" → SQL,
--      um bloco (uma única query SELECT) por painel. É para isto que os
--      blocos abaixo estão desenhados: cada um é independente e devolve
--      uma tabela pronta a visualizar.
--
-- Todos os blocos são só leitura (SELECT) exceto o Bloco 0, que só cria a
-- extensão de estatísticas se ainda não existir — corre-o uma vez.
--
-- "Forks": cada ligação ao Postgres corresponde a um processo do servidor
-- (o modelo de concorrência do Postgres é process-per-connection, via
-- fork()) — é a isso que os blocos da secção 2 se referem.
-- ════════════════════════════════════════════════════════════════════════


-- ┌──────────────────────────────────────────────────────────────────────┐
-- │ BLOCO 0 · Preparação (correr uma vez)                                 │
-- └──────────────────────────────────────────────────────────────────────┘
-- Normalmente já vem ativa por omissão nos projetos Supabase (é a mesma
-- extensão que alimenta a página "Query Performance" do dashboard); isto
-- é só uma rede de segurança, idempotente.
create extension if not exists pg_stat_statements with schema extensions;


-- ══════════════════════════════════════════════════════════════════════
-- 1. QUERIES LENTAS
-- ══════════════════════════════════════════════════════════════════════

-- BLOCO 1 · Queries com maior tempo médio de execução
-- As que mais penalizam cada pedido individual. Se "pg_stat_statements"
-- não existir sem o schema "extensions.", troca para "extensions.pg_stat_statements".
select
  round(mean_exec_time::numeric, 2)  as tempo_medio_ms,
  round(total_exec_time::numeric, 2) as tempo_total_ms,
  calls                              as n_chamadas,
  round((100 * total_exec_time / sum(total_exec_time) over ())::numeric, 1) as pct_tempo_total_bd,
  round((shared_blks_hit::numeric / nullif(shared_blks_hit + shared_blks_read, 0)) * 100, 1) as cache_hit_pct,
  rows                                as linhas_devolvidas,
  left(query, 300)                    as query
from extensions.pg_stat_statements
where query not ilike '%pg_stat_statements%'
  and query not ilike 'COMMIT%'
  and query not ilike 'BEGIN%'
order by mean_exec_time desc
limit 25;

-- BLOCO 2 · Queries que mais tempo total consomem (calls × duração)
-- Uma query rápida mas chamada milhares de vezes pode pesar mais na BD do
-- que uma lenta chamada poucas vezes — este bloco apanha esse caso, que o
-- Bloco 1 (ordenado por média) não mostra.
select
  calls                               as n_chamadas,
  round(total_exec_time::numeric, 2)  as tempo_total_ms,
  round(mean_exec_time::numeric, 2)   as tempo_medio_ms,
  round((100 * total_exec_time / sum(total_exec_time) over ())::numeric, 1) as pct_tempo_total_bd,
  left(query, 300)                    as query
from extensions.pg_stat_statements
where query not ilike '%pg_stat_statements%'
order by total_exec_time desc
limit 25;


-- ══════════════════════════════════════════════════════════════════════
-- 2. LIGAÇÕES / "FORKS"
-- ══════════════════════════════════════════════════════════════════════

-- BLOCO 3 · Ligações ativas agrupadas por origem e estado
-- Ajuda a apanhar fugas de ligações (ex.: um endpoint que não fecha o
-- cliente Supabase) e a perceber que aplicação/rota está a gerar mais
-- carga.
select
  datname                    as base_dados,
  usename                    as utilizador,
  application_name           as aplicacao,
  client_addr                as origem,
  state,
  count(*)                   as n_ligacoes,
  max(now() - state_change)  as ligacao_mais_antiga,
  max(now() - query_start)   as query_mais_longa
from pg_stat_activity
where pid <> pg_backend_pid()
group by 1, 2, 3, 4, 5
order by n_ligacoes desc;

-- BLOCO 4 · Resumo: ligações atuais vs limite do plano
-- Se "pct_utilizado" andar consistentemente perto de 100%, é sinal para
-- rever connection pooling (Supavisor, Project Settings → Database) ou
-- subir de plano. "idle_in_transaction" alto é sinal de conexões que
-- abriram uma transação e a deixaram pendurada — bloqueiam vacuum e locks.
select
  count(*)                                                              as ligacoes_atuais,
  current_setting('max_connections')::int                               as limite_max,
  round(100.0 * count(*) / current_setting('max_connections')::int, 1)  as pct_utilizado,
  count(*) filter (where state = 'idle in transaction')                 as idle_in_transaction,
  count(*) filter (where now() - query_start > interval '30 seconds' and state = 'active')
                                                                          as queries_a_correr_ha_mais_30s
from pg_stat_activity;


-- ══════════════════════════════════════════════════════════════════════
-- 3. SEGURANÇA
-- ══════════════════════════════════════════════════════════════════════

-- BLOCO 5 · Tabelas em "public" SEM Row Level Security
-- O check mais crítico de todos: qualquer tabela aqui listada é acessível
-- sem restrição por quem tiver a chave anon (ex.: o browser do cliente),
-- independentemente de qualquer validação feita nas rotas da API.
select
  schemaname as schema,
  tablename  as tabela,
  rowsecurity as rls_ativo
from pg_tables
where schemaname = 'public'
  and rowsecurity = false
order by tabela;

-- BLOCO 6 · Políticas RLS existentes
-- Reveja sobretudo linhas com "potencialmente_permissiva" = true: "using"
-- vazio ou igual a "true" equivale a "qualquer linha", o que normalmente
-- anula o propósito do RLS.
select
  schemaname                              as schema,
  tablename                                as tabela,
  policyname                               as politica,
  permissive,
  cmd                                      as operacao,
  roles,
  qual                                     as using_expr,
  with_check                               as check_expr,
  (qual is null or qual::text = 'true')    as potencialmente_permissiva
from pg_policies
where schemaname = 'public'
order by tabela, politica;

-- BLOCO 7 · Funções SECURITY DEFINER sem "search_path" fixo
-- Sem um search_path explícito, uma função SECURITY DEFINER pode ser
-- enganada por objetos com o mesmo nome criados noutro schema (schema
-- hijacking). Um dos checks do Security Advisor da própria Supabase.
select
  n.nspname                     as schema,
  p.proname                     as funcao,
  p.prosecdef                   as security_definer,
  coalesce(
    (select true from unnest(p.proconfig) cfg where cfg like 'search_path=%'),
    false
  )                              as tem_search_path_fixo
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and p.prosecdef = true
  and not coalesce(
    (select true from unnest(p.proconfig) cfg where cfg like 'search_path=%'),
    false
  )
order by funcao;

-- BLOCO 8 · Extensões instaladas no schema "public"
-- Extensões deviam viver sempre no schema "extensions", nunca em
-- "public": aí partilham o espaço de nomes das tuas próprias tabelas e
-- funções, abrindo espaço a colisões/exploração. Outro check do Security
-- Advisor da Supabase.
select
  e.extname as extensao,
  n.nspname as schema_atual
from pg_extension e
join pg_namespace n on n.oid = e.extnamespace
where n.nspname = 'public';

-- BLOCO 9 · Buckets de Storage públicos
-- Um bucket "público" serve qualquer ficheiro sem autenticação a quem
-- souber o URL. Confirma que só está marcado como público o que é mesmo
-- suposto ser (ex.: logótipos) — nunca anexos de tickets ou documentos
-- internos.
select
  id   as bucket,
  public as e_publico,
  created_at
from storage.buckets
order by e_publico desc, bucket;


-- ══════════════════════════════════════════════════════════════════════
-- 4. ROTEAMENTO DE QUERIES / ÍNDICES
-- ══════════════════════════════════════════════════════════════════════

-- BLOCO 10 · Tabelas mais "roteadas" para leitura sequencial (seq scan)
-- em vez de índice. "pct_leituras_sequenciais" alto numa tabela com
-- muitas linhas ("linhas_estimadas") é sinal de índice em falta para os
-- filtros/joins mais comuns feitos sobre ela.
select
  schemaname                                                     as schema,
  relname                                                        as tabela,
  seq_scan,
  seq_tup_read,
  idx_scan,
  round(100.0 * seq_scan / nullif(seq_scan + idx_scan, 0), 1)     as pct_leituras_sequenciais,
  n_live_tup                                                     as linhas_estimadas
from pg_stat_user_tables
where schemaname = 'public'
order by seq_scan desc
limit 25;

-- BLOCO 11 · Chaves estrangeiras sem índice de suporte
-- Sem índice na coluna FK, qualquer JOIN por essa relação ou qualquer
-- DELETE/UPDATE em cascata na tabela referenciada força um seq scan
-- nesta tabela. Cobre FKs de coluna única (o caso mais comum); para FKs
-- compostas, confirma manualmente com EXPLAIN.
select
  c.conrelid::regclass  as tabela,
  a.attname              as coluna_fk,
  c.confrelid::regclass as tabela_referenciada
from pg_constraint c
join lateral unnest(c.conkey) as ak(attnum) on true
join pg_attribute a on a.attrelid = c.conrelid and a.attnum = ak.attnum
where c.contype = 'f'
  and c.connamespace = 'public'::regnamespace
  and not exists (
    select 1
    from pg_index i
    where i.indrelid = c.conrelid
      and i.indkey[0] = a.attnum
  )
order by tabela, coluna_fk;

-- BLOCO 12 · Índices nunca usados (custo sem benefício)
-- "vezes_usado" = 0 num índice já com uso normal da app há semanas é
-- candidato a remover: continua a pesar em cada INSERT/UPDATE/DELETE sem
-- nunca ajudar uma leitura. Não remova índices de PK/unique só por
-- estarem aqui — confirma primeiro o que cada um garante.
select
  schemaname                                    as schema,
  relname                                       as tabela,
  indexrelname                                  as indice,
  idx_scan                                      as vezes_usado,
  pg_size_pretty(pg_relation_size(indexrelid))  as tamanho
from pg_stat_user_indexes
where schemaname = 'public'
  and idx_scan = 0
order by pg_relation_size(indexrelid) desc;


-- ══════════════════════════════════════════════════════════════════════
-- 5. MANUTENÇÃO E CRESCIMENTO (extra pertinente)
-- ══════════════════════════════════════════════════════════════════════

-- BLOCO 13 · Bloat e estado do autovacuum
-- "pct_mortas" alto, ou "last_autovacuum" muito antigo (ou nulo) numa
-- tabela com escrita frequente, indica que o autovacuum não está a
-- acompanhar o ritmo — piora performance e cresce o tamanho em disco.
select
  schemaname                                                          as schema,
  relname                                                             as tabela,
  n_live_tup                                                          as linhas_vivas,
  n_dead_tup                                                          as linhas_mortas,
  round(100.0 * n_dead_tup / nullif(n_live_tup + n_dead_tup, 0), 1)   as pct_mortas,
  last_autovacuum,
  last_autoanalyze
from pg_stat_user_tables
where schemaname = 'public'
order by n_dead_tup desc
limit 25;

-- BLOCO 14 · Taxa de acerto em cache (buffer cache)
-- Abaixo de ~99% em produção já vale a pena investigar (mais RAM no
-- plano, menos varrimentos completos de tabela, melhores índices).
select
  round(100.0 * sum(heap_blks_hit) / nullif(sum(heap_blks_hit) + sum(heap_blks_read), 0), 2) as cache_hit_pct_tabelas,
  round(100.0 * sum(idx_blks_hit) / nullif(sum(idx_blks_hit) + sum(idx_blks_read), 0), 2)     as cache_hit_pct_indices
from pg_statio_user_tables;

-- BLOCO 15 · Maiores tabelas por espaço ocupado
-- Útil para prever quando vais precisar de subir de plano de storage, e
-- para perceber se o peso está nos dados ou nos próprios índices.
select
  relname                                                                   as tabela,
  pg_size_pretty(pg_total_relation_size(relid))                             as tamanho_total,
  pg_size_pretty(pg_relation_size(relid))                                   as tamanho_dados,
  pg_size_pretty(pg_total_relation_size(relid) - pg_relation_size(relid))   as tamanho_indices
from pg_catalog.pg_statio_user_tables
order by pg_total_relation_size(relid) desc
limit 20;
