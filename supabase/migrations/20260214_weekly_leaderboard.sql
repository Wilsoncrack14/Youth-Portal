-- Create a function to get the weekly leaderboard
-- This function calculates the XP earned by users in the current week (starting Sunday)
-- It sums up 50 XP for each daily reading and 50 XP for each Sabbath School lesson (adjust values if needed)
-- Returns a table compatible with the RankingEntry interface

create or replace function get_weekly_leaderboard()
returns table (
  id uuid,
  username text,
  avatar_url text,
  xp bigint,
  rank bigint
) 
language plpgsql
security definer
as $$
declare
  start_of_week timestamp;
begin
  -- Calculate start of the current week (Saturday)
  -- Creates a Saturday-based start of week by shifting to Monday-based (Postgres default) and compensating
  -- Logic: If today is Saturday, +2 days = Monday. date_trunc('week') = Monday. -2 days = Saturday.
  start_of_week := date_trunc('week', now() + interval '2 days') - interval '2 days';

  return query
  with weekly_activity as (
    -- Daily Readings (50 XP each)
    select 
      user_id, 
      count(*) * 50 as earned_xp 
    from daily_readings 
    where created_at >= start_of_week
    group by user_id
    
    union all
    
    -- Sabbath School Lessons (50 XP each)
    select 
      user_id, 
      count(*) * 50 as earned_xp 
    from lesson_completions 
    where completed_at >= start_of_week
    group by user_id
  ),
  total_weekly_xp as (
    select 
      wa.user_id, 
      sum(wa.earned_xp) as total_xp
    from weekly_activity wa
    group by wa.user_id
  )
  select 
    p.id,
    p.username,
    p.avatar_url,
    coalesce(t.total_xp, 0)::bigint as xp,
    rank() over (order by coalesce(t.total_xp, 0) desc)::bigint as rank
  from profiles p
  join total_weekly_xp t on p.id = t.user_id
  order by xp desc
  limit 20;
end;
$$;
