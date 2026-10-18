# Skill RoadMap — Especificação de Tracking de Progresso

## Fontes

| Fonte | Mecanismo | O que mede |
| --- | --- | --- |
| GitHub | OAuth (escopo `read:user`, `public_repo` leitura) | linguagens, repositórios, frequência de commits, projetos |
| Duolingo | API não oficial (usuário informa username) | streak, nível, XP por idioma |
| LinkedIn re-import | novo `.zip` do export | certificações e skills novas |

Plataformas sem API (Coursera, Udemy, Alura, DIO…) são cobertas pelo re-import do LinkedIn,
que agrega as certificações.

## Pipeline

1. Coleta → `progress_snapshots.raw_data` (uma linha por coleta e fonte).
2. Mapeamento → IA/regra associa evidências às skills do roadmap
   (`processed_skills`: `[{ skill_id, evidence, confidence }]`).
3. Cálculo de progresso por skill (0–100%) e por área (média ponderada pela prioridade).
4. O roadmap exibe o último snapshot por fonte.

## Regras de progresso (v1)

- Skill com certificação reconhecida no LinkedIn → piso de 80%.
- Skill com ≥1 projeto de portfólio no GitHub na linguagem/tecnologia → +20%.
- Idiomas (Duolingo): progresso = nível CEFR estimado / nível alvo.
- Re-import do LinkedIn recalcula via IA e **consome** uma análise apenas se o usuário
  pedir regeneração do roadmap; recalcular progresso não conta no limite mensal.

## Rate limiting

- 1 análise completa (pesquisa + roadmap) por 30 dias por usuário.
- Verificação atômica no servidor antes de chamar o Gemini; registra em `analysis_usage`.
- Resposta 429 com `next_available`; UI exibe
  "Sua próxima análise estará disponível em [dia], [data] às [hora]".
- Ilimitado: ver roadmap, filtrar por tags, atualizar progresso.

## Segurança

Tokens de integração criptografados (pgcrypto); revogação disponível; coleta apenas de dados públicos/necessários.
