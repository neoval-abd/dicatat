import { createClient } from '@supabase/supabase-js'
import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'

const names = ['SUPABASE_URL', 'SUPABASE_ANON_KEY', 'TEST_USER_A_EMAIL', 'TEST_USER_A_PASSWORD', 'TEST_USER_B_EMAIL', 'TEST_USER_B_PASSWORD']
const missing = names.filter(name => !process.env[name])
if (missing.length) { console.error(`Belum dapat diuji. Isi environment: ${missing.join(', ')}`); process.exit(1) }
if (process.env.SUPABASE_ANON_KEY.startsWith('sb_secret_')) throw new Error('Gunakan key publik, bukan secret key.')
const makeClient = () => createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY, { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } })
const clientA = makeClient(), clientB = makeClient(), anonymous = makeClient()
const artifacts = []
let filePath, userA, userB
const token = randomUUID()
const date = '2098-08-13'

async function result(query) {
  const { data, error } = await query
  if (error) throw new Error(`Pengujian gagal: ${error.code || 'API'} ${error.message}`)
  return data
}
async function rejected(query, label) {
  const { error } = await query
  assert.ok(error, `${label}: akses lintas akun seharusnya ditolak`)
}
async function invisible(query, label) {
  const { data, error } = await query
  assert.ok(error || !data?.length, `${label}: data akun lain terbuka`)
}
async function create(client, table, input) {
  const id = randomUUID()
  const record = await result(client.from(table).insert({ ...input, id }).select().single())
  artifacts.push({ client, table, id })
  return record
}
async function checkIsolation(table, ownA, ownB, createInput, updateInput) {
  await invisible(clientB.from(table).select('*').eq('id', ownA.id), `${table} SELECT`)
  await invisible(clientB.from(table).update(updateInput).eq('id', ownA.id).select(), `${table} UPDATE`)
  await invisible(clientB.from(table).delete().eq('id', ownA.id).select(), `${table} DELETE`)
  await rejected(clientB.from(table).insert({ ...createInput, user_id: userA.id }), `${table} INSERT`)
  assert.ok(await result(clientA.from(table).select('*').eq('id', ownA.id).single()))
  assert.ok(await result(clientB.from(table).select('*').eq('id', ownB.id).single()))
}

try {
  userA = (await result(clientA.auth.signInWithPassword({ email: process.env.TEST_USER_A_EMAIL, password: process.env.TEST_USER_A_PASSWORD }))).user
  userB = (await result(clientB.auth.signInWithPassword({ email: process.env.TEST_USER_B_EMAIL, password: process.env.TEST_USER_B_PASSWORD }))).user
  assert.notEqual(userA.id, userB.id, 'Akun A dan B harus berbeda')
  console.log('Login dua akun: lulus')
  const catA = await create(clientA, 'categories', { user_id: userA.id, name: `Uji A ${token}`, icon: 'Shapes' })
  const catB = await create(clientB, 'categories', { user_id: userB.id, name: `Uji B ${token}`, icon: 'Shapes' })
  await checkIsolation('categories', catA, catB, { name: `Forbidden ${token}`, icon: 'Shapes' }, { name: `Stolen ${token}` })
  await result(clientA.from('categories').update({ name: `Uji diubah ${token}` }).eq('id', catA.id).select().single())
  const profileA = await result(clientA.from('profiles').select('*').eq('id', userA.id).single())
  const profileB = await result(clientB.from('profiles').select('*').eq('id', userB.id).single())
  await invisible(clientB.from('profiles').select('*').eq('id', profileA.id), 'profiles SELECT')
  await invisible(clientB.from('profiles').update({ name: 'Forbidden' }).eq('id', profileA.id).select(), 'profiles UPDATE')
  await invisible(clientB.from('profiles').delete().eq('id', profileA.id).select(), 'profiles DELETE')
  await rejected(clientB.from('profiles').insert({ id: profileA.id, name: 'Forbidden' }), 'profiles INSERT')
  assert.equal((await result(clientA.from('profiles').select('name').eq('id', profileA.id).single())).name, profileA.name)
  assert.equal((await result(clientB.from('profiles').select('name').eq('id', profileB.id).single())).name, profileB.name)
  const baseline = await result(clientA.rpc('expense_summary', { p_start: '2098-08-01', p_end: '2098-08-31', p_today: date }))
  const png = Uint8Array.from(Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aOy0AAAAASUVORK5CYII=', 'base64'))
  filePath = `${userA.id}/2098/08/${token}.png`
  await result(clientA.storage.from('receipts').upload(filePath, png, { contentType: 'image/png' }))
  await rejected(clientB.storage.from('receipts').createSignedUrl(filePath, 60), 'Storage signed URL')
  await rejected(clientB.storage.from('receipts').upload(`${userA.id}/2098/08/forbidden-${token}.png`, png, { contentType: 'image/png' }), 'Storage INSERT')
  // Some Storage delete APIs return success for zero visible files: verify the original survives.
  await clientB.storage.from('receipts').remove([filePath])
  await result(clientA.storage.from('receipts').createSignedUrl(filePath, 60))
  await rejected(clientB.storage.from('receipts').update(filePath, png, { contentType: 'image/png' }), 'Storage UPDATE')
  const signed = await result(clientA.storage.from('receipts').createSignedUrl(filePath, 60))
  assert.equal((await fetch(signed.signedUrl)).status, 200)
  const input = { amount: 45000, category_id: catA.id, transaction_date: date, transaction_time: '12:40', note: `Nota uji ${token}`, receipt_path: filePath }
  const txA = await create(clientA, 'transactions', { ...input, user_id: userA.id })
  const txB = await create(clientB, 'transactions', { ...input, user_id: userB.id, category_id: catB.id, receipt_path: null })
  await checkIsolation('transactions', txA, txB, input, { amount: 999 })
  await rejected(clientA.from('transactions').insert({ ...input, user_id: userA.id, category_id: catB.id }), 'Kategori lintas akun')
  await rejected(clientA.from('categories').delete().eq('id', catA.id), 'Kategori terpakai')
  const after = await result(clientA.rpc('expense_summary', { p_start: '2098-08-01', p_end: '2098-08-31', p_today: date }))
  assert.equal(BigInt(after.total) - BigInt(baseline.total), 45000n)
  assert.equal(after.count - baseline.count, 1)
  await result(clientA.from('transactions').update({ amount: 50000, note: `Nota diubah ${token}` }).eq('id', txA.id).select().single())
  const matches = await result(clientA.from('transactions').select('*').eq('category_id', catA.id).gte('transaction_date', date).lte('transaction_date', date).ilike('note', `%${token}%`).range(0, 19))
  assert.equal(matches.length, 1); assert.equal(Number(matches[0].amount), 50000)
  // Use an unused distant month so an existing personal budget is never overwritten.
  const budgetA = await create(clientA, 'monthly_budgets', { user_id: userA.id, month: 8, year: 2098, amount: 100000 })
  const budgetB = await create(clientB, 'monthly_budgets', { user_id: userB.id, month: 8, year: 2098, amount: 100000 })
  await checkIsolation('monthly_budgets', budgetA, budgetB, { month: 9, year: 2098, amount: 100000 }, { amount: 1 })
  await result(clientA.from('monthly_budgets').update({ amount: 120000 }).eq('id', budgetA.id).select().single())
  await invisible(anonymous.from('transactions').select('*'), 'Anonymous SELECT')
  await rejected(anonymous.rpc('expense_summary', { p_start: '2098-08-01', p_end: '2098-08-31', p_today: date }), 'Anonymous summary')
  console.log('CRUD, filter, agregasi, budget, isolasi empat tabel dan Storage: lulus')
} catch (error) {
  console.error(error.message)
  process.exitCode = 1
} finally {
  let cleanupFailed = false
  for (const item of artifacts.reverse()) {
    const { error } = await item.client.from(item.table).delete().eq('id', item.id)
    if (error) cleanupFailed = true
  }
  if (filePath) {
    const { error } = await clientA.storage.from('receipts').remove([filePath])
    if (error) cleanupFailed = true
    else {
      const { error: stillExists } = await clientA.storage.from('receipts').createSignedUrl(filePath, 60)
      if (!stillExists) cleanupFailed = true
    }
  }
  await Promise.allSettled([clientA.auth.signOut(), clientB.auth.signOut()])
  if (cleanupFailed) { console.error(`Pembersihan gagal. Periksa data uji dengan penanda ${token} melalui Supabase.`); process.exitCode = 1 }
  else if (artifacts.length) console.log('Pembersihan data uji dan foto: lulus')
}
