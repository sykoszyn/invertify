-- Invertify: carteras guardadas y su historial

create table if not exists public.portfolios (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name text not null default 'Mi cartera',
  broker text,
  holdings jsonb not null default '[]'::jsonb,
  profile jsonb not null default '{}'::jsonb,
  assumptions jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists portfolios_user_idx on public.portfolios (user_id, updated_at desc);

create table if not exists public.snapshots (
  id bigint generated always as identity primary key,
  portfolio_id uuid not null references public.portfolios (id) on delete cascade,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  total_usd numeric(14, 2) not null,
  score smallint not null,
  expected_return numeric(8, 5),
  taken_at timestamptz not null default now()
);

create index if not exists snapshots_portfolio_idx on public.snapshots (portfolio_id, taken_at);

alter table public.portfolios enable row level security;
alter table public.snapshots enable row level security;

create policy "portfolios: dueño lee" on public.portfolios for select using (auth.uid() = user_id);
create policy "portfolios: dueño crea" on public.portfolios for insert with check (auth.uid() = user_id);
create policy "portfolios: dueño edita" on public.portfolios for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "portfolios: dueño borra" on public.portfolios for delete using (auth.uid() = user_id);

create policy "snapshots: dueño lee" on public.snapshots for select using (auth.uid() = user_id);
create policy "snapshots: dueño crea" on public.snapshots for insert
  with check (
    auth.uid() = user_id
    and exists (select 1 from public.portfolios p where p.id = portfolio_id and p.user_id = auth.uid())
  );
create policy "snapshots: dueño borra" on public.snapshots for delete using (auth.uid() = user_id);
