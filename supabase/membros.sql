-- ════════════════════════════════════════════════════════════════════════
-- Dar acesso à app a uma conta criada no painel do Supabase.
--
-- 1. Authentication → Users → "Add user" → "Create new user": email,
--    password e "Auto Confirm User" ligado.
-- 2. Aqui, no SQL Editor: troca o email e corre. Sem esta marca
--    (app_metadata.membro), a conta não entra na app — é o que impede uma
--    conta criada pelo signup público de entrar (ver
--    src/adapters/supabase/authProvider.ts e core/services/authService.ts).
-- ════════════════════════════════════════════════════════════════════════

-- uma ou mais contas, separadas por vírgulas
update auth.users
set raw_app_meta_data = coalesce(raw_app_meta_data, '{}'::jsonb) || '{"membro": true}'::jsonb
where email in ('primeira@exemplo.pt', 'segunda@exemplo.pt');

-- Ver quem tem acesso:
-- select email, created_at, last_sign_in_at, raw_app_meta_data ->> 'membro' as membro
-- from auth.users order by created_at;

-- Tirar o acesso (vale logo, mesmo com sessão aberta):
-- update auth.users
-- set raw_app_meta_data = raw_app_meta_data - 'membro'
-- where email = 'nome@exemplo.pt';
