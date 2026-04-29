create table if not exists public.expenses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  date date not null,
  amount numeric(12, 2) not null check (amount > 0),
  category text not null,
  note text default '',
  created_at timestamptz not null default now()
);

create table if not exists public.user_settings (
  user_id uuid primary key references auth.users(id) on delete cascade,
  monthly_budget numeric(12, 2) not null default 2500,
  updated_at timestamptz not null default now()
);

alter table public.expenses enable row level security;
alter table public.user_settings enable row level security;

create policy "Users can read their own expenses"
on public.expenses for select
to authenticated
using (auth.uid() = user_id);

create policy "Users can add their own expenses"
on public.expenses for insert
to authenticated
with check (auth.uid() = user_id);

create policy "Users can update their own expenses"
on public.expenses for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "Users can delete their own expenses"
on public.expenses for delete
to authenticated
using (auth.uid() = user_id);

create policy "Users can read their own settings"
on public.user_settings for select
to authenticated
using (auth.uid() = user_id);

create policy "Users can add their own settings"
on public.user_settings for insert
to authenticated
with check (auth.uid() = user_id);

create policy "Users can update their own settings"
on public.user_settings for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create index if not exists expenses_user_date_idx on public.expenses (user_id, date desc);
