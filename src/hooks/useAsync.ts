import { useEffect, useRef, useState, type DependencyList } from 'react'
import { errorMessage } from '../utils/format'
export function useAsync<T>(loader: () => Promise<T>, dependencies: DependencyList) {
  const [data, setData] = useState<T | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [attempt, setAttempt] = useState(0)
  const ref = useRef(loader); ref.current = loader
  useEffect(() => {
    let active = true
    setLoading(true); setError(null)
    ref.current().then(result => { if (active) setData(result) }).catch(error => { if (active) setError(errorMessage(error)) })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [...dependencies, attempt])
  return { data, loading, error, retry: () => setAttempt(value => value + 1) }
}
