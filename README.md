# Gestor de Investimento

Livro-razão e dashboard do portefólio familiar: registo de transações
(compras, vendas, depósitos, dividendos, juros, comissões...) por ativo,
marcações periódicas de valor de mercado, e um dashboard com KPIs, alocação
por categoria e desempenho ao longo do tempo.

## Stack

- **[Next.js 16](https://nextjs.org)** (App Router, TypeScript, Server Actions) — front-end e back-end na mesma app.
- **[Tailwind CSS 4](https://tailwindcss.com)** + **[Recharts](https://recharts.org)** — UI e gráficos.
- **[Supabase](https://supabase.com)** — Postgres gerido + Auth, acedidos via `@supabase/supabase-js` / `@supabase/ssr` (sem ORM — ver "Base de dados e autenticação" abaixo).
- **[zod](https://zod.dev)** — validação dos formulários.
- **[Vitest](https://vitest.dev)** — testes da lógica de negócio.

App fechada, sem registo público: as contas criam-se no painel do Supabase
(ou com `npm run seed`, para a primeira) e só entram depois de marcadas como
membro da família — ver "Segurança". Em `/settings/users` vê-se e edita-se
quem já tem acesso.

## Requisitos

- Node.js 20.9 ou superior (exigido pelo Next.js 16).
- Um projeto [Supabase](https://supabase.com) (o plano grátis chega).
- Opcional, mas obrigatório em produção: uma base Redis no
  [Upstash](https://upstash.com) para o limite de tentativas de login.
- Opcional: uma chave grátis da [Alpha Vantage](https://www.alphavantage.co/support/#api-key)
  para cotações de ETF/ações (ver "Cotações ao vivo").

## Arquitetura

Hexagonal (ports & adapters): o núcleo do negócio nunca depende do Supabase
diretamente, só de interfaces — trocar de base de dados/fornecedor de
autenticação no futuro significa escrever novos adapters, sem tocar em
services nem em rotas.

```
src/core/types.ts               tipos de domínio (Asset, Transaction, ValuationSnapshot, Profile)
src/core/ports/                  interfaces (contratos) de dados, identidade e autenticação
src/core/services/               regras de negócio — testadas com fakes em memória
src/adapters/supabase/           implementação dos ports sobre o Supabase (dados, Auth, cliente service_role)
src/adapters/upstash/            limite de tentativas partilhado (Redis)
src/adapters/memoria/            limite de tentativas em memória (reserva sem Upstash)
src/composition/container.ts     raiz de composição — único sítio que escolhe "Supabase"
src/lib/auth/session.ts          getSession()/requireSession() — sessão do pedido, só membros
src/lib/security/headers.ts      cabeçalhos de segurança (CSP, HSTS, ...) — ver "Segurança"
src/composition/autenticacao*.ts escolhe o fornecedor de autenticação e o limitador de tentativas
src/proxy.ts                     renova a sessão, protege rotas e aplica os cabeçalhos de segurança
src/lib/calculations.ts          cálculo puro do livro-razão (cost basis, YTD, alocação...) — testado sem BD
src/lib/data.ts                  leituras já compostas para as páginas
src/app/(app)/                   páginas autenticadas (dashboard, assets, transactions, settings/users)
src/app/login/                   página e Server Action de login
supabase/                        schema.sql, policies.sql, seed.ts, relatorio_saude_bd.sql
```

**Nota sobre `src/proxy.ts`:** no Next.js 16 a convenção `middleware.ts` foi
renomeada para `proxy.ts` (mesmo comportamento, só o nome do ficheiro/export
mudou).

## Base de dados e autenticação (Supabase)

Sem ORM/migrations — schema em SQL puro, aplicado manualmente no SQL Editor
do Supabase:

1. Cria um projeto em [supabase.com](https://supabase.com) (grátis).
2. **SQL Editor** → corre, por esta ordem:
   - `supabase/schema.sql` — tabelas (`profiles`, `assets`, `transactions`,
     `valuation_snapshots`), índices, RLS, trigger que cria o perfil ao
     criar um utilizador.
   - `supabase/policies.sql` — RLS: livro-razão partilhado por toda a
     família (qualquer autenticado lê/escreve tudo — ver comentário no
     topo do ficheiro sobre porque não é scoped por utilizador).
3. **Project Settings → API** → copia `URL`, `anon public key` e
   `service_role key` para `.env` (ver `.env.example`).
4. **Authentication → Sign In / Providers** → desliga "Allow new users to
   sign up" (as contas criam-se só pelo painel ou pela Admin API).
5. **Authentication → URL Configuration** → em "Site URL" põe o endereço da
   app (ex: `http://localhost:3000` em desenvolvimento) e acrescenta
   `<endereço da app>/auth/callback` aos "Redirect URLs" — sem isto o link
   de "recuperar password" não funciona.
6. Cria o primeiro utilizador (já fica marcado como membro):
   ```bash
   npm run seed   # lê INITIAL_USER_EMAIL/PASSWORD/NAME do .env
   ```
   (ou pela dashboard: **Authentication → Users → Add user**, com
   `user_metadata.name` definido — o trigger cria o perfil automaticamente;
   depois marca-o como membro com `npm run membros -- marcar <email>`).

**Porquê sem ORM:** o schema real do Postgres (constraints, índices, RLS,
triggers) fica como fonte da verdade, sem uma camada de tradução/migrations
no meio. O acesso é feito através de repositórios em
`src/adapters/supabase/`, que isolam o resto da app do SQL.

**Autenticação:** Supabase Auth (`@supabase/ssr`) substitui a autenticação
própria que a app tinha antes (password hash + JWT em cookie próprio) —
menos código para manter em segurança, e sessão/renovação/expiração ficam a
cargo do Supabase. `public.profiles` guarda só o que é específico da app
(nome), nunca a password.

**Validar/otimizar depois de estar em produção:** `supabase/relatorio_saude_bd.sql`
tem queries prontas (queries lentas, índices em falta, tabelas sem RLS,
bloat/autovacuum) — corre no SQL Editor ou como Custom Report no dashboard
do Supabase. Vale a pena correr também o **Security Advisor** e o
**Performance Advisor** do dashboard (Database → Advisors) depois do
primeiro deploy.

## Cotações ao vivo

Cada ativo pode, opcionalmente, ser ligado a uma cotação de mercado diária
(editar ativo → "Cotação automática"). Quando configurada, o **Valor atual**
e a **P/L não realizada** desse ativo (e os totais do dashboard que os
somam) passam a usar `preço × unidades detidas` em vez da última
valorização manual — a valorização manual continua a servir de reserva
sempre que a cotação falhar ou não estiver configurada.

Fornecedores suportados (`src/adapters/quotes/httpQuoteProvider.ts`):

| Fornecedor | Para | Chave? | Símbolo (campo "Cotação automática") |
|---|---|---|---|
| CoinGecko | Cripto (Bitcoin, etc.) | Não | id da CoinGecko, ex: `bitcoin` (não o ticker `BTC`) |
| Alpha Vantage | ETF / ações | Sim, grátis — [pedir aqui](https://www.alphavantage.co/support/#api-key) | ticker da bolsa, ex: `AAPL` |

**Certificados de Aforro (e outros ativos sem mercado — depósitos,
imóveis...) não têm fornecedor.** O valor de um Certificado de Aforro é
calculado pelo IGCP por fórmula (média da Euribor a 3 meses + prémio de
permanência escalonado), não cotado em bolsa nenhuma — continuam,
deliberadamente, só com valorização manual.

**Nota sobre moeda na Alpha Vantage:** o `GLOBAL_QUOTE` devolve o preço na
moeda da bolsa onde o símbolo cota, sem indicar qual — escolhe um símbolo já
cotado na moeda do ativo (ex: a listagem em EUR de um ETF na XETRA, não a
mesma listagem em USD numa bolsa americana) ou o valor fica errado sem
conversão nenhuma a avisar.

As cotações ficam em cache 24h (`fetch`/`next.revalidate`) — respeita o
limite de ~25 pedidos/dia do plano grátis da Alpha Vantage e corresponde ao
pedido de "valores diários". Sem `ALPHA_VANTAGE_API_KEY` definida, ativos
ligados à Alpha Vantage ficam silenciosamente sem cotação (fallback para
valorização manual) — ver `.env.example`.

## Poder de compra (inflação)

Cartão no dashboard ("Poder de compra") para **todos os ativos** do
portefólio (arquivados excluídos) — compara o que foi investido em cada
um com o que seria preciso valer hoje só para acompanhar a inflação, e
mostra uma estimativa do que a inflação corrói por dia/semana/mês/ano se
o valor ficar parado.

**Fonte de dados:** [BPstat](https://bpstat.bportugal.pt) (API pública do
Banco de Portugal, sem chave nenhuma) — série "IPC (2012=100) total"
([`src/adapters/bpstat/bpstatInflationProvider.ts`](src/adapters/bpstat/bpstatInflationProvider.ts)).
A documentação pública da API (bpstat.bportugal.pt/data/docs) é uma SPA
que não carrega sem JavaScript — o formato dos pedidos usado aqui foi
confirmado ao vivo contra a própria API, não por suposição.

**Só o ÍNDICE bruto é pedido, não uma "taxa de inflação" à parte** — a
taxa homóloga (variação a 12 meses) e qualquer taxa acumulada entre duas
datas quaisquer calculam-se a partir do índice (`src/lib/inflation.ts`),
o que permite comparar o valor investido com a inflação acumulada
EXATAMENTE desde a data da primeira transação de cada ativo, não só desde
o último mês.

**Sobre "diário/semanal/mensal"** — a inflação só é publicada
mensalmente (não existe uma "inflação diária" publicada em lado nenhum,
nem pelo INE nem pelo Banco de Portugal). Os valores por dia/semana/mês
mostrados no cartão são uma **projeção matemática** a partir da taxa
anual real (juro composto, `taxaEquivalentePeriodo` em
`src/lib/inflation.ts`) — o cartão deixa isto explícito na interface, não
é dados diários genuínos.

**Matemática** (equação de Fisher, `calcularPoderDeCompra`):
```
taxaReal = (1 + taxaNominal) / (1 + taxaInflaçãoAcumulada) − 1
```
Positiva = o valor cresceu mais do que a inflação (ganhaste poder de
compra); negativa = cresceu menos, mesmo que o valor nominal tenha subido.

**Cobertura:** começou só com "Poupanças"/"Fundo de Emergência", para
validar o KPI nessas duas categorias, e foi depois alargado a todos os
ativos do portefólio.

**Campo "Finalidade"** (coluna `purpose`, `src/core/types.ts`) — marca um
ativo como sendo (ou albergando) o fundo de emergência/poupança
independentemente da categoria (ex: o fundo de emergência guardado num
Certificado de Aforro, categoria própria), só para mostrar o crachá no
cartão. Não afeta a inclusão no KPI (que já cobre todos os ativos) nem
duplica valor nenhum — é a mesma linha de sempre só com uma leitura
extra.

## Segurança

- **Cabeçalhos HTTP** (`src/lib/security/headers.ts`, aplicados em
  `src/proxy.ts`): Content-Security-Policy com nonce por pedido,
  Strict-Transport-Security, X-Frame-Options, X-Content-Type-Options,
  Referrer-Policy, Permissions-Policy — o equivalente ao "helmet" do
  Express, adaptado ao runtime serverless/edge do Next.js.
- **CSRF em Server Actions:** o Next.js já compara a origem de cada pedido
  a uma Server Action com o domínio do host, e rejeita se não coincidir —
  não há API de dados exposta nesta app (só Server Actions e o
  `GET /auth/callback` do link de recuperação), por isso não há "CORS" a
  configurar; o comportamento por omissão (só o próprio domínio) já é o que
  se quer.
- **Só membros da família entram** (`ehMembro()` em
  `src/lib/security/sessionActivity.ts`): a conta tem de ter
  `app_metadata.membro = true`, que só a Admin API (chave service_role)
  consegue escrever. **A app não cria contas:** criam-se só no painel do
  Supabase (Authentication → Users → Add user, com "Auto Confirm User") e
  marcam-se com `supabase/membros.sql` no SQL Editor (ou
  `npm run membros -- marcar <email>`). O registo público tem de estar
  desligado no Supabase (Authentication → Sign In / Providers → "Allow new
  users to sign up"); mesmo que alguém o volte a ligar, uma conta criada
  assim nunca entra, porque não tem a marca.
- **Base de dados fechada às chaves públicas** (`supabase/policies.sql`):
  RLS ligado e nenhuma policy para `anon`/`authenticated` — a app só usa a
  chave service_role, no servidor; pela API REST do Supabase, com a chave
  anon (que é pública), não se lê nem escreve nada.
- **Rate limiting** (`LIMITES_TENTATIVAS` em `src/core/services/authService.ts`), no login, na
  confirmação da password atual e no pedido de recuperação: 10 tentativas/minuto por email+IP e 20/10
  min só por email (apanha ataques a partir de vários IPs). Com Upstash
  (`UPSTASH_REDIS_REST_URL`/`TOKEN` — obrigatório em produção) o limite é
  partilhado por todas as instâncias; sem ele fica em memória, por
  instância (nunca sem limite nenhum).
- **Sessão** (`src/proxy.ts` + `src/lib/security/sessionActivity.ts`):
  cookies HTTP-only geridos pelo Supabase Auth (o JWT nunca fica acessível
  a JavaScript) e um cookie de atividade assinado com HMAC. A sessão
  termina com **30 min sem atividade** ou ao fim de **12 h**, e também se
  esse cookie faltar ou for adulterado.
- **Password:** mínimo 10 caracteres com maiúscula, minúscula e número;
  mudá-la pede a password atual (só o link de recuperação, durante 15
  min, a dispensa) e termina as outras sessões abertas.

## Trocar de stack

A lógica não depende do fornecedor. O `src/core/` (tipos, regras de negócio
e **regras de segurança**) só conhece interfaces (`src/core/ports/`) — nunca
o Supabase, o Upstash nem o Next.js:

| Para trocar | Escrever | E mudar |
|---|---|---|
| Base de dados | um adapter por repositório de `core/ports/repositories.ts` | `src/composition/container.ts` |
| Autenticação | um `FornecedorAutenticacao` (`core/ports/auth.ts`) | `src/composition/autenticacao.ts` |
| Limite de tentativas | um `LimitadorTentativas` (`core/ports/auth.ts`) | `src/composition/autenticacaoPedido.ts` |
| Framework web | as páginas, as Server Actions, o proxy e os cookies | — o `core/` e os `adapters/` ficam |

As regras de segurança estão em `src/core/services/authService.ts` e são
testadas com fornecedores falsos (`authService.test.ts`), por isso valem
para qualquer implementação: limite de tentativas antes de experimentar a
password, só membros entram (uma conta sem a marca fecha logo a sessão e
responde como password errada), a password atual é obrigatória para a
mudar (exceto pelo link de recuperação) e as outras sessões terminam, e o
pedido de recuperação responde sempre igual. O timeout da sessão
(`src/lib/security/sessionActivity.ts`) e o reforço dos cookies
(HTTP-only/Secure, aplicado na composição) também não dependem do fornecedor.

O que um fornecedor novo tem de garantir por si:
- **membro** só pode ser escrito por um administrador (no Supabase:
  `app_metadata`, nunca `user_metadata`);
- a base de dados **não** fica acessível com credenciais públicas (no
  Supabase: `supabase/policies.sql`) e o registo público fica desligado;
- `utilizadorAtual()` valida a sessão no fornecedor, não só no cookie.

## A correr localmente

```bash
cp .env.example .env   # preenche com as credenciais do teu projeto Supabase
npm install
npm run seed             # cria o utilizador inicial, já como membro (e dados de demo, se SEED_DEMO_DATA=true)
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000) e entra com o
`INITIAL_USER_EMAIL` / `INITIAL_USER_PASSWORD` que definiste no `.env`
(usa uma password forte — as regras de "Segurança" só são verificadas
quando a mudas dentro da app).

Para dar acesso a mais pessoas: cria a conta no painel do Supabase
(Authentication → Users → Add user, com "Auto Confirm User") e depois

```bash
npm run membros                          # lista as contas e quem é membro
npm run membros -- marcar <email>        # dá acesso
npm run membros -- desmarcar <email>     # tira o acesso
```

**Antes de começar a usar a app a sério** (dados reais, não de teste):
se alguma vez correste `npm run seed` com `SEED_DEMO_DATA=true`, corre
`supabase/clean-demo-data.sql` no SQL Editor do Supabase — apaga só os 3
ativos de demonstração (ETF MSCI World, Depósito a Prazo — Banco X,
Bitcoin) e as suas transações/valorizações; não toca em utilizadores nem
em nada que tenhas criado tu. Confirma também que `SEED_DEMO_DATA` não
fica `true` nas variáveis de ambiente de produção (Vercel), para não
voltar a entrar num redeploy que corra a seed outra vez.

## Testes

```bash
npm test
```

Cobrem a lógica de negócio pura, sem precisar de ligação à base de dados:

- `src/lib/calculations.test.ts` — cost basis, rendimento, YTD, alocação,
  série temporal e ranking de desempenho, incluindo um caso que apanhou um
  bug real: o ganho YTD em euros de um ativo comprado antes do ano corrente
  mas sem valorização registada antes de 1 de janeiro estava a contar o
  capital investido em anos anteriores como se fosse ganho deste ano
  (corrigido — ver comentário em `computeYtd`).
- `src/lib/validation.test.ts` — regras dos formulários (zod).
- `src/lib/inflation.test.ts` — variação do índice de preços, taxas
  equivalentes por período e poder de compra (equação de Fisher).
- `src/core/services/userService.test.ts` — email duplicado não chega a
  chamar a Admin API do Supabase, usando um fake do port `RepositorioPerfil`.
- `src/core/services/authService.test.ts` — regras de segurança do login
  (limite de tentativas, só membros, mudança e recuperação de password).
- `src/lib/security/sessionActivity.test.ts` — timeout da sessão e cookie de
  atividade assinado.
- `src/adapters/**/*.test.ts` — adapter de autenticação do Supabase e
  limitador de tentativas em memória.

## Deploy

Pensada para viver num subdomínio próprio (ex: `investimento.oteudominio.com`):

- **Vercel (recomendado).** Liga o repositório, adiciona o subdomínio ao
  projeto (Settings → Domains) e aponta um CNAME no DNS do teu domínio —
  o Vercel emite o certificado TLS automaticamente. Define as variáveis de
  ambiente do `.env.example` no projeto (incluindo as do Upstash e, se a
  usares, a da Alpha Vantage); o deploy é automático a cada push. Atualiza
  também o "Site URL" e os "Redirect URLs" do Supabase para o endereço de
  produção.
- **Subdomínio próprio (VPS / servidor de casa).** `npm run build` + `npm run start`
  (porta configurável via `PORT`) atrás de um reverse proxy (ex: Caddy ou
  nginx) com HTTPS.

**Nota:** projetos Supabase no plano free pausam automaticamente ao fim de
~7 dias sem pedidos. Para uma app de consulta esporádica (ex: ver o
portefólio uma vez por mês), considera um Vercel Cron Job semanal que faça
um pedido leve à app só para a manter acordada.

## Notas

- O livro-razão (`transactions`) é append-only por natureza: editar só para
  corrigir erros de introdução, nunca para "ajustar" ao valor de mercado —
  isso é o papel de `valuation_snapshots`.
- Uma marcação de valor por ativo/dia: reintroduzir "hoje" atualiza em vez
  de duplicar (`unique(asset_id, date)`).
