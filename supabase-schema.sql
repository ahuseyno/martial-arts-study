create extension if not exists pgcrypto;

create table if not exists public.session_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  class_date date not null,
  class_focus text not null,
  coach_name text,
  energy_rating text not null default 'Tired but useful',
  techniques text[] not null default '{}',
  wins text,
  struggles text,
  sparring_notes text not null,
  takeaway text not null,
  created_at timestamptz not null default now()
);

alter table public.session_logs enable row level security;

create policy "Users can read their own session logs"
on public.session_logs
for select
to authenticated
using (auth.uid() = user_id);

create policy "Users can insert their own session logs"
on public.session_logs
for insert
to authenticated
with check (auth.uid() = user_id);
