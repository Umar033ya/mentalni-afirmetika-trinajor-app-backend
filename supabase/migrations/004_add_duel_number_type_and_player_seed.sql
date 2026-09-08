-- Add duel.number_type and duel_players.seed to support per-player generation
alter table public.duels
  add column if not exists number_type text not null default 'oddiy' check (number_type in ('oddiy', 'kichik', 'dost', 'katta'));

alter table public.duel_players
  add column if not exists seed text;

-- No data migration performed; existing duels will use default 'oddiy'.
