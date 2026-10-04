import { db } from '../lib/supabase'
import type { Filters, Summary, Transaction, TransactionInput } from '../types'
import { safeAmount } from '../utils/format'

export const PAGE_SIZE = 20
const selection = '*, category:categories!transactions_category_id_user_id_fkey(id,name,icon)'

export async function getTransactions(userId: string, filters: Filters = {}, page = 0, size = PAGE_SIZE) {
  let query = db().from('transactions').select(selection, { count: 'exact' }).eq('user_id', userId)
  if (filters.start) query = query.gte('transaction_date', filters.start)
  if (filters.end) query = query.lte('transaction_date', filters.end)
  if (filters.category) query = query.eq('category_id', filters.category)
  if (filters.search?.trim()) query = query.ilike('note', `%${filters.search.trim().replace(/[\\%_]/g, '\\$&')}%`)
  const { data, count, error } = await query.order('transaction_date', { ascending: false })
    .order('transaction_time', { ascending: false }).order('created_at', { ascending: false }).order('id', { ascending: false })
    .range(page * size, (page + 1) * size - 1)
  if (error) throw error
  return { items: (data || []).map(item => ({ ...item, amount: safeAmount(item.amount) })) as unknown as Transaction[], count: count || 0 }
}
export async function saveTransaction(userId: string, input: TransactionInput, id?: string) {
  if (safeAmount(input.amount) <= 0 || !input.category_id || !input.transaction_date) throw new Error('Isi nominal, kategori, dan tanggal dengan benar.')
  const query = id ? db().from('transactions').update(input).eq('id', id).eq('user_id', userId)
    : db().from('transactions').insert({ ...input, user_id: userId })
  const { data, error } = await query.select(selection).single()
  if (error) throw error
  return { ...data, amount: safeAmount(data.amount) } as unknown as Transaction
}
export async function deleteTransaction(userId: string, id: string) {
  const { error } = await db().from('transactions').delete().eq('id', id).eq('user_id', userId).select('id').single()
  if (error) throw error
}
export async function getSummary(start: string, end: string, today: string): Promise<Summary> {
  const { data, error } = await db().rpc('expense_summary', { p_start: start, p_end: end, p_today: today })
  if (error) throw error
  return { ...data, total: safeAmount(data.total), today_total: safeAmount(data.today_total),
    categories: data.categories.map((c: { total: number | string }) => ({ ...c, total: safeAmount(c.total) })) }
}
