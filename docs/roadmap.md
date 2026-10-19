# Plano de implementação

- [x] 1. Documentação fundacional
- [x] 2. Scaffold Next.js + TypeScript + Tailwind
- [x] 3. Migrations Supabase com RLS (aplicar no projeto: ver `supabase/README.md`)
- [x] 4. Configuração de auth (Google + GitHub) — ver `docs/auth-setup.md`
- [x] 5. Página de login funcional
- [x] 6. Onboarding: consentimento LGPD + upload do .zip LinkedIn (parser no navegador, perfil cifrado no servidor)
- [x] 7. Integração Gemini Flash: rota /api/analyze (perfil → 5 caminhos), com limite de 1 análise a cada 30 dias
- [x] 8. Tela de resultados com os 5+1 cards, filtro por tags e ordenação (sem nova chamada de IA)
- [ ] 9. Geração do roadmap completo
- [ ] 10. Sugestões de perfil por momento
- [ ] 11. Integrações de progresso (GitHub, depois Duolingo)
- [x] 12. Rate limiting com mensagem de retorno (claim_analysis atômico no banco)
