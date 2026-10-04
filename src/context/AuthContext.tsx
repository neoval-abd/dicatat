import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'
import { errorMessage } from '../utils/format'

const AuthContext = createContext<{ session: Session | null; loading: boolean; error: string | null }>({ session: null, loading: true, error: null })
export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(Boolean(supabase))
  const [error, setError] = useState<string | null>(null)
  useEffect(() => {
    if (!supabase) return
    let active = true
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, value) => {
      if (active) { setSession(value); setLoading(false); setError(null) }
    })
    supabase.auth.getSession().then(({ data, error }) => {
      if (active) { setSession(data.session); setError(error ? errorMessage(error) : null); setLoading(false) }
    }).catch(error => { if (active) { setError(errorMessage(error)); setLoading(false) } })
    return () => { active = false; subscription.unsubscribe() }
  }, [])
  return <AuthContext.Provider value={{ session, loading, error }}>{children}</AuthContext.Provider>
}
export const useAuth = () => useContext(AuthContext)
