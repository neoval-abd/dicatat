import { db } from '../lib/supabase'
import type { Budget, BudgetAllocation } from '../types'
import { safeAmount } from '../utils/format'

export async function getBudget(userId: string, month: number, year: number): Promise<Budget | null> {
  const { data, error } = await db()
    .from('monthly_budgets')
    .select('*')
    .eq('user_id', userId)
    .eq('month', month)
    .eq('year', year)
    .maybeSingle()
  if (error) throw error
  if (!data) return null
  return {
    ...data,
    amount: safeAmount(data.amount),
    target_income: safeAmount(data.target_income || 0),
    planned_savings: safeAmount(data.planned_savings || 0),
    planned_emergency: safeAmount(data.planned_emergency || 0)
  }
}

export async function saveBudget(
  userId: string,
  month: number,
  year: number,
  amount: number,
  targetIncome = 0,
  plannedSavings = 0,
  plannedEmergency = 0
) {
  const cleanAmount = safeAmount(amount)
  const cleanTarget = safeAmount(targetIncome)
  const cleanSavings = safeAmount(plannedSavings)
  const cleanEmergency = safeAmount(plannedEmergency)

  const payload = {
    user_id: userId,
    month,
    year,
    amount: cleanAmount,
    target_income: cleanTarget,
    planned_savings: cleanSavings,
    planned_emergency: cleanEmergency
  }

  const { data, error } = await db()
    .from('monthly_budgets')
    .upsert(payload, { onConflict: 'user_id,month,year' })
    .select()
    .single()
  if (error) throw error
  return {
    ...data,
    amount: safeAmount(data.amount),
    target_income: safeAmount(data.target_income || 0),
    planned_savings: safeAmount(data.planned_savings || 0),
    planned_emergency: safeAmount(data.planned_emergency || 0)
  } as Budget
}

export async function deleteBudget(userId: string, id: string) {
  const { error } = await db().from('monthly_budgets').delete().eq('user_id', userId).eq('id', id).select('id').single()
  if (error) throw error
}

export async function getBudgetAllocations(monthlyBudgetId: string): Promise<BudgetAllocation[]> {
  const { data, error } = await db()
    .from('budget_allocations')
    .select('*, category:categories(id, name, icon)')
    .eq('monthly_budget_id', monthlyBudgetId)
    .order('amount', { ascending: false })
  if (error) throw error
  return (data || []).map(item => ({
    ...item,
    amount: safeAmount(item.amount)
  }))
}

export async function saveBudgetAllocation(
  userId: string,
  monthlyBudgetId: string,
  categoryId: string,
  amount: number,
  notes?: string | null,
  id?: string
) {
  const cleanAmount = safeAmount(amount)
  if (cleanAmount <= 0) throw new Error('Alokasi kategori harus lebih dari Rp0.')
  const payload = {
    user_id: userId,
    monthly_budget_id: monthlyBudgetId,
    category_id: categoryId,
    amount: cleanAmount,
    notes: notes?.trim() || null
  }
  const query = id
    ? db().from('budget_allocations').update(payload).eq('id', id).eq('user_id', userId)
    : db().from('budget_allocations').upsert(payload, { onConflict: 'monthly_budget_id,category_id' })
  const { data, error } = await query.select('*, category:categories(id, name, icon)').single()
  if (error) throw error
  return {
    ...data,
    amount: safeAmount(data.amount)
  } as BudgetAllocation
}

export async function deleteBudgetAllocation(userId: string, id: string) {
  const { error } = await db().from('budget_allocations').delete().eq('user_id', userId).eq('id', id).select('id').single()
  if (error) throw error
}
