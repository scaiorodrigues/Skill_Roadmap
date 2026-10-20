# Deploy (Netlify + Supabase)

O app é local-first: **sem login e sem conta**. O histórico de cada pessoa fica no navegador dela (IndexedDB).
O servidor só repassa o perfil ao Gemini e não guarda nada dele. O Supabase guarda apenas um contador diário de uso
(hash do IP + contagem), para proteger o custo da IA.

## Variáveis de ambiente (Netlify → Project configuration → Environment variables)

| Variável | Valor | Secreta? |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | `https://wbhkrsabfkmhtrkuncqh.supabase.co` | Não |
| `SUPABASE_SERVICE_ROLE_KEY` | secret key do Supabase (`sb_secret_...`) | **Sim** |
| `GOOGLE_GEMINI_API_KEY` | chave do [AI Studio](https://aistudio.google.com/apikey), começa com `AIza` | **Sim** |

Opcionais: `GEMINI_MODEL`, `ANALYSIS_DAILY_LIMIT_PER_IP` (3), `CUSTOM_DAILY_LIMIT_PER_IP` (6), `ANALYSIS_DAILY_LIMIT_GLOBAL` (300).

## Banco
Aplique as migrations de `supabase/migrations`. A `20261020000000_anon_usage.sql` cria o contador diário. **Sem ela o app recusa as
análises** (por segurança, nunca libera a IA sem controle de custo).

## Proteção de custo
Defina também um teto de gasto e alertas no Google Cloud para a chave do Gemini.
