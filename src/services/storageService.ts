import { db } from '../lib/supabase'
import { compressImage } from '../utils/image'

export async function uploadReceipt(userId: string, date: string, file: File) {
  const blob = await compressImage(file)
  const [year, month] = date.split('-')
  const path = `${userId}/${year}/${month}/${crypto.randomUUID()}.jpg`
  const { error } = await db().storage.from('receipts').upload(path, blob, { contentType: 'image/jpeg', upsert: false, cacheControl: '300' })
  if (error) throw new Error('Gagal mengupload foto nota. Periksa koneksi dan konfigurasi Storage.')
  return path
}
export async function receiptUrl(path: string) {
  const { data, error } = await db().storage.from('receipts').createSignedUrl(path, 300)
  if (error) throw new Error('Foto nota tidak dapat dimuat. Coba lagi.')
  return data.signedUrl
}
const queueKey = (userId: string) => `dicatat:receipt-cleanup:${userId}`
export function pendingReceipts(userId: string): string[] {
  try {
    const stored = JSON.parse(localStorage.getItem(queueKey(userId)) || '[]')
    return Array.isArray(stored) ? stored.filter(p => typeof p === 'string' && p.startsWith(`${userId}/`)) : []
  } catch { return [] }
}
function storeQueue(userId: string, paths: string[]) {
  try { localStorage.setItem(queueKey(userId), JSON.stringify([...new Set(paths)])) } catch { /* Browser may disable local storage. */ }
}
export async function cleanReceipt(userId: string, path: string): Promise<boolean> {
  if (!path.startsWith(`${userId}/`)) throw new Error('Akses foto ditolak.')
  // Check references before deletion, including retries after a previous network failure.
  try {
    const { count, error: queryError } = await db().from('transactions').select('id', { count: 'exact', head: true }).eq('user_id', userId).eq('receipt_path', path)
    if (queryError) throw queryError
    if (count) { storeQueue(userId, pendingReceipts(userId).filter(p => p !== path)); return true }
    const { error } = await db().storage.from('receipts').remove([path])
    if (error) throw error
    storeQueue(userId, pendingReceipts(userId).filter(p => p !== path))
    return true
  } catch {
    storeQueue(userId, [...pendingReceipts(userId), path])
    return false
  }
}
export async function retryReceiptCleanup(userId: string) {
  for (const path of pendingReceipts(userId)) await cleanReceipt(userId, path)
  return pendingReceipts(userId).length
}
