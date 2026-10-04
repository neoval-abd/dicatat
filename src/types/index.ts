export interface Profile { id: string; name: string; created_at: string }
export interface Category { id: string; user_id: string; name: string; icon: string; created_at: string }
export interface Transaction {
  id: string; user_id: string; category_id: string; amount: number;
  transaction_date: string; transaction_time: string; note: string | null;
  receipt_path: string | null; created_at: string; updated_at: string;
  category: Pick<Category, 'id' | 'name' | 'icon'>;
}
export type TransactionInput = Pick<Transaction, 'amount' | 'category_id' | 'transaction_date' | 'transaction_time' | 'note' | 'receipt_path'>
export interface Budget { id: string; user_id: string; month: number; year: number; amount: number; created_at: string; updated_at: string }
export interface CategoryTotal { id: string; name: string; icon: string; total: number; count: number }
export interface Summary { total: number; count: number; today_total: number; today_count: number; categories: CategoryTotal[] }
export interface Filters { start?: string; end?: string; category?: string; search?: string }
export type Page = 'dashboard' | 'history' | 'statistics' | 'settings'
