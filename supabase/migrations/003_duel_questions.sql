-- Server-authoritative duel question bank.
create table public.duel_questions (
  id uuid primary key default gen_random_uuid(),
  duel_id uuid not null references public.duels (id) on delete cascade,
  question_number integer not null check (question_number >= 1),
  operation text not null check (operation in ('addition', 'subtraction', 'multiplication', 'division', 'mixed')),
  digit_count integer not null check (digit_count between 1 and 6),
  rows integer not null check (rows between 1 and 20),
  operands jsonb not null,
  answer numeric not null,
  created_at timestamptz not null default now(),
  unique (duel_id, question_number)
);

create index duel_questions_duel_idx on public.duel_questions (duel_id, question_number);

alter table public.duel_questions enable row level security;

create policy "duel questions read participants" on public.duel_questions
  for select using (
    exists (
      select 1 from public.duels d
      where d.id = duel_questions.duel_id
        and (d.creator_id = auth.uid() or d.opponent_id = auth.uid())
    )
  );
