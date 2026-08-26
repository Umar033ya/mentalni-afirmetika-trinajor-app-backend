-- ============================================================================
-- Mental Arithmetic Backend - Initial schema (Supabase / PostgreSQL)
-- ============================================================================
create extension if not exists "pgcrypto";

-- ----------------------------------------------------------------------------
-- Helper: updated_at trigger
-- ----------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ============================================================================
-- USERS & ACCOUNTS
-- ============================================================================
create table public.users (
  id uuid primary key default gen_random_uuid(),
  username text not null,
  email text not null,
  phone text,
  password_hash text not null,
  role text not null default 'user' check (role in ('user', 'admin')),
  level integer not null default 1 check (level >= 1),
  xp integer not null default 0 check (xp >= 0),
  total_xp_earned integer not null default 0 check (total_xp_earned >= 0),
  wins integer not null default 0 check (wins >= 0),
  losses integer not null default 0 check (losses >= 0),
  draws integer not null default 0 check (draws >= 0),
  correct_answers integer not null default 0 check (correct_answers >= 0),
  wrong_answers integer not null default 0 check (wrong_answers >= 0),
  duel_rating integer not null default 1000 check (duel_rating >= 0),
  longest_win_streak integer not null default 0 check (longest_win_streak >= 0),
  current_win_streak integer not null default 0 check (current_win_streak >= 0),
  avatar_url text,
  is_online boolean not null default false,
  is_banned boolean not null default false,
  last_seen timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index users_email_unique_idx on public.users (email);
create unique index users_username_lower_unique_idx on public.users (lower(username));
create unique index users_phone_unique_idx on public.users (phone) where phone is not null;
create index users_rating_idx on public.users (duel_rating desc);
create index users_xp_idx on public.users (xp desc);
create index users_last_seen_idx on public.users (last_seen desc);

create trigger users_set_updated_at
  before update on public.users
  for each row execute function public.set_updated_at();

-- ============================================================================
-- PROFILES
-- ============================================================================
create table public.profiles (
  user_id uuid primary key references public.users (id) on delete cascade,
  bio text check (char_length(bio) <= 280),
  country text,
  birthday date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- ============================================================================
-- USER SETTINGS
-- ============================================================================
create table public.user_settings (
  user_id uuid primary key references public.users (id) on delete cascade,
  sound_enabled boolean not null default true,
  music_enabled boolean not null default true,
  haptics_enabled boolean not null default true,
  language text not null default 'uz',
  theme text not null default 'system' check (theme in ('system', 'light', 'dark')),
  notifications_duels boolean not null default true,
  notifications_results boolean not null default true,
  daily_reminder boolean not null default true,
  updated_at timestamptz not null default now()
);

create trigger user_settings_set_updated_at
  before update on public.user_settings
  for each row execute function public.set_updated_at();

-- ============================================================================
-- SUBSCRIPTIONS
-- ============================================================================
create table public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  plan text not null check (plan in ('FREE', 'PRO')),
  status text not null default 'active' check (status in ('active', 'cancelled', 'expired')),
  started_at timestamptz not null default now(),
  expires_at timestamptz,
  payment_provider text,
  external_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index subscriptions_user_idx on public.subscriptions (user_id, status);
create index subscriptions_active_idx on public.subscriptions (expires_at) where status = 'active';

create trigger subscriptions_set_updated_at
  before update on public.subscriptions
  for each row execute function public.set_updated_at();

-- ============================================================================
-- QUESTIONS: DIFFICULTY CONFIGS & QUESTION CONFIG PRESETS
-- ============================================================================
create table public.difficulty_configs (
  id uuid primary key default gen_random_uuid(),
  difficulty text not null unique check (difficulty in ('easy', 'normal', 'hard', 'very_hard')),
  xp_per_correct integer not null check (xp_per_correct > 0),
  time_multiplier numeric(4, 2) not null default 1.00,
  description text,
  created_at timestamptz not null default now()
);

create table public.question_configs (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  operation text not null check (operation in ('addition', 'subtraction', 'multiplication', 'division', 'mixed')),
  digit_count integer not null check (digit_count between 1 and 6),
  rows integer not null check (rows between 1 and 20),
  question_count integer not null check (question_count between 1 and 50),
  time_per_question_ms integer not null check (time_per_question_ms between 200 and 10000),
  difficulty text not null references public.difficulty_configs (difficulty),
  is_default boolean not null default false,
  created_at timestamptz not null default now()
);

-- ============================================================================
-- PRACTICE
-- ============================================================================
create table public.practice_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  status text not null default 'ongoing' check (status in ('ongoing', 'completed', 'abandoned')),
  operation text not null,
  digit_count integer not null check (digit_count between 1 and 6),
  rows integer not null check (rows between 1 and 20),
  question_count integer not null check (question_count between 1 and 50),
  time_per_question_ms integer not null check (time_per_question_ms between 200 and 10000),
  difficulty text not null,
  config jsonb,
  total_questions integer not null,
  answered_questions integer not null default 0,
  correct_answers integer not null default 0,
  wrong_answers integer not null default 0,
  total_xp integer not null default 0 check (total_xp >= 0),
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  created_at timestamptz not null default now()
);

create index practice_sessions_user_idx on public.practice_sessions (user_id, created_at desc);

create table public.practice_answers (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.practice_sessions (id) on delete cascade,
  user_id uuid not null references public.users (id) on delete cascade,
  question_number integer not null check (question_number >= 1),
  answer numeric not null,
  is_correct boolean not null,
  verified_by_server boolean not null default false,
  response_time_ms integer,
  created_at timestamptz not null default now(),
  unique (session_id, question_number)
);

create index practice_answers_session_idx on public.practice_answers (session_id, question_number);

-- ============================================================================
-- XP HISTORY
-- ============================================================================
create table public.xp_history (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  source text not null,
  amount integer not null check (amount <> 0),
  duel_id uuid,
  question_id uuid,
  description text,
  created_at timestamptz not null default now()
);

create index xp_history_user_idx on public.xp_history (user_id, created_at desc);

-- ============================================================================
-- COSMETICS CATALOGS
-- ============================================================================
create table public.emojis (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  emoji text not null unique,
  is_pro boolean not null default false,
  unlock_level integer not null default 1 check (unlock_level >= 1),
  created_at timestamptz not null default now()
);

create table public.frames (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  image_url text,
  is_pro boolean not null default false,
  unlock_level integer not null default 1 check (unlock_level >= 1),
  created_at timestamptz not null default now()
);

create table public.titles (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  description text,
  is_pro boolean not null default false,
  unlock_level integer not null default 1 check (unlock_level >= 1),
  created_at timestamptz not null default now()
);

create table public.user_emojis (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  emoji_id uuid not null references public.emojis (id) on delete cascade,
  unlocked_at timestamptz not null default now(),
  unique (user_id, emoji_id)
);

create table public.user_frames (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  frame_id uuid not null references public.frames (id) on delete cascade,
  unlocked_at timestamptz not null default now(),
  unique (user_id, frame_id)
);

create table public.user_titles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  title_id uuid not null references public.titles (id) on delete cascade,
  unlocked_at timestamptz not null default now(),
  unique (user_id, title_id)
);

-- Active cosmetics references on users (added here to keep FK creation order simple)
alter table public.users
  add column active_frame_id uuid references public.frames (id) on delete set null,
  add column active_title_id uuid references public.titles (id) on delete set null,
  add column active_emoji_id uuid references public.emojis (id) on delete set null;

-- ============================================================================
-- ACHIEVEMENTS
-- ============================================================================
create table public.achievements (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  description text,
  icon text,
  category text,
  target_type text not null check (target_type in (
    'wins', 'level', 'correct_answers', 'win_streak',
    'duels_played', 'practice_sessions', 'challenges_completed', 'total_xp'
  )),
  target_value integer not null check (target_value > 0),
  reward_xp integer not null default 0 check (reward_xp >= 0),
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.user_achievements (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  achievement_id uuid not null references public.achievements (id) on delete cascade,
  progress_at_unlock integer,
  unlocked_at timestamptz not null default now(),
  unique (user_id, achievement_id)
);

create index user_achievements_user_idx on public.user_achievements (user_id);

-- ============================================================================
-- DAILY CHALLENGES
-- ============================================================================
create table public.daily_challenges (
  id uuid primary key default gen_random_uuid(),
  code text not null,
  title text not null,
  description text,
  challenge_date date not null,
  target_type text not null check (target_type in ('correct_answers', 'practice_sessions', 'duel_wins')),
  target_value integer not null check (target_value > 0),
  reward_xp integer not null default 0 check (reward_xp >= 0),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (code, challenge_date)
);

create index daily_challenges_date_idx on public.daily_challenges (challenge_date);

create table public.challenge_progress (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  challenge_id uuid not null references public.daily_challenges (id) on delete cascade,
  progress integer not null default 0 check (progress >= 0),
  completed boolean not null default false,
  claimed boolean not null default false,
  completed_at timestamptz,
  updated_at timestamptz not null default now(),
  unique (user_id, challenge_id)
);

create trigger challenge_progress_set_updated_at
  before update on public.challenge_progress
  for each row execute function public.set_updated_at();

-- ============================================================================
-- DUELS
-- ============================================================================
create table public.duels (
  id uuid primary key default gen_random_uuid(),
  creator_id uuid not null references public.users (id) on delete cascade,
  opponent_id uuid references public.users (id) on delete set null,
  status text not null default 'WAITING' check (status in (
    'WAITING', 'READY', 'COUNTDOWN', 'ONGOING', 'COMPLETED', 'CANCELLED', 'DECLINED'
  )),
  mode text not null default 'public' check (mode in ('public', 'private', 'challenge')),
  operation text not null check (operation in ('addition', 'subtraction', 'multiplication', 'division', 'mixed')),
  digit_count integer not null check (digit_count between 1 and 6),
  rows integer not null check (rows between 1 and 20),
  question_count integer not null check (question_count between 1 and 50),
  time_per_question_ms integer not null check (time_per_question_ms between 200 and 10000),
  difficulty text not null check (difficulty in ('easy', 'normal', 'hard', 'very_hard')),
  start_at timestamptz,
  ends_at timestamptz,
  finished_at timestamptz,
  winner_id uuid references public.users (id) on delete set null,
  is_draw boolean not null default false,
  created_at timestamptz not null default now()
);

create index duels_status_idx on public.duels (status, created_at desc);
create index duels_creator_idx on public.duels (creator_id);
create index duels_opponent_idx on public.duels (opponent_id);
create index duels_waiting_lobby_idx on public.duels (created_at desc) where status = 'WAITING';

create table public.duel_players (
  id uuid primary key default gen_random_uuid(),
  duel_id uuid not null references public.duels (id) on delete cascade,
  user_id uuid not null references public.users (id) on delete cascade,
  score integer not null default 0 check (score >= 0),
  correct_answers integer not null default 0 check (correct_answers >= 0),
  wrong_answers integer not null default 0 check (wrong_answers >= 0),
  total_xp integer not null default 0 check (total_xp >= 0),
  rating_before integer,
  rating_after integer,
  joined_at timestamptz not null default now(),
  finished_at timestamptz,
  unique (duel_id, user_id)
);

create index duel_players_user_idx on public.duel_players (user_id);

create table public.duel_answers (
  id uuid primary key default gen_random_uuid(),
  duel_id uuid not null references public.duels (id) on delete cascade,
  user_id uuid not null references public.users (id) on delete cascade,
  question_number integer not null check (question_number >= 1),
  answer numeric not null,
  is_correct boolean not null,
  verified_by_server boolean not null default false,
  response_time_ms integer,
  answered_at timestamptz not null default now(),
  unique (duel_id, user_id, question_number)
);

create index duel_answers_duel_idx on public.duel_answers (duel_id);

-- ============================================================================
-- MATCH HISTORY & RATING HISTORY
-- ============================================================================
create table public.match_history (
  id uuid primary key default gen_random_uuid(),
  type text not null default 'duel' check (type in ('duel', 'practice', 'challenge')),
  duel_id uuid references public.duels (id) on delete set null,
  player1_id uuid not null references public.users (id) on delete cascade,
  player2_id uuid references public.users (id) on delete cascade,
  winner_id uuid references public.users (id) on delete set null,
  is_draw boolean not null default false,
  player1_score integer,
  player2_score integer,
  played_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index match_history_players_idx on public.match_history (player1_id, player2_id, played_at desc);
create unique index match_history_duel_unique_idx on public.match_history (duel_id) where duel_id is not null;

create table public.rating_history (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  duel_id uuid references public.duels (id) on delete set null,
  old_rating integer not null,
  new_rating integer not null,
  delta integer not null,
  reason text,
  created_at timestamptz not null default now()
);

create index rating_history_user_idx on public.rating_history (user_id, created_at desc);

-- ============================================================================
-- DUEL MESSAGES (chat)
-- ============================================================================
create table public.duel_messages (
  id uuid primary key default gen_random_uuid(),
  duel_id uuid not null references public.duels (id) on delete cascade,
  user_id uuid not null references public.users (id) on delete cascade,
  message text not null check (char_length(message) between 1 and 200),
  message_type text not null default 'text' check (message_type in ('text', 'emoji')),
  is_emoji boolean not null default false,
  created_at timestamptz not null default now()
);

create index duel_messages_duel_idx on public.duel_messages (duel_id, created_at);

-- ============================================================================
-- NOTIFICATIONS
-- ============================================================================
create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  type text not null check (type in (
    'DUEL_CHALLENGE', 'DUEL_ACCEPTED', 'DUEL_DECLINED', 'DUEL_STARTED', 'DUEL_COMPLETED',
    'LEVEL_UP', 'TITLE_UNLOCKED', 'FRAME_UNLOCKED', 'EMOJI_UNLOCKED', 'ACHIEVEMENT_UNLOCKED',
    'SUBSCRIPTION_EXPIRING', 'REWARD_CLAIMED', 'SYSTEM'
  )),
  title text not null,
  message text,
  data jsonb,
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);

create index notifications_user_idx on public.notifications (user_id, is_read, created_at desc);

-- ============================================================================
-- REWARDS
-- ============================================================================
create table public.rewards (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  description text,
  reward_type text not null check (reward_type in ('XP', 'FRAME', 'TITLE', 'EMOJI', 'SUBSCRIPTION_DAYS')),
  ref_code text,
  required_level integer,
  required_wins integer,
  is_pro_only boolean not null default false,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.user_rewards (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  reward_id uuid not null references public.rewards (id) on delete cascade,
  claimed_at timestamptz not null default now(),
  unique (user_id, reward_id)
);

create index user_rewards_user_idx on public.user_rewards (user_id);

-- ============================================================================
-- APP SETTINGS (key-value runtime configuration managed by admins)
-- ============================================================================
create table public.app_settings (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz not null default now()
);

-- ============================================================================
-- ATOMIC ANSWER RECORDING (prevents duplicate answers under concurrency)
-- ============================================================================
create or replace function public.record_duel_answer(
  p_duel_id uuid,
  p_user_id uuid,
  p_question_number integer,
  p_answer numeric,
  p_is_correct boolean,
  p_verified boolean,
  p_response_time_ms integer,
  p_xp_reward integer
)
returns json
language plpgsql
as $$
declare
  v_inserted boolean := false;
begin
  insert into public.duel_answers (duel_id, user_id, question_number, answer, is_correct, verified_by_server, response_time_ms)
  values (p_duel_id, p_user_id, p_question_number, p_answer, p_is_correct, p_verified, p_response_time_ms)
  on conflict (duel_id, user_id, question_number) do nothing;

  if found then
    update public.duel_players
       set score = case when p_is_correct then score + 1 else score end,
           correct_answers = case when p_is_correct then correct_answers + 1 else correct_answers end,
           wrong_answers = case when not p_is_correct then wrong_answers + 1 else wrong_answers end,
           total_xp = total_xp + p_xp_reward
     where duel_id = p_duel_id and user_id = p_user_id;
    v_inserted := true;
  end if;

  return json_build_object('inserted', v_inserted);
end;
$$;

create or replace function public.record_practice_answer(
  p_session_id uuid,
  p_user_id uuid,
  p_question_number integer,
  p_answer numeric,
  p_is_correct boolean,
  p_verified boolean,
  p_response_time_ms integer,
  p_xp_reward integer
)
returns json
language plpgsql
as $$
declare
  v_inserted boolean := false;
begin
  insert into public.practice_answers (session_id, user_id, question_number, answer, is_correct, verified_by_server, response_time_ms)
  values (p_session_id, p_user_id, p_question_number, p_answer, p_is_correct, p_verified, p_response_time_ms)
  on conflict (session_id, question_number) do nothing;

  if found then
    update public.practice_sessions
       set answered_questions = answered_questions + 1,
           correct_answers = case when p_is_correct then correct_answers + 1 else correct_answers end,
           wrong_answers = case when not p_is_correct then wrong_answers + 1 else wrong_answers end,
           total_xp = total_xp + p_xp_reward
     where id = p_session_id and user_id = p_user_id;
    v_inserted := true;
  end if;

  return json_build_object('inserted', v_inserted);
end;
$$;

-- ============================================================================
-- ROW LEVEL SECURITY
--
-- The backend uses the SUPABASE_SERVICE_ROLE_KEY which bypasses RLS.
-- RLS is enabled everywhere (deny-by-default) with a small number of SELECT
-- policies so the Expo app can subscribe to realtime updates (own notifications,
-- own duels/messages) using the anon key + the user's JWT.
-- NEVER ship the service role key to the client.
-- ============================================================================
alter table public.users enable row level security;
alter table public.profiles enable row level security;
alter table public.user_settings enable row level security;
alter table public.subscriptions enable row level security;
alter table public.difficulty_configs enable row level security;
alter table public.question_configs enable row level security;
alter table public.practice_sessions enable row level security;
alter table public.practice_answers enable row level security;
alter table public.xp_history enable row level security;
alter table public.emojis enable row level security;
alter table public.frames enable row level security;
alter table public.titles enable row level security;
alter table public.user_emojis enable row level security;
alter table public.user_frames enable row level security;
alter table public.user_titles enable row level security;
alter table public.achievements enable row level security;
alter table public.user_achievements enable row level security;
alter table public.daily_challenges enable row level security;
alter table public.challenge_progress enable row level security;
alter table public.duels enable row level security;
alter table public.duel_players enable row level security;
alter table public.duel_answers enable row level security;
alter table public.match_history enable row level security;
alter table public.rating_history enable row level security;
alter table public.duel_messages enable row level security;
alter table public.notifications enable row level security;
alter table public.rewards enable row level security;
alter table public.user_rewards enable row level security;
alter table public.app_settings enable row level security;

-- Realtime-friendly read policies (authenticated users only read their own data)
create policy "users read own profile" on public.users
  for select using (auth.uid() = id);

create policy "notifications read own" on public.notifications
  for select using (auth.uid() = user_id);

create policy "duels read own participation" on public.duels
  for select using (auth.uid() = creator_id or auth.uid() = opponent_id or status = 'WAITING');

create policy "duel messages read participants" on public.duel_messages
  for select using (
    exists (
      select 1 from public.duels d
      where d.id = duel_messages.duel_id
        and (d.creator_id = auth.uid() or d.opponent_id = auth.uid())
    )
  );

create policy "cosmetics catalogs readable" on public.emojis
  for select using (true);
create policy "frames catalogs readable" on public.frames
  for select using (true);
create policy "titles catalogs readable" on public.titles
  for select using (true);
create policy "difficulty configs readable" on public.difficulty_configs
  for select using (true);

-- Add tables to supabase_realtime publication (safe if already present or missing)
do $$
begin
  begin
    alter publication supabase_realtime add table public.notifications;
  exception
    when duplicate_object then null;
    when undefined_object then null;
  end;
  begin
    alter publication supabase_realtime add table public.duels;
  exception
    when duplicate_object then null;
    when undefined_object then null;
  end;
  begin
    alter publication supabase_realtime add table public.duel_messages;
  exception
    when duplicate_object then null;
    when undefined_object then null;
  end;
end $$;
