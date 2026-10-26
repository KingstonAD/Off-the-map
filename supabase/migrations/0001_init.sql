-- Off the Map — v1 schema. Only the server (service role) reads or writes; RLS is on with no policies.

create table if not exists flights (
  date   date primary key,
  number int  not null unique
);

create table if not exists stops (
  flight_date date not null references flights(date) on delete cascade,
  stop_index  int  not null check (stop_index between 0 and 6),
  stop_id     text not null,
  prompt      text not null,
  board       text[] not null,
  category    text not null,
  pool        text not null,
  notes       text,
  answers     jsonb not null, -- [{ id, name, aliases?, prior }]
  primary key (flight_date, stop_index)
);

create table if not exists answer_counts (
  flight_date date not null,
  stop_index  int  not null,
  entity_id   text not null,
  count       int  not null default 0,
  primary key (flight_date, stop_index, entity_id)
);

create table if not exists stop_totals (
  flight_date   date not null,
  stop_index    int  not null,
  correct_count int  not null default 0,
  total_count   int  not null default 0,
  primary key (flight_date, stop_index)
);

create table if not exists plays (
  player_id   uuid        not null,
  flight_date date        not null,
  stop_index  int         not null check (stop_index between 0 and 6),
  entity_id   text,
  served_at   timestamptz not null,
  answered_at timestamptz,
  share       float8,
  km          int,
  tier        text check (tier in ('tourist', 'backpacker', 'explorer', 'uncharted', 'lost')),
  red_eye     boolean     not null default false,
  unique (player_id, flight_date, stop_index)
);
create index if not exists plays_player_idx on plays (player_id, flight_date);

alter table flights       enable row level security;
alter table stops         enable row level security;
alter table answer_counts enable row level security;
alter table stop_totals   enable row level security;
alter table plays         enable row level security;

-- Scoring. Mirrors lib/scoring.ts (kmFor, tierFor, blendShare); keep in sync.
create or replace function otm_km(share float8) returns int
language sql immutable as $$
  select case when share is null or share <= 0 then 5725
    else round(least(5725, greatest(0, 5725 * ln(1 / share) / ln(100)))::numeric)::int end -- numeric round = half away from zero, like Math.round
$$;

create or replace function otm_tier(share float8) returns text
language sql immutable as $$
  select case when share >= 0.25 then 'tourist'
              when share >= 0.10 then 'backpacker'
              when share >= 0.03 then 'explorer'
              else 'uncharted' end
$$;

create or replace function otm_blend(cnt int, total_correct int, prior float8) returns float8
language sql immutable as $$
  select case when total_correct <= 0 then prior
    else (total_correct::float8 / (total_correct + 200)) * (cnt::float8 / total_correct)
       + (200::float8 / (total_correct + 200)) * prior end
$$;

-- Judge one stop in a single transaction: lock the play, bump the counts, compute the share, lock in km and tier.
-- Timing (late / Red-Eye) and correctness are decided by the server before calling; a late answer arrives here as
-- p_correct = false. Calling again for an answered stop returns the stored row and changes nothing.
create or replace function otm_submit_answer(
  p_player uuid, p_flight_date date, p_stop int, p_entity text,
  p_correct boolean, p_prior float8, p_red_eye boolean, p_answered_at timestamptz
) returns setof plays
language plpgsql security definer set search_path = public as $$
declare
  v_play plays;
  v_correct int;
  v_count int;
  v_share float8;
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

  -- stop_totals first: serialises submissions per stop so count/total are a consistent snapshot.
  insert into stop_totals as t (flight_date, stop_index, correct_count, total_count)
  values (p_flight_date, p_stop, case when p_correct then 1 else 0 end, 1)
  on conflict (flight_date, stop_index) do update
    set correct_count = t.correct_count + case when p_correct then 1 else 0 end,
        total_count   = t.total_count + 1
  returning correct_count into v_correct;

  if p_correct and p_entity is not null then
    insert into answer_counts as c (flight_date, stop_index, entity_id, count)
    values (p_flight_date, p_stop, p_entity, 1)
    on conflict (flight_date, stop_index, entity_id) do update set count = c.count + 1
    returning count into v_count;

    v_share := otm_blend(v_count, v_correct, p_prior);
    update plays set entity_id = p_entity, answered_at = p_answered_at, share = v_share,
                     km = otm_km(v_share), tier = otm_tier(v_share), red_eye = coalesce(p_red_eye, false)
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
