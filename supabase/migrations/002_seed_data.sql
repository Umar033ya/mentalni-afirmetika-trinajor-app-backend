-- ============================================================================
-- Seed data: difficulties, cosmetics, achievements, rewards, app settings
-- ============================================================================

-- Difficulty configuration (XP per correct answer is the authoritative source)
insert into public.difficulty_configs (difficulty, xp_per_correct, time_multiplier, description) values
  ('easy', 3, 1.00, 'Simple single-digit questions'),
  ('normal', 5, 1.00, 'Standard difficulty'),
  ('hard', 8, 1.10, 'Larger numbers and more rows'),
  ('very_hard', 10, 1.20, 'Expert level mental arithmetic')
on conflict (difficulty) do nothing;

-- Default question config presets
insert into public.question_configs (name, operation, digit_count, rows, question_count, time_per_question_ms, difficulty, is_default)
values
  ('Beginner addition', 'addition', 1, 6, 10, 700, 'easy', true),
  ('Classic duel', 'addition', 1, 6, 10, 700, 'normal', false),
  ('Advanced subtraction', 'subtraction', 2, 4, 12, 900, 'hard', false)
on conflict do nothing;

-- Frames: unlocked by level
insert into public.frames (code, name, image_url, is_pro, unlock_level) values
  ('frame_basic', 'Basic Frame', null, false, 1),
  ('frame_bronze', 'Bronze Frame', null, false, 5),
  ('frame_silver', 'Silver Frame', null, false, 10),
  ('frame_gold', 'Gold Frame', null, false, 15),
  ('frame_diamond', 'Diamond Frame', null, false, 25),
  ('frame_legendary', 'Legendary Frame', null, false, 50),
  ('frame_neon_pro', 'Neon Pro Frame', null, true, 1),
  ('frame_aurora_pro', 'Aurora Pro Frame', null, true, 15)
on conflict (code) do nothing;

-- Titles
insert into public.titles (code, name, description, is_pro, unlock_level) values
  ('title_rookie', 'Rookie', 'Starting your journey', false, 1),
  ('title_apprentice', 'Apprentice', 'Level 5 reached', false, 5),
  ('title_calculator', 'Calculator', 'Level 10 reached', false, 10),
  ('title_master', 'Master of Numbers', 'Level 15 reached', false, 15),
  ('title_grandmaster', 'Grandmaster', 'Level 30 reached', false, 30),
  ('title_legend', 'Living Legend', 'Level 50 reached', false, 50),
  ('title_prodigy', 'Prodigy', 'Pro members only', true, 1),
  ('title_champion', 'Champion', 'Pro members only', true, 10)
on conflict (code) do nothing;

-- Emojis
insert into public.emojis (name, emoji, is_pro, unlock_level) values
  ('Thumbs up', '👍', false, 1),
  ('Clap', '👏', false, 1),
  ('Fire', '🔥', false, 3),
  ('Brain', '🧠', false, 10),
  ('Trophy', '🏆', false, 20),
  ('Party', '🎉', true, 1),
  ('Rocket', '🚀', true, 1),
  ('Crown', '👑', true, 1)
on conflict (emoji) do nothing;

-- Achievements
insert into public.achievements (code, name, description, icon, category, target_type, target_value, reward_xp) values
  ('FIRST_DUEL', 'First Duel', 'Play your first duel', '⚔️', 'duels', 'duels_played', 1, 10),
  ('DUELS_10', 'Regular Duelist', 'Play 10 duels', '🎮', 'duels', 'duels_played', 10, 25),
  ('FIRST_WIN', 'First Blood', 'Win your first duel', '🥇', 'wins', 'wins', 1, 15),
  ('WINS_10', 'Ten Victories', 'Win 10 duels', '🏅', 'wins', 'wins', 10, 40),
  ('WINS_50', 'Fifty Victories', 'Win 50 duels', '🎖️', 'wins', 'wins', 50, 120),
  ('STREAK_5', 'On Fire', 'Reach a 5 win streak', '🔥', 'streaks', 'win_streak', 5, 50),
  ('LEVEL_5', 'Level 5', 'Reach level 5', '⭐', 'levels', 'level', 5, 30),
  ('LEVEL_10', 'Level 10', 'Reach level 10', '🌟', 'levels', 'level', 10, 60),
  ('ANSWERS_100', 'Century', 'Answer 100 questions correctly', '💯', 'answers', 'correct_answers', 100, 35),
  ('ANSWERS_1000', 'Thousandnaire', 'Answer 1000 questions correctly', '🧮', 'answers', 'correct_answers', 1000, 200),
  ('PRACTICE_10', 'Diligent', 'Complete 10 practice sessions', '📚', 'practice', 'practice_sessions', 10, 40),
  ('CHALLENGES_5', 'Challenge Seeker', 'Claim 5 daily challenge rewards', '📅', 'challenges', 'challenges_completed', 5, 50)
on conflict (code) do nothing;

-- Rewards
insert into public.rewards (code, name, description, reward_type, ref_code, required_level, required_wins, is_pro_only) values
  ('REWARD_XP_100', 'Starter Boost', 'Get 100 bonus XP', 'XP', '100', 1, null, false),
  ('REWARD_FRAME_BRONZE', 'Bronze Gift', 'Unlock the Bronze Frame', 'FRAME', 'frame_bronze', null, 3, false),
  ('REWARD_PRO_WEEK', 'Pro Trial Week', 'One week of Pro membership', 'SUBSCRIPTION_DAYS', '7', 5, null, false)
on conflict (code) do nothing;

-- App settings defaults
insert into public.app_settings (key, value) values
  ('maintenance_mode', 'false'::jsonb),
  ('min_supported_app_version', '"1.0.0"'::jsonb),
  ('daily_challenge_enabled', 'true'::jsonb)
on conflict (key) do nothing;
