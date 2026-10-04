import { db } from '../lib/supabase'
import type { Category } from '../types'

export async function getCategories(userId: string): Promise<Category[]> {
  const { data, error } = await db().from('categories').select('*').eq('user_id', userId).order('created_at').order('name')
  if (error) throw error
  return data || []
}
export async function saveCategory(userId: string, name: string, icon: string, id?: string) {
  if (!name.trim() || name.trim().length > 60) throw new Error('Nama kategori wajib diisi, maksimal 60 karakter.')
  const query = id ? db().from('categories').update({ name: name.trim(), icon }).eq('id', id).eq('user_id', userId)
    : db().from('categories').insert({ user_id: userId, name: name.trim(), icon })
  const { error } = await query.select().single()
  if (error) throw error
}
export async function deleteCategory(userId: string, id: string) {
  const { error } = await db().from('categories').delete().eq('id', id).eq('user_id', userId).select('id').single()
  if (error) throw error
}
