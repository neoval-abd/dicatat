import { PGlite } from '@electric-sql/pglite'
import { readFileSync } from 'node:fs'
import { beforeAll, afterAll, describe, it, expect } from 'vitest'

const a = '00000000-0000-4000-8000-000000000001'
const b = '00000000-0000-4000-8000-000000000002'
const oldTxId = '00000000-0000-4000-8000-000000000010'
const pg = new PGlite()
let catExpenseA: string, catIncomeA: string, catExpenseB: string

const asUser = async (id: string) => {
  await pg.exec(`reset role; set role authenticated; select set_config('request.jwt.claim.sub', '${id}', false);`)
}

beforeAll(async () => {
  await pg.exec(`
    create role anon nologin; create role authenticated nologin;
    create schema auth; create schema storage;
    create table auth.users (id uuid primary key, raw_user_meta_data jsonb default '{}'::jsonb);
    create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
    create table storage.buckets (id text primary key, name text, public boolean, file_size_limit bigint, allowed_mime_types text[]);
    create table storage.objects (id uuid primary key default gen_random_uuid(), bucket_id text, name text);
    create function storage.foldername(name text) returns text[] language sql immutable as $$ select string_to_array(name, '/') $$;
    alter table storage.objects enable row level security;
    grant usage on schema public, auth, storage to authenticated, anon;
    grant select, insert, update, delete on storage.objects to authenticated;
  `)

  // Step 1: Run initial migration
  await pg.exec(readFileSync('supabase/migrations/202610030001_initial.sql', 'utf8'))
  await pg.exec(`insert into auth.users (id, raw_user_meta_data) values ('${a}', '{"name":"User A"}'), ('${b}', '{"name":"User B"}');`)

  // Create an old transaction prior to expansion migration
  catExpenseA = (await pg.query<{ id: string }>(`select id from public.categories where user_id = '${a}' and name = 'Makan & Minum'`)).rows[0].id
  catExpenseB = (await pg.query<{ id: string }>(`select id from public.categories where user_id = '${b}' and name = 'Makan & Minum'`)).rows[0].id

  await asUser(a)
  await pg.exec(`insert into public.transactions (id, category_id, amount, transaction_date, transaction_time, note) values ('${oldTxId}', '${catExpenseA}', 35000, '2026-10-10', '12:00', 'Makan siang sebelum migrasi')`)

  // Step 2: Apply finance expansion migration on existing database
  await pg.exec('reset role;')
  await pg.exec(readFileSync('supabase/migrations/202610140001_finance_expansion.sql', 'utf8'))

  catIncomeA = (await pg.query<{ id: string }>(`select id from public.categories where user_id = '${a}' and name = 'Gaji' and type = 'income'`)).rows[0].id
})

afterAll(async () => {
  await pg.close()
})

describe.sequential('Finance expansion PostgreSQL migration and RLS', () => {
  it('preserves old transaction as expense without altering amount, date, or note', async () => {
    await asUser(a)
    const tx = (await pg.query<{ id: string; amount: string; type: string; note: string }>(`select id, amount, type, note from public.transactions where id = '${oldTxId}'`)).rows[0]
    expect(Number(tx.amount)).toBe(35000)
    expect(tx.type).toBe('expense')
    expect(tx.note).toBe('Makan siang sebelum migrasi')
  })

  it('seeded default income categories for existing users and allows new ones', async () => {
    await asUser(a)
    const incomeCats = (await pg.query(`select * from public.categories where type = 'income'`)).rows
    expect(incomeCats.length).toBeGreaterThanOrEqual(8)

    // Can add a custom income category
    await pg.exec(`insert into public.categories (name, type, icon) values ('Dividen', 'income', 'TrendingUp')`)
    const custom = (await pg.query(`select * from public.categories where name = 'Dividen'`)).rows
    expect(custom).toHaveLength(1)
  })

  it('enforces matching category type for income and expense transactions', async () => {
    await asUser(a)
    // Inserting income with income category -> succeeds
    await pg.exec(`insert into public.transactions (category_id, amount, transaction_date, type, source, note) values ('${catIncomeA}', 8000000, '2026-10-14', 'income', 'PT Maju', 'Gaji pokok')`)

    // Inserting income with expense category -> fails via FK constraint
    await expect(pg.exec(`insert into public.transactions (category_id, amount, transaction_date, type) values ('${catExpenseA}', 500000, '2026-10-14', 'income')`)).rejects.toThrow(/foreign key/)

    // Inserting expense with income category -> fails via FK constraint
    await expect(pg.exec(`insert into public.transactions (category_id, amount, transaction_date, type) values ('${catIncomeA}', 50000, '2026-10-14', 'expense')`)).rejects.toThrow(/foreign key/)
  })

  it('calculates finance_summary correctly and isolates data between users', async () => {
    await asUser(a)
    const summaryA = (await pg.query<{ s: any }>(`select public.finance_summary('2026-10-01', '2026-10-31', '2026-10-14') s`)).rows[0].s
    expect(summaryA.income_total).toBe('8000000')
    expect(summaryA.expense_total).toBe('35000')
    expect(summaryA.income_count).toBe(1)
    expect(summaryA.expense_count).toBe(1)

    // User B summary should be completely empty/isolated
    await asUser(b)
    const summaryB = (await pg.query<{ s: any }>(`select public.finance_summary('2026-10-01', '2026-10-31', '2026-10-14') s`)).rows[0].s
    expect(summaryB.income_total).toBe('0')
    expect(summaryB.expense_total).toBe('0')
  })

  it('supports budget allocations per category and enforces RLS', async () => {
    await asUser(a)
    const budgetRes = await pg.query<{ id: string }>(`insert into public.monthly_budgets (month, year, amount, target_income, planned_savings, planned_emergency) values (10, 2026, 3000000, 8000000, 1000000, 1000000) returning id`)
    const budgetId = budgetRes.rows[0].id

    await pg.exec(`insert into public.budget_allocations (monthly_budget_id, category_id, amount) values ('${budgetId}', '${catExpenseA}', 1200000)`)
    const allocations = (await pg.query(`select * from public.budget_allocations where monthly_budget_id = '${budgetId}'`)).rows
    expect(allocations).toHaveLength(1)

    // User B cannot see User A's allocation
    await asUser(b)
    expect((await pg.query(`select * from public.budget_allocations`)).rows).toHaveLength(0)
  })

  it('supports savings goals and movements, and isolates across users', async () => {
    await asUser(a)
    const goalRes = await pg.query<{ id: string }>(`insert into public.savings_goals (name, goal_type, target_amount, opening_amount, icon) values ('Dana Darurat Pribadi', 'emergency_fund', 18000000, 2000000, 'ShieldAlert') returning id`)
    const goalId = goalRes.rows[0].id

    // User A records deposit
    await pg.exec(`insert into public.savings_movements (goal_id, movement_type, amount, movement_date, note) values ('${goalId}', 'deposit', 1000000, '2026-10-14', 'Setoran Oktober')`)
    // User A records withdrawal
    await pg.exec(`insert into public.savings_movements (goal_id, movement_type, amount, movement_date, note) values ('${goalId}', 'withdrawal', 200000, '2026-10-14', 'Keperluan mendesak')`)

    const movements = (await pg.query(`select * from public.savings_movements where goal_id = '${goalId}'`)).rows
    expect(movements).toHaveLength(2)

    // Check finance summary reflects savings
    const summaryA = (await pg.query<{ s: any }>(`select public.finance_summary('2026-10-01', '2026-10-31', '2026-10-14') s`)).rows[0].s
    expect(summaryA.savings_deposit).toBe('1000000')
    expect(summaryA.savings_withdrawal).toBe('200000')

    // User B cannot see or manipulate User A's goals or movements
    await asUser(b)
    expect((await pg.query(`select * from public.savings_goals`)).rows).toHaveLength(0)
    expect((await pg.query(`select * from public.savings_movements`)).rows).toHaveLength(0)
    await expect(pg.exec(`insert into public.savings_movements (goal_id, movement_type, amount) values ('${goalId}', 'deposit', 50000)`)).rejects.toThrow()
  })
})
