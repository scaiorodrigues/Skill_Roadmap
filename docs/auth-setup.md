# Configuração de Auth

1. No Supabase: *Authentication → Providers* → habilite **Google** e **GitHub**.
2. Redirect URL do provedor (Google/GitHub): `https://<project>.supabase.co/auth/v1/callback`.
3. Em *Authentication → URL Configuration*:
   - Site URL: valor de `NEXT_PUBLIC_APP_URL`
   - Redirect URLs: `${NEXT_PUBLIC_APP_URL}/auth/callback` (e `http://localhost:3000/auth/callback`).
4. Copie `.env.example` para `.env.local` e preencha.
