-- Skill RoadMap: schema inicial. Ver docs/database-schema.md
create extension if not exists pgcrypto with schema extensions;

-- profiles ---------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  avatar_url text,
  github_username text,
  linkedin_data bytea,            -- pgp_sym_encrypt(json)
  consented_at timestamptz,
  consent_version text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.analyses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  linkedin_hash text,
  raw_profile jsonb,
  roadmap_options jsonb,
  chosen_roadmap jsonb,
  profile_tips jsonb,
  created_at timestamptz not null default now()
);

create table public.analysis_usage (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  used_at timestamptz not null default now(),
  next_available timestamptz not null default (now() + interval '30 days')
);

create table public.progress_snapshots (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  source text not null check (source in ('linkedin', 'github', 'duolingo')),
  raw_data jsonb,
  processed_skills jsonb,
  snapshot_at timestamptz not null default now()
);

create table public.integrations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  provider text not null check (provider in ('github', 'duolingo')),
  access_token bytea,             -- pgp_sym_encrypt(token)
  token_expires timestamptz,
  connected_at timestamptz not null default now(),
  unique (user_id, provider)
);

create index on public.analyses (user_id, created_at desc);
create index on public.analysis_usage (user_id, used_at desc);
create index on public.progress_snapshots (user_id, source, snapshot_at desc);

-- updated_at ---------------------------------------------------------------
create function public.set_updated_at() returns trigger
language plpgsql set search_path = '' as $$
begin new.updated_at = now(); return new; end $$;

create trigger profiles_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();

-- cria profile no primeiro login --------------------------------------------
create function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id, full_name, avatar_url, github_username)
  values (
    new.id,
    new.raw_user_meta_data ->> 'full_name',
    new.raw_user_meta_data ->> 'avatar_url',
    new.raw_user_meta_data ->> 'user_name'
  )
  on conflict (id) do nothing;
  return new;
end $$;

create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- RLS ------------------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.analyses enable row level security;
alter table public.analysis_usage enable row level security;
alter table public.progress_snapshots enable row level security;
alter table public.integrations enable row level security;

-- profiles: leitura/edição própria (linkedin_data é bytea cifrado; ainda assim
-- o cliente não precisa dele, então revogamos a coluna abaixo)
create policy "profiles_select_own" on public.profiles for select to authenticated using (id = (select auth.uid()));
create policy "profiles_update_own" on public.profiles for update to authenticated
  using (id = (select auth.uid())) with check (id = (select auth.uid()));

create policy "analyses_select_own" on public.analyses for select to authenticated using (user_id = (select auth.uid()));
create policy "analyses_delete_own" on public.analyses for delete to authenticated using (user_id = (select auth.uid()));
-- inserts/updates de analyses só via servidor (service role), após checar rate limit

create policy "usage_select_own" on public.analysis_usage for select to authenticated using (user_id = (select auth.uid()));
-- escrita em analysis_usage somente via service role

create policy "snapshots_select_own" on public.progress_snapshots for select to authenticated using (user_id = (select auth.uid()));
create policy "snapshots_insert_own" on public.progress_snapshots for insert to authenticated with check (user_id = (select auth.uid()));
create policy "snapshots_delete_own" on public.progress_snapshots for delete to authenticated using (user_id = (select auth.uid()));

create policy "integrations_select_own" on public.integrations for select to authenticated using (user_id = (select auth.uid()));
create policy "integrations_delete_own" on public.integrations for delete to authenticated using (user_id = (select auth.uid()));
-- insert/update de tokens somente via servidor (cifra antes de gravar)

-- cliente não lê dados cifrados nem os tokens
revoke all on public.profiles from anon, authenticated;
grant select (id, full_name, avatar_url, github_username, consented_at, consent_version, created_at, updated_at)
  on public.profiles to authenticated;
grant update (full_name, avatar_url, github_username, consented_at, consent_version)
  on public.profiles to authenticated;

revoke all on public.integrations from anon, authenticated;
grant select (id, user_id, provider, token_expires, connected_at) on public.integrations to authenticated;
grant delete on public.integrations to authenticated;

revoke all on public.analyses, public.analysis_usage, public.progress_snapshots from anon;
revoke insert, update on public.analyses, public.analysis_usage from authenticated;

-- criptografia (somente service_role) -----------------------------------------
create function public.encrypt_secret(plain text, key text) returns bytea
language sql security definer set search_path = '' as
$$ select extensions.pgp_sym_encrypt(plain, key) $$;

create function public.decrypt_secret(cipher bytea, key text) returns text
language sql security definer set search_path = '' as
$$ select extensions.pgp_sym_decrypt(cipher, key) $$;

revoke execute on function public.encrypt_secret(text, text), public.decrypt_secret(bytea, text) from public, anon, authenticated;
grant execute on function public.encrypt_secret(text, text), public.decrypt_secret(bytea, text) to service_role;
