-- Run this in the Supabase SQL Editor to set up the required tables.
-- Requires auth.users (built-in with Supabase Auth).

-- API keys per user, encrypted at rest via Supabase vault or app-level
create table if not exists public.user_api_keys (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  exchange text not null check (exchange in ('kalshi','polymarket','gemini')),
  api_key text not null default '',
  api_secret text not null default '',
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(user_id, exchange)
);

-- Paper trades
create table if not exists public.paper_trades (
  id text primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  market_id text not null,
  market_title text not null,
  exchange text not null,
  side text not null check (side in ('yes','no')),
  price numeric not null,
  quantity integer not null,
  status text not null default 'filled',
  pnl numeric,
  timestamp timestamptz not null default now(),
  settled_at timestamptz
);

-- Paper balances per user per exchange
create table if not exists public.paper_balances (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  exchange text not null check (exchange in ('kalshi','polymarket','gemini')),
  cash numeric not null default 100000,
  positions jsonb not null default '[]',
  updated_at timestamptz default now(),
  unique(user_id, exchange)
);

-- Row Level Security
alter table public.user_api_keys enable row level security;
alter table public.paper_trades enable row level security;
alter table public.paper_balances enable row level security;

create policy "Users can manage own api keys"
  on public.user_api_keys for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can manage own paper trades"
  on public.paper_trades for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can manage own paper balances"
  on public.paper_balances for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
