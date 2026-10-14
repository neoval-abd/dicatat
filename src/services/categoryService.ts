import { db } from '../lib/supabase'
import type { Category, TransactionType } from '../types'

export async function getCategories(userId: string, type?: TransactionType): Promise<Category[]> {
  let query = db().from('categories').select('*').eq('user_id', userId)
  if (type) query = query.eq('type', type)
  const { data, error } = await query.order('created_at').order('name')
  if (error) throw error
  return (data || []).map(cat => ({ ...cat, type: cat.type || 'expense' }))
}

export async function saveCategory(userId: string, name: string, icon: string, type: TransactionType = 'expense', id?: string) {
  if (!name.trim() || name.trim().length > 60) throw new Error('Nama kategori wajib diisi, maksimal 60 karakter.')
  const payload = { user_id: userId, name: name.trim(), icon, type }
  const query = id
    ? db().from('categories').update({ name: name.trim(), icon, type }).eq('id', id).eq('user_id', userId)
    : db().from('categories').insert(payload)
  const { error } = await query.select().single()
  if (error) throw error
}

export async function deleteCategory(userId: string, id: string) {
  const { error } = await db().from('categories').delete().eq('id', id).eq('user_id', userId).select('id').single()
  if (error) throw error
}
