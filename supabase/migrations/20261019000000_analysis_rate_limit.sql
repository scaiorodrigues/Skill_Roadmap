-- Reserva atômica de 1 análise por ciclo. Retorna NULL se reservou, ou a data em que a próxima fica disponível.
create function public.claim_analysis(p_user uuid, p_days int default 30) returns timestamptz
language plpgsql security definer set search_path = '' as $$
declare v_next timestamptz;
begin
  perform pg_advisory_xact_lock(hashtext(p_user::text));
  select max(next_available) into v_next
    from public.analysis_usage
   where user_id = p_user and next_available > now();
  if v_next is not null then
    return v_next;
  end if;
  insert into public.analysis_usage (user_id, used_at, next_available)
  values (p_user, now(), now() + make_interval(days => p_days));
  return null;
end $$;

-- Devolve a reserva quando a geração falha (o usuário não perde a análise do mês).
create function public.release_analysis(p_user uuid) returns void
language sql security definer set search_path = '' as $$
  delete from public.analysis_usage
   where id = (select id from public.analysis_usage where user_id = p_user order by used_at desc limit 1);
$$;

revoke execute on function public.claim_analysis(uuid, int), public.release_analysis(uuid) from public, anon, authenticated;
grant execute on function public.claim_analysis(uuid, int), public.release_analysis(uuid) to service_role;
