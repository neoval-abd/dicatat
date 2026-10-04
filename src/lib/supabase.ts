import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL?.trim()
const key = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim()

function isPublicKey(value: string): boolean {
  if (value.startsWith('sb_publishable_')) return true
  try {
    const part = value.split('.')[1]
    const payload = JSON.parse(atob(part.replace(/-/g, '+').replace(/_/g, '/')))
    return payload.role === 'anon'
  } catch { return false }
}

function isProjectUrl(value: string): boolean {
  try { const parsed = new URL(value); return ['http:', 'https:'].includes(parsed.protocol) && Boolean(parsed.hostname) && !parsed.hostname.includes('your-project') }
  catch { return false }
}
export const isConfigured = Boolean(url && isProjectUrl(url) && key && isPublicKey(key))
export const supabase = isConfigured ? createClient(url!, key!, {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
}) : null

export function db() {
  if (!supabase) throw new Error('Supabase belum dikonfigurasi. Isi file .env.local lalu jalankan ulang aplikasi.')
  return supabase
}
