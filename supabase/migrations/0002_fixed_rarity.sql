-- Fixed-rarity scoring. km and tier now come from each answer's fixed rarity (passed in as p_prior), not from a
-- crowd blend. The crowd counts are still kept, for display only. Mirrors lib/scoring.ts and lib/store/memory.ts.
-- The signature (including the p_prior name) is unchanged, so this can be applied before or after the app deploys.

create or replace function otm_submit_answer(
  p_player uuid, p_flight_date date, p_stop int, p_entity text,
  p_correct boolean, p_prior float8, p_red_eye boolean, p_answered_at timestamptz
) returns setof plays
language plpgsql security definer set search_path = public as $$
declare
  v_play plays;
begin
  select * into v_play from plays
   where player_id = p_player and flight_date = p_flight_date and stop_index = p_stop
   for update;
  if not found then
    raise exception 'stop_not_started';
  end if;
  if v_play.answered_at is not null then
    return next v_play;
    return;
  end if;

  -- Crowd stats (display only).
  insert into stop_totals as t (flight_date, stop_index, correct_count, total_count)
  values (p_flight_date, p_stop, case when p_correct then 1 else 0 end, 1)
  on conflict (flight_date, stop_index) do update
    set correct_count = t.correct_count + case when p_correct then 1 else 0 end,
        total_count   = t.total_count + 1;

  if p_correct and p_entity is not null then
    insert into answer_counts as c (flight_date, stop_index, entity_id, count)
    values (p_flight_date, p_stop, p_entity, 1)
    on conflict (flight_date, stop_index, entity_id) do update set count = c.count + 1;

    -- Score from the fixed rarity alone. plays.share stores that rarity.
    update plays set entity_id = p_entity, answered_at = p_answered_at, share = p_prior,
                     km = otm_km(p_prior), tier = otm_tier(p_prior), red_eye = coalesce(p_red_eye, false)
     where player_id = p_player and flight_date = p_flight_date and stop_index = p_stop
     returning * into v_play;
  else
    update plays set entity_id = p_entity, answered_at = p_answered_at, share = null,
                     km = 0, tier = 'lost', red_eye = false
     where player_id = p_player and flight_date = p_flight_date and stop_index = p_stop
     returning * into v_play;
  end if;

  return next v_play;
end;
$$;

revoke all on function otm_submit_answer(uuid, date, int, text, boolean, float8, boolean, timestamptz) from public, anon, authenticated;
grant execute on function otm_submit_answer(uuid, date, int, text, boolean, float8, boolean, timestamptz) to service_role;

drop function if exists otm_blend(int, int, float8);

comment on column plays.share is 'Fixed rarity the play was scored with (rarity override or Wikipedia prior). Not a crowd share.';
