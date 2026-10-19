-- O trigger não precisa de EXECUTE; evita chamada via /rest/v1/rpc (advisor 0028/0029)
revoke execute on function public.handle_new_user() from public, anon, authenticated;
