import { db } from '../lib/supabase'
import type { Budget } from '../types'
import { safeAmount } from '../utils/format'

export async function getBudget(userId: string, month: number, year: number): Promise<Budget | null> {
  const { data, error } = await db().from('monthly_budgets').select('*').eq('user_id', userId).eq('month', month).eq('year', year).maybeSingle()
  if (error) throw error
  return data ? { ...data, amount: safeAmount(data.amount) } : null
}
export async function saveBudget(userId: string, month: number, year: number, amount: number) {
  if (safeAmount(amount) <= 0) throw new Error('Budget harus lebih dari Rp0.')
  const { error } = await db().from('monthly_budgets').upsert({ user_id: userId, month, year, amount }, { onConflict: 'user_id,month,year' }).select().single()
  if (error) throw error
}
export async function deleteBudget(userId: string, id: string) {
  const { error } = await db().from('monthly_budgets').delete().eq('user_id', userId).eq('id', id).select('id').single()
  if (error) throw error
}
