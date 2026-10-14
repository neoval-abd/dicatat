import { db } from '../lib/supabase'
import type { GoalType, SavingsGoal, SavingsGoalWithBalance, SavingsMovement, SavingsMovementInput } from '../types'
import { safeAmount } from '../utils/format'

export async function getSavingsGoals(userId: string, includeArchived = false): Promise<SavingsGoalWithBalance[]> {
  let query = db().from('savings_goals').select('*').eq('user_id', userId)
  if (!includeArchived) query = query.eq('is_archived', false)
  const { data: goals, error: goalsError } = await query.order('created_at', { ascending: true })
  if (goalsError) throw goalsError
  if (!goals || goals.length === 0) return []

  // Fetch movements for all goals of this user to compute balances
  const { data: movements, error: movError } = await db()
    .from('savings_movements')
    .select('goal_id, movement_type, amount')
    .eq('user_id', userId)
  if (movError) throw movError

  const sumsByGoal: Record<string, { deposits: number; withdrawals: number }> = {}
  for (const mov of movements || []) {
    if (!sumsByGoal[mov.goal_id]) sumsByGoal[mov.goal_id] = { deposits: 0, withdrawals: 0 }
    const amt = safeAmount(mov.amount)
    if (mov.movement_type === 'deposit') sumsByGoal[mov.goal_id].deposits += amt
    else if (mov.movement_type === 'withdrawal') sumsByGoal[mov.goal_id].withdrawals += amt
  }

  const now = new Date()
  const currentYear = now.getFullYear()
  const currentMonth = now.getMonth() + 1

  return goals.map(goal => {
    const opening = safeAmount(goal.opening_amount || 0)
    const target = safeAmount(goal.target_amount)
    const stats = sumsByGoal[goal.id] || { deposits: 0, withdrawals: 0 }
    const currentBalance = opening + stats.deposits - stats.withdrawals
    const remaining = Math.max(target - currentBalance, 0)
    const progress = target > 0 ? (currentBalance / target) * 100 : 0

    let suggestedMonthly = 0
    if (goal.target_date && remaining > 0) {
      const [tYear, tMonth] = goal.target_date.split('-').map(Number)
      const diffMonths = (tYear - currentYear) * 12 + (tMonth - currentMonth)
      if (diffMonths > 0) {
        suggestedMonthly = Math.ceil(remaining / diffMonths)
      } else if (diffMonths === 0) {
        suggestedMonthly = remaining
      }
    }

    return {
      ...goal,
      target_amount: target,
      opening_amount: opening,
      total_deposits: stats.deposits,
      total_withdrawals: stats.withdrawals,
      current_balance: currentBalance,
      remaining,
      progress,
      suggested_monthly: suggestedMonthly
    }
  })
}

export async function saveSavingsGoal(
  userId: string,
  input: {
    name: string
    goal_type: GoalType
    target_amount: number
    opening_amount?: number
    target_date?: string | null
    icon?: string
    notes?: string | null
  },
  id?: string
) {
  if (!input.name.trim()) throw new Error('Nama tujuan tabungan wajib diisi.')
  const target = safeAmount(input.target_amount)
  if (target <= 0) throw new Error('Target nominal harus lebih dari Rp0.')
  const opening = safeAmount(input.opening_amount ?? 0)

  const payload = {
    user_id: userId,
    name: input.name.trim(),
    goal_type: input.goal_type || 'general_savings',
    target_amount: target,
    opening_amount: opening,
    target_date: input.target_date || null,
    icon: input.icon || 'PiggyBank',
    notes: input.notes?.trim() || null
  }

  const query = id
    ? db().from('savings_goals').update(payload).eq('id', id).eq('user_id', userId)
    : db().from('savings_goals').insert(payload)

  const { data, error } = await query.select().single()
  if (error) throw error
  return data as SavingsGoal
}

export async function archiveSavingsGoal(userId: string, id: string, archived: boolean) {
  const { error } = await db()
    .from('savings_goals')
    .update({ is_archived: archived })
    .eq('id', id)
    .eq('user_id', userId)
  if (error) throw error
}

export async function deleteSavingsGoal(userId: string, id: string) {
  const { error } = await db().from('savings_goals').delete().eq('id', id).eq('user_id', userId).select('id').single()
  if (error) throw error
}

export async function getSavingsMovements(
  userId: string,
  goalId?: string,
  page = 0,
  size = 20
): Promise<{ items: SavingsMovement[]; count: number }> {
  let query = db()
    .from('savings_movements')
    .select('*, goal:savings_goals(id, name, icon, goal_type)', { count: 'exact' })
    .eq('user_id', userId)

  if (goalId) query = query.eq('goal_id', goalId)

  const { data, count, error } = await query
    .order('movement_date', { ascending: false })
    .order('created_at', { ascending: false })
    .range(page * size, (page + 1) * size - 1)

  if (error) throw error
  return {
    items: (data || []).map(item => ({
      ...item,
      amount: safeAmount(item.amount)
    })),
    count: count || 0
  }
}

export async function saveSavingsMovement(
  userId: string,
  input: SavingsMovementInput,
  id?: string
) {
  const amount = safeAmount(input.amount)
  if (amount <= 0) throw new Error('Nominal pergerakan tabungan harus lebih dari Rp0.')
  if (!input.goal_id) throw new Error('Tujuan tabungan wajib dipilih.')
  if (!input.movement_date) throw new Error('Tanggal transaksi wajib diisi.')

  const payload = {
    user_id: userId,
    goal_id: input.goal_id,
    movement_type: input.movement_type,
    amount,
    movement_date: input.movement_date,
    note: input.note?.trim() || null
  }

  const query = id
    ? db().from('savings_movements').update(payload).eq('id', id).eq('user_id', userId)
    : db().from('savings_movements').insert(payload)

  const { data, error } = await query.select('*, goal:savings_goals(id, name, icon, goal_type)').single()
  if (error) throw error
  return {
    ...data,
    amount: safeAmount(data.amount)
  } as SavingsMovement
}

export async function deleteSavingsMovement(userId: string, id: string) {
  const { error } = await db()
    .from('savings_movements')
    .delete()
    .eq('id', id)
    .eq('user_id', userId)
    .select('id')
    .single()
  if (error) throw error
}
