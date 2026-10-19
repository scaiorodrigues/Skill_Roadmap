# Deploy (Netlify + Supabase)

O Netlify detecta o Next.js automaticamente (`netlify.toml` só fixa Node 22).

## 1. Conectar o repositório
Netlify → *Add new site* → *Import from Git* → GitHub → `scaiorodrigues/Skill_Roadmap`, branch `main`.

## 2. Variáveis de ambiente
Site configuration → Environment variables. Defina **antes do primeiro build**
(`NEXT_PUBLIC_*` são embutidas no build):

| Variável | Valor | Escopo |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | `https://wbhkrsabfkmhtrkuncqh.supabase.co` | build + runtime |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | chave publishable/anon | build + runtime |
| `NEXT_PUBLIC_APP_URL` | URL do site no Netlify (https) | build + runtime |
| `SUPABASE_SERVICE_ROLE_KEY` | secret key do Supabase | **secret**, só runtime |
| `GOOGLE_GEMINI_API_KEY` | chave do AI Studio | **secret**, só runtime |
| `DATA_ENCRYPTION_KEY` | `openssl rand -base64 32` | **secret**, só runtime |

Marque as três últimas como *Contains secret values*. Nunca use o prefixo `NEXT_PUBLIC_` em segredos.

## 3. Supabase Auth
Com a URL do Netlify definida:
- *Authentication → URL Configuration*: Site URL = URL do Netlify; Redirect URLs += `https://<site>.netlify.app/auth/callback`.
- Provedores Google/GitHub: callback continua `https://wbhkrsabfkmhtrkuncqh.supabase.co/auth/v1/callback`.

## 4. Re-deploy
Após mudar variáveis `NEXT_PUBLIC_*`, faça *Trigger deploy → Clear cache and deploy*.
