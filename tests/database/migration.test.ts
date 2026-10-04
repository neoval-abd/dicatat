import { PGlite } from '@electric-sql/pglite'
import { readFileSync } from 'node:fs'
import { beforeAll, afterAll, describe, it, expect } from 'vitest'

const a = '00000000-0000-4000-8000-000000000001'
const b = '00000000-0000-4000-8000-000000000002'
const transactionId = '00000000-0000-4000-8000-000000000003'
const pg = new PGlite()
let catA: string, catB: string
const asUser = async (id: string) => { await pg.exec(`reset role; set role authenticated; select set_config('request.jwt.claim.sub', '${id}', false);`) }

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
  await pg.exec(readFileSync('supabase/migrations/202610030001_initial.sql', 'utf8'))
  await pg.exec(`insert into auth.users (id, raw_user_meta_data) values ('${a}', '{"name":"A"}'), ('${b}', '{"name":"B"}');`)
  catA = (await pg.query<{ id: string }>(`select id from public.categories where user_id = '${a}' and name = 'Makan & Minum'`)).rows[0].id
  catB = (await pg.query<{ id: string }>(`select id from public.categories where user_id = '${b}' and name = 'Makan & Minum'`)).rows[0].id
})
afterAll(async () => { await pg.close() })

describe.sequential('real PostgreSQL migration with minimal Supabase schemas', () => {
  it('creates private bucket and seeds each profile and nine categories', async () => {
    await pg.exec('reset role')
    expect((await pg.query(`select * from public.categories where user_id = '${a}'`)).rows).toHaveLength(9)
    expect((await pg.query(`select * from public.categories where user_id = '${b}'`)).rows).toHaveLength(9)
    expect((await pg.query<{ public: boolean }>(`select public from storage.buckets where id = 'receipts'`)).rows[0].public).toBe(false)
    expect((await pg.query(`select * from public.profiles`)).rows).toHaveLength(2)
  })
  it('enforces SELECT, INSERT, UPDATE, DELETE isolation for categories and profiles', async () => {
    await asUser(a)
    expect((await pg.query(`select * from public.categories`)).rows).toHaveLength(9)
    expect((await pg.query(`select * from public.profiles where id = '${b}'`)).rows).toHaveLength(0)
    await expect(pg.exec(`insert into public.categories (user_id, name) values ('${b}', 'Forbidden')`)).rejects.toThrow(/row-level security/)
    expect((await pg.query(`update public.categories set name = 'Forbidden' where id = '${catB}' returning id`)).rows).toHaveLength(0)
    expect((await pg.query(`delete from public.categories where id = '${catB}' returning id`)).rows).toHaveLength(0)
    await expect(pg.exec(`update public.profiles set id = '${b}' where id = '${a}'`)).rejects.toThrow()
    await expect(pg.exec(`insert into public.profiles (id) values ('00000000-0000-4000-8000-000000000009')`)).rejects.toThrow(/row-level security/)
    expect((await pg.query(`update public.profiles set name = 'Forbidden' where id = '${b}' returning id`)).rows).toHaveLength(0)
    expect((await pg.query(`delete from public.profiles where id = '${b}' returning id`)).rows).toHaveLength(0)
  })
  it('rejects cross-account categories, zero amounts, unsafe amounts, and other receipt folders', async () => {
    await asUser(a)
    await expect(pg.exec(`insert into public.transactions (category_id, amount, transaction_date) values ('${catB}', 45000, '2026-10-03')`)).rejects.toThrow(/foreign key/)
    await expect(pg.exec(`insert into public.transactions (category_id, amount, transaction_date) values ('${catA}', 0, '2026-10-03')`)).rejects.toThrow(/check constraint/)
    await expect(pg.exec(`insert into public.transactions (category_id, amount, transaction_date) values ('${catA}', 9007199254740992, '2026-10-03')`)).rejects.toThrow(/check constraint/)
    await expect(pg.exec(`insert into public.transactions (category_id, amount, transaction_date, receipt_path) values ('${catA}', 45000, '2026-10-03', '${b}/2026/10/receipt.jpg')`)).rejects.toThrow(/check constraint/)
    await pg.exec(`insert into public.transactions (id, category_id, amount, transaction_date, transaction_time) values ('${transactionId}', '${catA}', 45000, '2026-10-03', '12:40')`)
  })
  it('aggregates exact totals on server and follows caller RLS', async () => {
    await asUser(a)
    const summary = (await pg.query<{ s: { total: string; count: number; today_total: string; categories: { total: string }[] } }>(`select public.expense_summary('2026-10-01', '2026-10-31', '2026-10-03') s`)).rows[0].s
    expect(summary.total).toBe('45000'); expect(summary.today_total).toBe('45000'); expect(summary.count).toBe(1); expect(summary.categories[0].total).toBe('45000')
    await asUser(b)
    expect((await pg.query<{ s: { total: string } }>(`select public.expense_summary('2026-10-01', '2026-10-31', '2026-10-03') s`)).rows[0].s.total).toBe('0')
    expect((await pg.query(`select * from public.transactions`)).rows).toHaveLength(0)
    await expect(pg.exec(`insert into public.transactions (user_id, category_id, amount, transaction_date) values ('${a}', '${catA}', 5000, '2026-10-03')`)).rejects.toThrow(/row-level security/)
    expect((await pg.query(`update public.transactions set amount = 999 where id = '${transactionId}' returning id`)).rows).toHaveLength(0)
    expect((await pg.query(`delete from public.transactions where id = '${transactionId}' returning id`)).rows).toHaveLength(0)
    await asUser(a)
    await expect(pg.exec(`delete from public.categories where id = '${catA}'`)).rejects.toThrow(/foreign key/)
    await pg.exec(`update public.transactions set amount = 50000 where id = '${transactionId}'`)
    expect((await pg.query<{ s: { total: string } }>(`select public.expense_summary('2026-10-01', '2026-10-31', '2026-10-03') s`)).rows[0].s.total).toBe('50000')
  })
  it('protects budgets and enforces unique month per user', async () => {
    await asUser(a)
    await pg.exec(`insert into public.monthly_budgets (month, year, amount) values (10, 2026, 100000)`)
    await expect(pg.exec(`insert into public.monthly_budgets (month, year, amount) values (10, 2026, 200000)`)).rejects.toThrow(/unique constraint/)
    await asUser(b)
    expect((await pg.query(`select * from public.monthly_budgets`)).rows).toHaveLength(0)
    await expect(pg.exec(`insert into public.monthly_budgets (user_id, month, year, amount) values ('${a}', 11, 2026, 100000)`)).rejects.toThrow(/row-level security/)
    expect((await pg.query(`update public.monthly_budgets set amount = 999 where user_id = '${a}' returning id`)).rows).toHaveLength(0)
    expect((await pg.query(`delete from public.monthly_budgets where user_id = '${a}' returning id`)).rows).toHaveLength(0)
    await pg.exec(`insert into public.monthly_budgets (month, year, amount) values (10, 2026, 100000)`)
  })
  it('enforces storage object policies on every operation', async () => {
    await asUser(a)
    await pg.exec(`insert into storage.objects (bucket_id, name) values ('receipts', '${a}/2026/10/a.jpg')`)
    await expect(pg.exec(`insert into storage.objects (bucket_id, name) values ('receipts', '${b}/2026/10/b.jpg')`)).rejects.toThrow(/row-level security/)
    await expect(pg.exec(`update storage.objects set name = '${b}/2026/10/a.jpg' where name = '${a}/2026/10/a.jpg'`)).rejects.toThrow(/row-level security/)
    await asUser(b)
    expect((await pg.query(`select * from storage.objects`)).rows).toHaveLength(0)
    expect((await pg.query(`update storage.objects set name = '${b}/2026/10/stolen.jpg' where name = '${a}/2026/10/a.jpg' returning id`)).rows).toHaveLength(0)
    expect((await pg.query(`delete from storage.objects where name = '${a}/2026/10/a.jpg' returning id`)).rows).toHaveLength(0)
    await asUser(a)
    expect((await pg.query(`delete from storage.objects where name = '${a}/2026/10/a.jpg' returning id`)).rows).toHaveLength(1)
  })
  it('denies anonymous data and summary access', async () => {
    await pg.exec('reset role; set role anon;')
    await expect(pg.exec('select * from public.transactions')).rejects.toThrow(/permission denied/)
    await expect(pg.exec(`select public.expense_summary('2026-10-01', '2026-10-31', '2026-10-03')`)).rejects.toThrow(/permission denied/)
  })
  it('allows backend account deletion to cascade without category FK deadlocks', async () => {
    await pg.exec('reset role')
    await pg.exec(`insert into public.transactions (user_id, category_id, amount, transaction_date) values ('${b}', '${catB}', 10000, '2026-10-03')`)
    await pg.exec(`delete from auth.users where id = '${b}'`)
    expect((await pg.query(`select * from public.transactions where user_id = '${b}'`)).rows).toHaveLength(0)
    expect((await pg.query(`select * from public.categories where user_id = '${b}'`)).rows).toHaveLength(0)
    expect((await pg.query(`select * from public.monthly_budgets where user_id = '${b}'`)).rows).toHaveLength(0)
    expect((await pg.query(`select * from public.profiles where id = '${b}'`)).rows).toHaveLength(0)
  })
})
