export type TransactionType = 'income' | 'expense'

export interface Profile {
  id: string
  name: string
  created_at: string
}

export interface Category {
  id: string
  user_id: string
  name: string
  icon: string
  type: TransactionType
  created_at: string
}

export interface Transaction {
  id: string
  user_id: string
  category_id: string
  type: TransactionType
  amount: number
  transaction_date: string
  transaction_time: string
  source: string | null
  note: string | null
  receipt_path: string | null
  created_at: string
  updated_at: string
  category: Pick<Category, 'id' | 'name' | 'icon' | 'type'>
}

export type TransactionInput = {
  type: TransactionType
  amount: number
  category_id: string
  transaction_date: string
  transaction_time: string
  source?: string | null
  note?: string | null
  receipt_path?: string | null
}

export interface Budget {
  id: string
  user_id: string
  month: number
  year: number
  amount: number
  target_income: number
  planned_savings: number
  planned_emergency: number
  created_at: string
  updated_at: string
}

export interface BudgetAllocation {
  id: string
  user_id: string
  monthly_budget_id: string
  category_id: string
  amount: number
  notes: string | null
  created_at: string
  updated_at: string
  category?: Pick<Category, 'id' | 'name' | 'icon'>
}

export type GoalType = 'emergency_fund' | 'general_savings' | 'short_term_goal' | 'other'

export interface SavingsGoal {
  id: string
  user_id: string
  name: string
  goal_type: GoalType
  target_amount: number
  opening_amount: number
  target_date: string | null
  icon: string
  notes: string | null
  is_archived: boolean
  created_at: string
  updated_at: string
}

export interface SavingsGoalWithBalance extends SavingsGoal {
  total_deposits: number
  total_withdrawals: number
  current_balance: number
  remaining: number
  progress: number
  suggested_monthly: number
}

export type MovementType = 'deposit' | 'withdrawal'

export interface SavingsMovement {
  id: string
  user_id: string
  goal_id: string
  movement_type: MovementType
  amount: number
  movement_date: string
  note: string | null
  created_at: string
  goal?: Pick<SavingsGoal, 'id' | 'name' | 'icon' | 'goal_type'>
}

export type SavingsMovementInput = Pick<SavingsMovement, 'goal_id' | 'movement_type' | 'amount' | 'movement_date' | 'note'>

export interface CategoryTotal {
  id: string
  name: string
  icon: string
  total: number
  count: number
}

export interface Summary {
  total: number
  count: number
  today_total: number
  today_count: number
  categories: CategoryTotal[]
}

export interface FinanceSummary {
  expense_total: number
  expense_count: number
  income_total: number
  income_count: number
  today_expense: number
  today_income: number
  savings_deposit: number
  savings_withdrawal: number
  expense_categories: CategoryTotal[]
  income_categories: CategoryTotal[]
}

export interface Filters {
  start?: string
  end?: string
  category?: string
  search?: string
  type?: 'all' | TransactionType
}

export type Page = 'dashboard' | 'history' | 'plan' | 'savings' | 'statistics' | 'settings'
