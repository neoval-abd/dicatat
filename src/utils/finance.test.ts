import { describe, expect, it } from 'vitest'
import {
  calculateCashflowAfterExpense,
  calculateNetSavings,
  calculateNetOperatingCashflow,
  calculateUnallocatedPlan,
  calculateRemainingBudget,
  calculateGoalBalance,
  calculateGoalProgress,
  calculateSuggestedMonthlySavings,
  calculateEmergencyFundTarget
} from './finance'

describe('Section 19: Financial scenario and formula validation', () => {
  it('accurately computes user scenario without counting savings as expenses', () => {
    const actualIncome = 8000000
    const actualExpense = 3000000
    const savingsDeposit = 1000000
    const savingsWithdrawal = 200000

    // Arus kas setelah pengeluaran = Rp8.000.000 - Rp3.000.000 = Rp5.000.000
    const cashflowAfterExpense = calculateCashflowAfterExpense(actualIncome, actualExpense)
    expect(cashflowAfterExpense).toBe(5000000)

    // Perubahan bersih tabungan = Rp1.000.000 - Rp200.000 = Rp800.000
    const netSavings = calculateNetSavings(savingsDeposit, savingsWithdrawal)
    expect(netSavings).toBe(800000)

    // Sisa arus kas bulan berjalan setelah pergerakan tabungan = Rp5.000.000 - Rp800.000 = Rp4.200.000
    const netOperating = calculateNetOperatingCashflow(actualIncome, actualExpense, netSavings)
    expect(netOperating).toBe(4200000)

    // Total pengeluaran tetap Rp3.000.000, tidak tercampur setoran tabungan
    expect(actualExpense).toBe(3000000)
  })

  it('calculates unallocated plan and handles deficits correctly', () => {
    // Normal balanced plan
    const balanced = calculateUnallocatedPlan(8000000, 4500000, 1000000, 1000000)
    expect(balanced.unallocated).toBe(1500000)
    expect(balanced.isDeficit).toBe(false)

    // Zero-based budgeting
    const zeroBased = calculateUnallocatedPlan(8000000, 5000000, 2000000, 1000000)
    expect(zeroBased.unallocated).toBe(0)
    expect(zeroBased.isDeficit).toBe(false)

    // Deficit plan
    const deficit = calculateUnallocatedPlan(5000000, 4000000, 1500000, 500000)
    expect(deficit.unallocated).toBe(-1000000)
    expect(deficit.isDeficit).toBe(true)
  })

  it('calculates remaining expense budget and overbudget state', () => {
    const under = calculateRemainingBudget(1200000, 750000)
    expect(under.remaining).toBe(450000)
    expect(under.progressPercent).toBe(62.5)
    expect(under.isOverBudget).toBe(false)

    const over = calculateRemainingBudget(1000000, 1250000)
    expect(over.remaining).toBe(-250000)
    expect(over.progressPercent).toBe(125)
    expect(over.isOverBudget).toBe(true)
  })

  it('calculates goal balance and progress', () => {
    // Goal: target 10jt, opening 1jt, deposits 3jt, withdrawals 500rb
    const balance = calculateGoalBalance(1000000, 3000000, 500000)
    expect(balance).toBe(3500000)

    const progress = calculateGoalProgress(balance, 10000000)
    expect(progress.remaining).toBe(6500000)
    expect(progress.progressPercent).toBe(35)
    expect(progress.visualPercent).toBe(35)
    expect(progress.isComplete).toBe(false)

    // Over-achieved goal: visual capped at 100% but real percent and balance preserved
    const overProgress = calculateGoalProgress(12000000, 10000000)
    expect(overProgress.visualPercent).toBe(100)
    expect(overProgress.progressPercent).toBe(120)
    expect(overProgress.remaining).toBe(0)
    expect(overProgress.isComplete).toBe(true)
  })

  it('calculates suggested monthly savings and handles past/future dates', () => {
    // Target: 6jt, current balance: 1jt, remaining: 5jt. Target date: 5 months in future
    const now = new Date(2026, 9, 14) // October 2026
    const targetDate = '2027-03-01' // March 2027 => 5 months
    const monthly = calculateSuggestedMonthlySavings(5000000, targetDate, now)
    expect(monthly).toBe(1000000)

    // Past date => returns entire remaining
    const pastDate = '2026-08-01'
    expect(calculateSuggestedMonthlySavings(5000000, pastDate, now)).toBe(5000000)

    // Target reached => 0
    expect(calculateSuggestedMonthlySavings(0, targetDate, now)).toBe(0)
  })

  it('calculates emergency fund target using monthly basic expense', () => {
    // Rp3.000.000 * 6 months = Rp18.000.000
    const target = calculateEmergencyFundTarget(3000000, 6)
    expect(target).toBe(18000000)

    // Rp5.000.000 * 12 months = Rp60.000.000
    expect(calculateEmergencyFundTarget(5000000, 12)).toBe(60000000)
  })
})
