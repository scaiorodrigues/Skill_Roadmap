# Skill RoadMap — Visão do Produto

**Organização:** FromTech · **Licença:** MIT · **Idioma padrão:** Português (Brasil)

## O que é

Skill RoadMap é um web app open source que funciona como um **GPS de carreira pessoal**.
O usuário importa seu perfil do LinkedIn, recebe os 5 caminhos de carreira mais rentáveis
para o seu perfil atual (+1 caminho livre, descrito por ele), escolhe um e recebe um roadmap
completo com skills, cursos, ferramentas e certificações priorizadas. O progresso é
acompanhado por integrações externas e re-importação periódica do LinkedIn.

**Não é** uma rede social. **Não é** um marketplace de cursos. É a melhor ferramenta de
planejamento de carreira individual possível.

## Público-alvo

Qualquer profissional que usa computador, independente de setor.

## Stack

| Camada | Tecnologia |
| --- | --- |
| Frontend | Next.js 14 (App Router), TypeScript, Tailwind CSS |
| Backend/DB | Supabase (PostgreSQL + RLS + pgcrypto + Auth) |
| Auth | Supabase Auth — Google OAuth + GitHub OAuth (sem senha própria) |
| IA | Google Gemini Flash, apenas server-side (rotas de API do Next.js) |
| Hosting | Vercel (frontend) + Supabase (banco) |
| CI/CD | GitHub Actions |

A chave do Gemini é da FromTech, vive em variável de ambiente e **nunca** é exposta ao cliente.

## Fluxo do produto

1. **Login** — Google ou GitHub via Supabase Auth. Sem cadastro manual.
2. **Onboarding** — upload do `.zip` exportado do LinkedIn
   (*Settings → Data Privacy → Get a copy of your data*). Extraímos cargo atual, experiências,
   skills, formação, certificações e tempo de carreira.
3. **Pesquisa de mercado (5+1)** — a IA gera os 5 caminhos mais rentáveis, em ordem
   decrescente de faixa salarial, mais um campo aberto para um caminho de interesse pessoal.
   Cada card traz: cargo, faixa salarial (Brasil / remoto / exterior), concentração geográfica,
   nível de stress (baixo/médio/alto), benefícios, reclamações frequentes e tags filtráveis.
   Filtrar/reordenar por tag **não** consome nova análise de IA.
4. **Roadmap completo** — skills por área com barra de progresso (0–100%); por skill:
   plataformas, cursos com links, certificações, estimativa de tempo; projetos de portfólio
   por fase; graduações/pós com avaliação custo/benefício; priorização clara.
5. **Perfil para o seu momento** — 3 sugestões de LinkedIn + 3 de GitHub para cada momento:
   - **Agora** (perfil de transição)
   - **Em evolução** (6–12 meses)
   - **Pronto para a vaga-alvo**
6. **Tracking de progresso** — GitHub (OAuth), Duolingo (API não oficial) e re-import do
   LinkedIn (cobre Coursera, Udemy, Alura, DIO etc. via certificações).
7. **Rate limiting de IA** — 1 análise completa (pesquisa + roadmap) por mês por usuário.
   Ver roadmap, filtrar e atualizar progresso é ilimitado.

## Tags de caminhos de carreira

`remoto`, `alta-demanda`, `mercado-crescente`, `técnico-pesado`, `liderança`,
`internacional`, `entrada-acessível` + tags específicas por setor.

## Rate limiting

- 1 análise completa por usuário por ciclo de 30 dias.
- O ciclo conta a partir do primeiro uso (`analysis_usage.used_at`); `next_available = used_at + 30 dias`.
- Ao atingir o limite: *"Sua próxima análise estará disponível em [dia], [data] às [hora]"*
  (fuso America/Sao_Paulo).

## Princípios

- **Privacidade primeiro (LGPD):** consentimento explícito, exportação e exclusão de dados,
  dados sensíveis criptografados, logs sem PII.
- **IA como serviço de servidor:** o cliente nunca fala com o Gemini.
- **Sem lock-in:** o usuário pode exportar tudo e apagar a conta a qualquer momento.

## Fora de escopo

Rede social, marketplace de cursos, senha própria, cadastro manual de usuários.
