-- Change default duel_rating for new users to 0 (do not modify existing values)
alter table public.users
  alter column duel_rating set default 0;

-- Keep check constraint (duel_rating >= 0) unchanged.
