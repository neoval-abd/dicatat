-- Migration: 202610140001_finance_expansion.sql
-- Expands Dicatat from an expense-only tracker into a complete personal finance application:
-- 1. Adds income/expense transaction types and source field
-- 2. Categorizes categories into income & expense with seeded income categories
-- 3. Expands monthly budgets with target income, planned savings & emergency funds
-- 4. Adds budget allocations per category
-- 5. Adds savings goals (emergency fund, general savings, etc.) and savings movements (deposits/withdrawals)
-- 6. Adds finance_summary server RPC and updates expense_summary
-- 7. Enables strict Row Level Security (RLS) on all tables

begin;

-- ==========================================
-- 1. CATEGORIES TABLE EXPANSION
-- ==========================================
alter table public.categories
  add column if not exists type text not null default 'expense' check (type in ('income', 'expense'));

-- Drop single (user_id, name) constraint to allow same category name across different types (e.g. "Lainnya" for both)
alter table public.categories drop constraint if exists categories_user_id_name_key;
alter table public.categories add constraint categories_user_id_type_name_key unique (user_id, type, name);
alter table public.categories add constraint categories_id_user_id_type_key unique (id, user_id, type);

-- Seed default income categories for existing users
insert into public.categories (user_id, name, type, icon)
select u.id, c.name, 'income', c.icon from auth.users u cross join (values
  ('Gaji', 'Briefcase'),
  ('Bonus', 'Gift'),
  ('Freelance', 'Laptop'),
  ('Usaha', 'Store'),
  ('Investasi', 'TrendingUp'),
  ('Hadiah', 'Gift'),
  ('Cashback', 'Coins'),
  ('Lainnya', 'Shapes')
) c(name, icon)
on conflict (user_id, type, name) do nothing;

-- Update user signup trigger to also create default income categories
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id, name)
  values (new.id, left(coalesce(new.raw_user_meta_data->>'name', ''), 100));

  -- Default expense categories
  insert into public.categories (user_id, name, type, icon) values
    (new.id, 'Makan & Minum', 'expense', 'Utensils'),
    (new.id, 'Transportasi', 'expense', 'Car'),
    (new.id, 'Belanja', 'expense', 'ShoppingBag'),
    (new.id, 'Tagihan', 'expense', 'ReceiptText'),
    (new.id, 'Kesehatan', 'expense', 'HeartPulse'),
    (new.id, 'Hiburan', 'expense', 'Gamepad2'),
    (new.id, 'Pendidikan', 'expense', 'GraduationCap'),
    (new.id, 'Rumah Tangga', 'expense', 'House'),
    (new.id, 'Lainnya', 'expense', 'Shapes');

  -- Default income categories
  insert into public.categories (user_id, name, type, icon) values
    (new.id, 'Gaji', 'income', 'Briefcase'),
    (new.id, 'Bonus', 'income', 'Gift'),
    (new.id, 'Freelance', 'income', 'Laptop'),
    (new.id, 'Usaha', 'income', 'Store'),
    (new.id, 'Investasi', 'income', 'TrendingUp'),
    (new.id, 'Hadiah', 'income', 'Gift'),
    (new.id, 'Cashback', 'income', 'Coins'),
    (new.id, 'Lainnya', 'income', 'Shapes');

  return new;
end;
$$;

-- ==========================================
-- 2. TRANSACTIONS TABLE EXPANSION
-- ==========================================
alter table public.transactions
  add column if not exists type text not null default 'expense' check (type in ('income', 'expense')),
  add column if not exists source text check (source is null or length(trim(source)) <= 100);

-- Existing transactions are preserved as 'expense' by default constraint.
-- Rebind foreign key to guarantee transaction type strictly matches category type
alter table public.transactions drop constraint if exists transactions_category_id_user_id_fkey;
alter table public.transactions drop constraint if exists transactions_category_user_type_fkey;
alter table public.transactions add constraint transactions_category_id_user_id_fkey
  foreign key (category_id, user_id, type) references public.categories(id, user_id, type) on delete no action;

create index if not exists transactions_user_type_date_idx
  on public.transactions (user_id, type, transaction_date desc, transaction_time desc, id desc);

-- ==========================================
-- 3. MONTHLY BUDGETS EXPANSION
-- ==========================================
alter table public.monthly_budgets
  add column if not exists target_income bigint not null default 0 check (target_income >= 0 and target_income <= 9007199254740991),
  add column if not exists planned_savings bigint not null default 0 check (planned_savings >= 0 and planned_savings <= 9007199254740991),
  add column if not exists planned_emergency bigint not null default 0 check (planned_emergency >= 0 and planned_emergency <= 9007199254740991);

-- Allow amount (expense budget) to be >= 0
alter table public.monthly_budgets drop constraint if exists monthly_budgets_amount_check;
alter table public.monthly_budgets add constraint monthly_budgets_amount_check
  check (amount >= 0 and amount <= 9007199254740991);

-- ==========================================
-- 4. BUDGET ALLOCATIONS (CATEGORY BUDGETS)
-- ==========================================
create table if not exists public.budget_allocations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  monthly_budget_id uuid not null references public.monthly_budgets(id) on delete cascade,
  category_id uuid not null,
  amount bigint not null check (amount > 0 and amount <= 9007199254740991),
  notes text check (notes is null or length(notes) <= 500),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (category_id, user_id) references public.categories(id, user_id) on delete cascade,
  unique (monthly_budget_id, category_id)
);

create index if not exists budget_allocations_user_idx on public.budget_allocations (user_id, monthly_budget_id);

drop trigger if exists budget_allocations_updated on public.budget_allocations;
create trigger budget_allocations_updated
  before update on public.budget_allocations
  for each row execute function public.set_updated_at();

alter table public.budget_allocations enable row level security;
revoke all on public.budget_allocations from anon;
grant select, insert, update, delete on public.budget_allocations to authenticated;

drop policy if exists budget_allocations_select on public.budget_allocations;
drop policy if exists budget_allocations_insert on public.budget_allocations;
drop policy if exists budget_allocations_update on public.budget_allocations;
drop policy if exists budget_allocations_delete on public.budget_allocations;

create policy budget_allocations_select on public.budget_allocations for select to authenticated using ((select auth.uid()) = user_id);
create policy budget_allocations_insert on public.budget_allocations for insert to authenticated with check ((select auth.uid()) = user_id);
create policy budget_allocations_update on public.budget_allocations for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy budget_allocations_delete on public.budget_allocations for delete to authenticated using ((select auth.uid()) = user_id);

-- ==========================================
-- 5. SAVINGS GOALS & MOVEMENTS
-- ==========================================
create table if not exists public.savings_goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name varchar(100) not null check (length(trim(name)) > 0),
  goal_type text not null default 'general_savings' check (goal_type in ('emergency_fund', 'general_savings', 'short_term_goal', 'other')),
  target_amount bigint not null check (target_amount > 0 and target_amount <= 9007199254740991),
  opening_amount bigint not null default 0 check (opening_amount >= 0 and opening_amount <= 9007199254740991),
  target_date date,
  icon varchar(40) not null default 'PiggyBank',
  notes text check (notes is null or length(notes) <= 2000),
  is_archived boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, user_id)
);

create index if not exists savings_goals_user_idx on public.savings_goals (user_id, is_archived, created_at desc);

drop trigger if exists savings_goals_updated on public.savings_goals;
create trigger savings_goals_updated
  before update on public.savings_goals
  for each row execute function public.set_updated_at();

alter table public.savings_goals enable row level security;
revoke all on public.savings_goals from anon;
grant select, insert, update, delete on public.savings_goals to authenticated;

drop policy if exists savings_goals_select on public.savings_goals;
drop policy if exists savings_goals_insert on public.savings_goals;
drop policy if exists savings_goals_update on public.savings_goals;
drop policy if exists savings_goals_delete on public.savings_goals;

create policy savings_goals_select on public.savings_goals for select to authenticated using ((select auth.uid()) = user_id);
create policy savings_goals_insert on public.savings_goals for insert to authenticated with check ((select auth.uid()) = user_id);
create policy savings_goals_update on public.savings_goals for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy savings_goals_delete on public.savings_goals for delete to authenticated using ((select auth.uid()) = user_id);

create table if not exists public.savings_movements (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  goal_id uuid not null,
  movement_type text not null check (movement_type in ('deposit', 'withdrawal')),
  amount bigint not null check (amount > 0 and amount <= 9007199254740991),
  movement_date date not null default current_date,
  note text check (note is null or length(note) <= 2000),
  created_at timestamptz not null default now(),
  foreign key (goal_id, user_id) references public.savings_goals(id, user_id) on delete cascade
);

create index if not exists savings_movements_user_date_idx on public.savings_movements (user_id, movement_date desc, created_at desc);
create index if not exists savings_movements_goal_idx on public.savings_movements (goal_id, user_id);

alter table public.savings_movements enable row level security;
revoke all on public.savings_movements from anon;
grant select, insert, update, delete on public.savings_movements to authenticated;

drop policy if exists savings_movements_select on public.savings_movements;
drop policy if exists savings_movements_insert on public.savings_movements;
drop policy if exists savings_movements_update on public.savings_movements;
drop policy if exists savings_movements_delete on public.savings_movements;

create policy savings_movements_select on public.savings_movements for select to authenticated using ((select auth.uid()) = user_id);
create policy savings_movements_insert on public.savings_movements for insert to authenticated with check ((select auth.uid()) = user_id);
create policy savings_movements_update on public.savings_movements for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy savings_movements_delete on public.savings_movements for delete to authenticated using ((select auth.uid()) = user_id);

-- ==========================================
-- 6. RPC SERVER FUNCTIONS
-- ==========================================

-- Keep backward compatibility for expense_summary, now strictly filtering by type = 'expense'
create or replace function public.expense_summary(p_start date, p_end date, p_today date)
returns jsonb language sql stable security invoker set search_path = '' as $$
  select jsonb_build_object(
    'total', coalesce((select sum(amount) from public.transactions
      where user_id = (select auth.uid()) and type = 'expense' and transaction_date between p_start and p_end), 0)::text,
    'count', (select count(*) from public.transactions
      where user_id = (select auth.uid()) and type = 'expense' and transaction_date between p_start and p_end),
    'today_total', coalesce((select sum(amount) from public.transactions
      where user_id = (select auth.uid()) and type = 'expense' and transaction_date = p_today), 0)::text,
    'today_count', (select count(*) from public.transactions
      where user_id = (select auth.uid()) and type = 'expense' and transaction_date = p_today),
    'categories', coalesce((select jsonb_agg(row_to_json(result) order by result.total::numeric desc)
      from (select c.id, c.name, c.icon, sum(t.amount)::text as total, count(*) as count
        from public.transactions t join public.categories c on c.id = t.category_id and c.user_id = t.user_id
        where t.user_id = (select auth.uid()) and t.type = 'expense' and t.transaction_date between p_start and p_end
        group by c.id, c.name, c.icon) result), '[]'::jsonb)
  );
$$;

revoke all on function public.expense_summary(date, date, date) from public, anon;
grant execute on function public.expense_summary(date, date, date) to authenticated;

-- Comprehensive finance summary for dashboard & statistics
create or replace function public.finance_summary(p_start date, p_end date, p_today date)
returns jsonb language sql stable security invoker set search_path = '' as $$
  select jsonb_build_object(
    'expense_total', coalesce((select sum(amount) from public.transactions
      where user_id = (select auth.uid()) and type = 'expense' and transaction_date between p_start and p_end), 0)::text,
    'expense_count', (select count(*) from public.transactions
      where user_id = (select auth.uid()) and type = 'expense' and transaction_date between p_start and p_end),
    'income_total', coalesce((select sum(amount) from public.transactions
      where user_id = (select auth.uid()) and type = 'income' and transaction_date between p_start and p_end), 0)::text,
    'income_count', (select count(*) from public.transactions
      where user_id = (select auth.uid()) and type = 'income' and transaction_date between p_start and p_end),
    'today_expense', coalesce((select sum(amount) from public.transactions
      where user_id = (select auth.uid()) and type = 'expense' and transaction_date = p_today), 0)::text,
    'today_income', coalesce((select sum(amount) from public.transactions
      where user_id = (select auth.uid()) and type = 'income' and transaction_date = p_today), 0)::text,
    'savings_deposit', coalesce((select sum(amount) from public.savings_movements
      where user_id = (select auth.uid()) and movement_type = 'deposit' and movement_date between p_start and p_end), 0)::text,
    'savings_withdrawal', coalesce((select sum(amount) from public.savings_movements
      where user_id = (select auth.uid()) and movement_type = 'withdrawal' and movement_date between p_start and p_end), 0)::text,
    'expense_categories', coalesce((select jsonb_agg(row_to_json(exp_res) order by exp_res.total::numeric desc)
      from (select c.id, c.name, c.icon, sum(t.amount)::text as total, count(*) as count
        from public.transactions t join public.categories c on c.id = t.category_id and c.user_id = t.user_id
        where t.user_id = (select auth.uid()) and t.type = 'expense' and t.transaction_date between p_start and p_end
        group by c.id, c.name, c.icon) exp_res), '[]'::jsonb),
    'income_categories', coalesce((select jsonb_agg(row_to_json(inc_res) order by inc_res.total::numeric desc)
      from (select c.id, c.name, c.icon, sum(t.amount)::text as total, count(*) as count
        from public.transactions t join public.categories c on c.id = t.category_id and c.user_id = t.user_id
        where t.user_id = (select auth.uid()) and t.type = 'income' and t.transaction_date between p_start and p_end
        group by c.id, c.name, c.icon) inc_res), '[]'::jsonb)
  );
$$;

revoke all on function public.finance_summary(date, date, date) from public, anon;
grant execute on function public.finance_summary(date, date, date) to authenticated;

commit;
