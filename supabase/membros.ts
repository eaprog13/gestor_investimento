// Gere quem é membro da família (app_metadata.membro) — só membros entram na
// app, ver src/adapters/supabase/authProvider.ts e core/services/authService.ts.
//
//   npm run membros                          lista as contas e quem é membro
//   npm run membros -- marcar a@x.pt b@y.pt  marca estas contas como membros
//   npm run membros -- desmarcar c@z.pt      tira o acesso a esta conta
//
// A app não cria contas: criam-se no painel do Supabase (Authentication >
// Users) e marcam-se aqui ou com supabase/membros.sql no SQL Editor. Serve
// também para rever se alguém criou conta pelo signup público do Supabase:
// uma conta que ninguém da família reconhece NÃO se marca — apaga-se no
// painel do Supabase.

import "dotenv/config";
import { createClient, type User } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const chaveServico = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !chaveServico) {
  console.error("NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY em falta no .env.");
  process.exit(1);
}

const bd = createClient(url, chaveServico, { auth: { autoRefreshToken: false, persistSession: false } });

async function todasAsContas(): Promise<User[]> {
  const contas: User[] = [];
  for (let pagina = 1; ; pagina++) {
    const { data, error } = await bd.auth.admin.listUsers({ page: pagina, perPage: 200 });
    if (error) throw new Error(error.message);
    contas.push(...data.users);
    if (data.users.length < 200) return contas;
  }
}

async function listar() {
  const contas = await todasAsContas();
  console.log(`${contas.length} conta(s):\n`);
  for (const u of contas) {
    const membro = u.app_metadata?.membro === true;
    console.log(
      `${membro ? "[membro]   " : "[SEM ACESSO]"} ${u.email}  ` +
        `(criada ${u.created_at.slice(0, 10)}, último login ${u.last_sign_in_at?.slice(0, 10) ?? "nunca"})`,
    );
  }
  console.log('\nPara dar acesso: npm run membros -- marcar <email> [<email>...]');
}

async function definir(emails: string[], membro: boolean) {
  if (emails.length === 0) {
    console.error("Indica pelo menos um email.");
    process.exitCode = 1;
    return;
  }
  const contas = await todasAsContas();
  for (const email of emails) {
    const conta = contas.find((u) => u.email?.toLowerCase() === email.toLowerCase());
    if (!conta) {
      console.error(`Não existe nenhuma conta com o email "${email}".`);
      process.exitCode = 1;
      continue;
    }
    const { error } = await bd.auth.admin.updateUserById(conta.id, {
      app_metadata: { ...conta.app_metadata, membro },
    });
    if (error) throw new Error(error.message);
    // o proxy lê a conta do Supabase em cada pedido: tirar o acesso vale logo, mesmo com sessão aberta
    console.log(`${email}: ${membro ? "marcada como membro" : "acesso retirado"}.`);
  }
}

const [comando, ...emails] = process.argv.slice(2);
const tarefa =
  comando === "marcar" ? definir(emails, true) : comando === "desmarcar" ? definir(emails, false) : listar();

tarefa.catch((erro) => {
  console.error(erro);
  process.exitCode = 1;
});
