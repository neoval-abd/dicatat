-- Run once in a new Supabase project (SQL Editor). All changes are transactional.
begin;

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name varchar(100) not null default '',
  created_at timestamptz not null default now()
);

create table public.categories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name varchar(60) not null check (length(trim(name)) > 0),
  icon varchar(40) not null default 'Shapes',
  created_at timestamptz not null default now(),
  unique (id, user_id),
  unique (user_id, name)
);

create table public.transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  category_id uuid not null,
  amount bigint not null check (amount > 0 and amount <= 9007199254740991),
  transaction_date date not null,
  transaction_time time not null default localtime,
  note text check (length(note) <= 2000),
  receipt_path text check (receipt_path is null or split_part(receipt_path, '/', 1) = user_id::text),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- NO ACTION rejects deleting used categories while allowing all rows to cascade
  -- together when an auth account is removed by the backend.
  foreign key (category_id, user_id) references public.categories(id, user_id) on delete no action
);

create table public.monthly_budgets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  month integer not null check (month between 1 and 12),
  year integer not null check (year between 1 and 9999),
  amount bigint not null check (amount > 0 and amount <= 9007199254740991),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, month, year)
);

create index transactions_user_date_idx on public.transactions (user_id, transaction_date desc, transaction_time desc, created_at desc, id desc);
create index transactions_category_user_idx on public.transactions (category_id, user_id);

create function public.set_updated_at() returns trigger
language plpgsql set search_path = '' as $$
begin
  new.updated_at = now();
  return new;
end;
$$;
create trigger transactions_updated before update on public.transactions for each row execute function public.set_updated_at();
create trigger budgets_updated before update on public.monthly_budgets for each row execute function public.set_updated_at();

create function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id, name)
  values (new.id, left(coalesce(new.raw_user_meta_data->>'name', ''), 100));
  insert into public.categories (user_id, name, icon) values
    (new.id, 'Makan & Minum', 'Utensils'),
    (new.id, 'Transportasi', 'Car'),
    (new.id, 'Belanja', 'ShoppingBag'),
    (new.id, 'Tagihan', 'ReceiptText'),
    (new.id, 'Kesehatan', 'HeartPulse'),
    (new.id, 'Hiburan', 'Gamepad2'),
    (new.id, 'Pendidikan', 'GraduationCap'),
    (new.id, 'Rumah Tangga', 'House'),
    (new.id, 'Lainnya', 'Shapes');
  return new;
end;
$$;
revoke all on function public.handle_new_user() from public, anon, authenticated;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

-- Support accounts created before the migration as well.
insert into public.profiles (id, name)
select id, left(coalesce(raw_user_meta_data->>'name', ''), 100) from auth.users on conflict do nothing;
insert into public.categories (user_id, name, icon)
select u.id, c.name, c.icon from auth.users u cross join (values
  ('Makan & Minum', 'Utensils'), ('Transportasi', 'Car'), ('Belanja', 'ShoppingBag'),
  ('Tagihan', 'ReceiptText'), ('Kesehatan', 'HeartPulse'), ('Hiburan', 'Gamepad2'),
  ('Pendidikan', 'GraduationCap'), ('Rumah Tangga', 'House'), ('Lainnya', 'Shapes')
) c(name, icon) on conflict do nothing;

alter table public.profiles enable row level security;
alter table public.categories enable row level security;
alter table public.transactions enable row level security;
alter table public.monthly_budgets enable row level security;

revoke all on public.profiles, public.categories, public.transactions, public.monthly_budgets from anon;
grant select, insert, update, delete on public.profiles, public.categories, public.transactions, public.monthly_budgets to authenticated;

create policy profiles_select on public.profiles for select to authenticated using ((select auth.uid()) = id);
create policy profiles_insert on public.profiles for insert to authenticated with check ((select auth.uid()) = id);
create policy profiles_update on public.profiles for update to authenticated using ((select auth.uid()) = id) with check ((select auth.uid()) = id);
create policy profiles_delete on public.profiles for delete to authenticated using ((select auth.uid()) = id);

create policy categories_select on public.categories for select to authenticated using ((select auth.uid()) = user_id);
create policy categories_insert on public.categories for insert to authenticated with check ((select auth.uid()) = user_id);
create policy categories_update on public.categories for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy categories_delete on public.categories for delete to authenticated using ((select auth.uid()) = user_id);

create policy transactions_select on public.transactions for select to authenticated using ((select auth.uid()) = user_id);
create policy transactions_insert on public.transactions for insert to authenticated with check ((select auth.uid()) = user_id);
create policy transactions_update on public.transactions for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy transactions_delete on public.transactions for delete to authenticated using ((select auth.uid()) = user_id);

create policy budgets_select on public.monthly_budgets for select to authenticated using ((select auth.uid()) = user_id);
create policy budgets_insert on public.monthly_budgets for insert to authenticated with check ((select auth.uid()) = user_id);
create policy budgets_update on public.monthly_budgets for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy budgets_delete on public.monthly_budgets for delete to authenticated using ((select auth.uid()) = user_id);

-- Server aggregation: no unbounded transaction download, and RLS remains active.
create function public.expense_summary(p_start date, p_end date, p_today date)
returns jsonb language sql stable security invoker set search_path = '' as $$
  select jsonb_build_object(
    'total', coalesce((select sum(amount) from public.transactions
      where user_id = (select auth.uid()) and transaction_date between p_start and p_end), 0)::text,
    'count', (select count(*) from public.transactions
      where user_id = (select auth.uid()) and transaction_date between p_start and p_end),
    'today_total', coalesce((select sum(amount) from public.transactions
      where user_id = (select auth.uid()) and transaction_date = p_today), 0)::text,
    'today_count', (select count(*) from public.transactions
      where user_id = (select auth.uid()) and transaction_date = p_today),
    'categories', coalesce((select jsonb_agg(row_to_json(result) order by result.total::numeric desc)
      from (select c.id, c.name, c.icon, sum(t.amount)::text as total, count(*) as count
        from public.transactions t join public.categories c on c.id = t.category_id and c.user_id = t.user_id
        where t.user_id = (select auth.uid()) and t.transaction_date between p_start and p_end
        group by c.id, c.name, c.icon) result), '[]'::jsonb)
  );
$$;
revoke all on function public.expense_summary(date, date, date) from public, anon;
grant execute on function public.expense_summary(date, date, date) to authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('receipts', 'receipts', false, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update set public = false, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

create policy receipts_select on storage.objects for select to authenticated
using (bucket_id = 'receipts' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy receipts_insert on storage.objects for insert to authenticated
with check (bucket_id = 'receipts' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy receipts_update on storage.objects for update to authenticated
using (bucket_id = 'receipts' and (storage.foldername(name))[1] = (select auth.uid())::text)
with check (bucket_id = 'receipts' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy receipts_delete on storage.objects for delete to authenticated
using (bucket_id = 'receipts' and (storage.foldername(name))[1] = (select auth.uid())::text);

commit;
