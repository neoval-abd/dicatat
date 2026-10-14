import { safeAmount } from './format'

/**
 * Calculates operational cashflow after actual expenses:
 * Income - Expense
 */
export function calculateCashflowAfterExpense(actualIncome: number, actualExpense: number): number {
  return safeAmount(actualIncome) - safeAmount(actualExpense)
}

/**
 * Calculates net savings movement for a period:
 * Deposits - Withdrawals
 */
export function calculateNetSavings(totalDeposits: number, totalWithdrawals: number): number {
  return safeAmount(totalDeposits) - safeAmount(totalWithdrawals)
}

/**
 * Calculates remaining monthly cashflow after expenses and net savings movements:
 * Income - Expense - NetSavings
 * Note: Savings deposits are NOT counted as expenses; they are tracked as capital movements.
 */
export function calculateNetOperatingCashflow(
  actualIncome: number,
  actualExpense: number,
  netSavings: number
): number {
  return calculateCashflowAfterExpense(actualIncome, actualExpense) - netSavings
}

/**
 * Calculates unallocated amount for monthly planning:
 * Target Income - Expense Budget - Total Planned Savings (General + Emergency + Others)
 */
export function calculateUnallocatedPlan(
  targetIncome: number,
  expenseBudget: number,
  plannedSavings: number,
  plannedEmergency: number,
  otherAllocations = 0
): { unallocated: number; isDeficit: boolean } {
  const target = safeAmount(targetIncome)
  const expense = safeAmount(expenseBudget)
  const savings = safeAmount(plannedSavings)
  const emergency = safeAmount(plannedEmergency)
  const others = safeAmount(otherAllocations)

  const totalAllocated = expense + savings + emergency + others
  const unallocated = target - totalAllocated
  return {
    unallocated,
    isDeficit: unallocated < 0
  }
}

/**
 * Calculates remaining expense budget:
 * Budget - Actual Expense
 */
export function calculateRemainingBudget(
  expenseBudget: number,
  actualExpense: number
): { remaining: number; progressPercent: number; isOverBudget: boolean } {
  const budget = safeAmount(expenseBudget)
  const actual = safeAmount(actualExpense)

  const remaining = budget - actual
  const progressPercent = budget > 0 ? (actual / budget) * 100 : 0
  return {
    remaining,
    progressPercent,
    isOverBudget: remaining < 0
  }
}

/**
 * Calculates current balance of a savings goal:
 * Opening Amount + Total Deposits - Total Withdrawals
 */
export function calculateGoalBalance(
  openingAmount: number,
  totalDeposits: number,
  totalWithdrawals: number
): number {
  return safeAmount(openingAmount) + safeAmount(totalDeposits) - safeAmount(totalWithdrawals)
}

/**
 * Calculates progress and remaining shortfall for a savings goal:
 */
export function calculateGoalProgress(
  currentBalance: number,
  targetAmount: number
): {
  progressPercent: number
  visualPercent: number
  remaining: number
  isComplete: boolean
} {
  const balance = safeAmount(Math.max(0, currentBalance))
  const target = safeAmount(targetAmount)

  if (target <= 0) {
    return { progressPercent: 0, visualPercent: 0, remaining: 0, isComplete: false }
  }

  const progressPercent = (balance / target) * 100
  const visualPercent = Math.min(100, Math.max(0, Math.round(progressPercent)))
  const remaining = Math.max(0, target - balance)
  const isComplete = balance >= target

  return {
    progressPercent,
    visualPercent,
    remaining,
    isComplete
  }
}

/**
 * Calculates suggested monthly savings requirement:
 * Remaining / months until target date
 */
export function calculateSuggestedMonthlySavings(
  remaining: number,
  targetDate: string | null,
  now = new Date()
): number {
  if (!targetDate || remaining <= 0) return 0

  const [tYear, tMonth] = targetDate.split('-').map(Number)
  if (!tYear || !tMonth) return 0

  const currentYear = now.getFullYear()
  const currentMonth = now.getMonth() + 1

  const diffMonths = (tYear - currentYear) * 12 + (tMonth - currentMonth)
  if (diffMonths <= 0) {
    return remaining
  }
  return Math.ceil(remaining / diffMonths)
}

/**
 * Calculates emergency fund target:
 * Monthly basic expense * Number of target months
 */
export function calculateEmergencyFundTarget(
  monthlyExpense: number,
  monthsCount: number
): number {
  const expense = safeAmount(Math.max(0, monthlyExpense))
  const months = Math.max(1, Math.min(60, Math.round(monthsCount)))
  return expense * months
}
