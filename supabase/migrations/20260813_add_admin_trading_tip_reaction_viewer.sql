begin;

-- Individual reactions already carry tip_id, user_id, emoji and created_at.
-- This RPC exposes identity details only after an administrator check.
create or replace function public.admin_get_trading_tip_reactions(
  p_tip_id uuid,
  p_emoji text default null,
  p_limit integer default 50,
  p_offset integer default 0
)
returns table (
  id uuid,
  user_id uuid,
  emoji text,
  created_at timestamptz,
  full_name text,
  avatar text,
  email text
)
language plpgsql
security definer
set search_path = public, auth
as $$
begin
  if not public.is_admin() then
    raise exception 'Administrator access required';
  end if;

  return query
  select
    reaction.id,
    reaction.user_id,
    reaction.emoji,
    reaction.created_at,
    coalesce(nullif(trim(profile.full_name), ''), 'Learner'),
    profile.avatar,
    account.email::text
  from public.trading_tip_reactions as reaction
  left join public.profiles as profile on profile.id = reaction.user_id
  left join auth.users as account on account.id = reaction.user_id
  where reaction.tip_id = p_tip_id
    and (p_emoji is null or reaction.emoji = p_emoji)
  order by reaction.created_at desc
  limit greatest(1, least(coalesce(p_limit, 50), 100))
  offset greatest(0, coalesce(p_offset, 0));
end;
$$;

revoke all on function public.admin_get_trading_tip_reactions(uuid, text, integer, integer) from public, anon;
grant execute on function public.admin_get_trading_tip_reactions(uuid, text, integer, integer) to authenticated;

commit;
