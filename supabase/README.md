# Supabase

1. Crie um projeto no Supabase.
2. Aplique as migrations: `npx supabase link --project-ref <ref> && npx supabase db push`
   (ou cole o SQL de `migrations/` no SQL Editor).
3. Configure os provedores OAuth: veja [`docs/auth-setup.md`](../docs/auth-setup.md).

## Projeto atual

`Skill_Roadmap` (ref `wbhkrsabfkmhtrkuncqh`, região us-east-1). Migrations já aplicadas; RLS ativo nas 5 tabelas.
URL: `https://wbhkrsabfkmhtrkuncqh.supabase.co`. A `service_role` key e a `DATA_ENCRYPTION_KEY` devem ser
copiadas manualmente (Dashboard → Settings → API) para `.env.local` e para a Vercel — não passam pelo código.
