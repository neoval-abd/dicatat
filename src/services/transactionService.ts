import { db } from '../lib/supabase'
import type { Filters, FinanceSummary, Summary, Transaction, TransactionInput } from '../types'
import { safeAmount } from '../utils/format'

export const PAGE_SIZE = 20
const selection = '*, category:categories!transactions_category_id_user_id_fkey(id,name,icon,type)'

export async function getTransactions(userId: string, filters: Filters = {}, page = 0, size = PAGE_SIZE) {
  let query = db().from('transactions').select(selection, { count: 'exact' }).eq('user_id', userId)
  if (filters.type && filters.type !== 'all') query = query.eq('type', filters.type)
  if (filters.start) query = query.gte('transaction_date', filters.start)
  if (filters.end) query = query.lte('transaction_date', filters.end)
  if (filters.category) query = query.eq('category_id', filters.category)
  if (filters.search?.trim()) {
    const escaped = filters.search.trim().replace(/[\\%_]/g, '\\$&')
    query = query.or(`note.ilike.%${escaped}%,source.ilike.%${escaped}%`)
  }
  const { data, count, error } = await query
    .order('transaction_date', { ascending: false })
    .order('transaction_time', { ascending: false })
    .order('created_at', { ascending: false })
    .order('id', { ascending: false })
    .range(page * size, (page + 1) * size - 1)
  if (error) throw error
  return {
    items: (data || []).map(item => ({
      ...item,
      amount: safeAmount(item.amount),
      type: item.type || 'expense',
      category: {
        ...item.category,
        type: item.category?.type || item.type || 'expense'
      }
    })) as unknown as Transaction[],
    count: count || 0
  }
}

export async function saveTransaction(userId: string, input: TransactionInput, id?: string) {
  const amount = safeAmount(input.amount)
  if (amount <= 0 || !input.category_id || !input.transaction_date) {
    throw new Error('Isi nominal, kategori, dan tanggal dengan benar.')
  }
  const payload = {
    type: input.type || 'expense',
    amount,
    category_id: input.category_id,
    transaction_date: input.transaction_date,
    transaction_time: input.transaction_time || '12:00',
    source: input.source?.trim() || null,
    note: input.note?.trim() || null,
    receipt_path: input.receipt_path || null
  }
  const query = id
    ? db().from('transactions').update(payload).eq('id', id).eq('user_id', userId)
    : db().from('transactions').insert({ ...payload, user_id: userId })
  const { data, error } = await query.select(selection).single()
  if (error) throw error
  return {
    ...data,
    amount: safeAmount(data.amount),
    type: data.type || 'expense',
    category: {
      ...data.category,
      type: data.category?.type || data.type || 'expense'
    }
  } as unknown as Transaction
}

export async function deleteTransaction(userId: string, id: string) {
  const { error } = await db().from('transactions').delete().eq('id', id).eq('user_id', userId).select('id').single()
  if (error) throw error
}

export async function getSummary(start: string, end: string, today: string): Promise<Summary> {
  const { data, error } = await db().rpc('expense_summary', { p_start: start, p_end: end, p_today: today })
  if (error) throw error
  return {
    ...data,
    total: safeAmount(data.total),
    today_total: safeAmount(data.today_total),
    categories: (data.categories || []).map((c: { total: number | string }) => ({ ...c, total: safeAmount(c.total) }))
  }
}

export async function getFinanceSummary(start: string, end: string, today: string): Promise<FinanceSummary> {
  const { data, error } = await db().rpc('finance_summary', { p_start: start, p_end: end, p_today: today })
  if (error) throw error
  return {
    expense_total: safeAmount(data.expense_total),
    expense_count: Number(data.expense_count || 0),
    income_total: safeAmount(data.income_total),
    income_count: Number(data.income_count || 0),
    today_expense: safeAmount(data.today_expense),
    today_income: safeAmount(data.today_income),
    savings_deposit: safeAmount(data.savings_deposit),
    savings_withdrawal: safeAmount(data.savings_withdrawal),
    expense_categories: (data.expense_categories || []).map((c: { total: number | string }) => ({ ...c, total: safeAmount(c.total) })),
    income_categories: (data.income_categories || []).map((c: { total: number | string }) => ({ ...c, total: safeAmount(c.total) }))
  }
}
