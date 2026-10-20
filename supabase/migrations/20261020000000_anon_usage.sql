-- Contador diário de uso sem login (protege a chave do Gemini). Guarda só um hash do IP e a contagem do dia.
create table public.anon_usage (
  bucket text not null,
  day date not null,
  count int not null default 0,
  primary key (bucket, day)
);
alter table public.anon_usage enable row level security;   -- sem policies: só o service_role acessa
revoke all on public.anon_usage from anon, authenticated;

-- Reserva 1 uso. Retorna 'ok', 'bucket' (limite do aparelho/IP atingido) ou 'global' (teto diário do app atingido).
create function public.claim_usage(p_bucket text, p_limit int, p_global_limit int) returns text
language plpgsql security definer set search_path = '' as $$
declare
  v_day date := (now() at time zone 'America/Sao_Paulo')::date;
  v_g int;
  v_b int;
begin
  perform pg_advisory_xact_lock(hashtext('claim_usage'));
  delete from public.anon_usage where day < v_day - 2;
  select count into v_g from public.anon_usage where bucket = 'global' and day = v_day;
  if coalesce(v_g, 0) >= p_global_limit then return 'global'; end if;
  select count into v_b from public.anon_usage where bucket = p_bucket and day = v_day;
  if coalesce(v_b, 0) >= p_limit then return 'bucket'; end if;
  insert into public.anon_usage (bucket, day, count) values ('global', v_day, 1), (p_bucket, v_day, 1)
  on conflict (bucket, day) do update set count = public.anon_usage.count + 1;
  return 'ok';
end $$;

-- Devolve a reserva quando a IA falha.
create function public.release_usage(p_bucket text) returns void
language sql security definer set search_path = '' as $$
  update public.anon_usage set count = greatest(count - 1, 0)
   where day = (now() at time zone 'America/Sao_Paulo')::date and bucket in ('global', p_bucket);
$$;

revoke execute on function public.claim_usage(text, int, int), public.release_usage(text) from public, anon, authenticated;
grant execute on function public.claim_usage(text, int, int), public.release_usage(text) to service_role;
