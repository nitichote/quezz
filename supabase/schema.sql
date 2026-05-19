create extension if not exists "pgcrypto";

create table if not exists public.user_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  role text not null default 'host_manager' check (role in ('admin', 'host_manager')),
  created_at timestamptz not null default now()
);

create table if not exists public.quizzes (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  questions jsonb not null,
  created_at timestamptz not null default now()
);

create table if not exists public.game_sessions (
  id uuid primary key default gen_random_uuid(),
  quiz_id uuid not null references public.quizzes(id) on delete cascade,
  room_code text not null unique,
  status text not null default 'lobby' check (status in ('lobby', 'question', 'results', 'ended')),
  current_question integer not null default 0 check (current_question >= 0),
  question_started_at timestamptz,
  question_duration integer not null default 20 check (question_duration > 0),
  results_duration integer not null default 5 check (results_duration > 0),
  created_at timestamptz not null default now()
);

alter table public.game_sessions add column if not exists question_started_at timestamptz;
alter table public.game_sessions add column if not exists question_duration integer not null default 20 check (question_duration > 0);
alter table public.game_sessions add column if not exists results_duration integer not null default 5 check (results_duration > 0);

create table if not exists public.players (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.game_sessions(id) on delete cascade,
  name text not null,
  joined_at timestamptz not null default now()
);

create table if not exists public.answers (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.game_sessions(id) on delete cascade,
  player_id uuid not null references public.players(id) on delete cascade,
  question_index integer not null check (question_index >= 0),
  choice_index integer not null check (choice_index >= 0),
  created_at timestamptz not null default now(),
  unique (session_id, player_id, question_index)
);

alter table public.quizzes enable row level security;
alter table public.game_sessions enable row level security;
alter table public.players enable row level security;
alter table public.answers enable row level security;
alter table public.user_profiles enable row level security;

create or replace function public.is_admin()
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.user_profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

create or replace function public.is_host_manager()
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.user_profiles
    where id = auth.uid() and role in ('admin', 'host_manager')
  );
$$;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.user_profiles (id, email, role)
  values (new.id, coalesce(new.email, ''), 'host_manager')
  on conflict (id) do update set email = excluded.email;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

drop policy if exists "demo read quizzes" on public.quizzes;
drop policy if exists "demo insert quizzes" on public.quizzes;
drop policy if exists "demo read sessions" on public.game_sessions;
drop policy if exists "demo insert sessions" on public.game_sessions;
drop policy if exists "demo update sessions" on public.game_sessions;
drop policy if exists "demo read players" on public.players;
drop policy if exists "demo insert players" on public.players;
drop policy if exists "demo read answers" on public.answers;
drop policy if exists "demo insert answers" on public.answers;
drop policy if exists "demo update answers" on public.answers;
drop policy if exists "profiles read own or admin" on public.user_profiles;
drop policy if exists "profiles admin update" on public.user_profiles;

create policy "demo read quizzes" on public.quizzes for select using (true);
create policy "demo insert quizzes" on public.quizzes for insert with check (public.is_host_manager());

create policy "demo read sessions" on public.game_sessions for select using (true);
create policy "demo insert sessions" on public.game_sessions for insert with check (public.is_host_manager());
create policy "demo update sessions" on public.game_sessions for update using (public.is_host_manager()) with check (public.is_host_manager());

create policy "demo read players" on public.players for select using (true);
create policy "demo insert players" on public.players for insert with check (true);

create policy "demo read answers" on public.answers for select using (true);
create policy "demo insert answers" on public.answers for insert with check (true);
create policy "demo update answers" on public.answers for update using (true) with check (true);

create policy "profiles read own or admin"
on public.user_profiles for select
using (id = auth.uid() or public.is_admin());

create policy "profiles admin update"
on public.user_profiles for update
using (public.is_admin())
with check (public.is_admin());


do $$
begin
  alter publication supabase_realtime add table public.game_sessions;
exception
  when duplicate_object then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table public.players;
exception
  when duplicate_object then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table public.answers;
exception
  when duplicate_object then null;
end $$;
