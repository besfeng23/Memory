create or replace function public.first_live_append_proof_smoke()
returns jsonb
language sql
security invoker
as $$
  select jsonb_build_object('ok', true, 'appendOnly', true);
$$;

grant execute on function public.first_live_append_proof_smoke() to authenticated;
