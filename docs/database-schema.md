# Skill RoadMap — Schema do Banco (Supabase / PostgreSQL)

Fonte da verdade: [`supabase/migrations`](../supabase/migrations). Este documento descreve o modelo.

**RLS é obrigatório em todas as tabelas:** cada usuário acessa apenas seus próprios dados.
Operações privilegiadas (criptografia, rate limit, exportação/exclusão) rodam server-side
com a `SUPABASE_SERVICE_ROLE_KEY`.

## profiles
| Coluna | Tipo | Notas |
| --- | --- | --- |
| id | uuid PK | referencia `auth.users(id)` ON DELETE CASCADE |
| full_name | text | |
| avatar_url | text | |
| github_username | text | |
| linkedin_data | bytea | dados extraídos do export, criptografados com pgcrypto |
| consented_at | timestamptz | consentimento LGPD (primeiro login) |
| consent_version | text | versão dos termos aceitos |
| created_at / updated_at | timestamptz | default now() |

> O esquema original previa `linkedin_data jsonb`. Como o dado deve ser criptografado com
> pgcrypto (`pgp_sym_encrypt` retorna `bytea`), a coluna é `bytea`; o JSON é serializado
> antes de criptografar e a chave simétrica fica em env (`DATA_ENCRYPTION_KEY`), nunca no banco.

## analyses
| Coluna | Tipo | Notas |
| --- | --- | --- |
| id | uuid PK | gen_random_uuid() |
| user_id | uuid FK → profiles | |
| linkedin_hash | text | hash do export, detecta mudanças |
| raw_profile | jsonb | perfil processado pela IA |
| roadmap_options | jsonb | os 5+1 resultados |
| chosen_roadmap | jsonb | roadmap completo do caminho escolhido |
| profile_tips | jsonb | sugestões LinkedIn + GitHub por momento |
| created_at | timestamptz | |

## analysis_usage
| Coluna | Tipo | Notas |
| --- | --- | --- |
| id | uuid PK | |
| user_id | uuid FK → profiles | |
| used_at | timestamptz | default now() |
| next_available | timestamptz | `used_at + 30 dias` |

Escrita apenas via service role (o usuário não pode se auto-conceder análises). Leitura própria permitida.

## progress_snapshots
| Coluna | Tipo | Notas |
| --- | --- | --- |
| id | uuid PK | |
| user_id | uuid FK → profiles | |
| source | text | `linkedin` \| `github` \| `duolingo` (CHECK) |
| raw_data | jsonb | |
| processed_skills | jsonb | skills mapeadas ao roadmap |
| snapshot_at | timestamptz | |

## integrations
| Coluna | Tipo | Notas |
| --- | --- | --- |
| id | uuid PK | |
| user_id | uuid FK → profiles | UNIQUE (user_id, provider) |
| provider | text | `github` \| `duolingo` (CHECK) |
| access_token | bytea | criptografado com pgcrypto |
| token_expires | timestamptz | |
| connected_at | timestamptz | |

O cliente nunca lê `access_token`: a tabela não tem policy de SELECT para `authenticated`
sobre essa coluna (acesso só via service role / view segura `integrations_public`).

## Criptografia
`pgp_sym_encrypt(data, key)` / `pgp_sym_decrypt`. A chave (`DATA_ENCRYPTION_KEY`) é passada
pelo servidor por chamada de RPC e nunca persistida. Funções `encrypt_secret` / `decrypt_secret`
são `SECURITY DEFINER` e executáveis somente por `service_role`.

## Logs
Logs de acesso registram apenas `user_id` opaco, rota, status e latência — sem e-mail, nome ou conteúdo do perfil.
