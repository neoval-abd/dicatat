import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
export type Theme = 'light' | 'dark' | 'system'
const ThemeContext = createContext<{ theme: Theme; setTheme: (value: Theme) => void }>({ theme: 'system', setTheme: () => {} })
export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<Theme>(() => {
    try { const value = localStorage.getItem('dicatat:theme'); return value === 'light' || value === 'dark' ? value : 'system' } catch { return 'system' }
  })
  useEffect(() => {
    const media = matchMedia('(prefers-color-scheme: dark)')
    const apply = () => { const dark = theme === 'dark' || (theme === 'system' && media.matches); document.documentElement.classList.toggle('dark', dark); document.documentElement.style.colorScheme = dark ? 'dark' : 'light' }
    apply(); media.addEventListener('change', apply)
    try { localStorage.setItem('dicatat:theme', theme) } catch { /* Optional preference storage. */ }
    return () => media.removeEventListener('change', apply)
  }, [theme])
  return <ThemeContext.Provider value={{ theme, setTheme }}>{children}</ThemeContext.Provider>
}
export const useTheme = () => useContext(ThemeContext)
