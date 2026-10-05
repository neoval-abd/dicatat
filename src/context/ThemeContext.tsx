import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
export type Theme = 'light' | 'dark' | 'pink'
const ThemeContext = createContext<{ theme: Theme; setTheme: (value: Theme) => void }>({ theme: 'light', setTheme: () => {} })
export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<Theme>(() => {
    try {
      const value = localStorage.getItem('dicatat:theme')
      if (value === 'light' || value === 'dark' || value === 'pink') return value
      // Preserve the appearance of the retired system preference on upgrade.
      if (value === 'system') return matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
      return 'light'
    } catch { return 'light' }
  })
  useEffect(() => {
    const root = document.documentElement
    root.classList.toggle('dark', theme === 'dark')
    root.classList.toggle('pink', theme === 'pink')
    root.style.colorScheme = theme === 'dark' ? 'dark' : 'light'
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', theme === 'pink' ? '#b83270' : theme === 'dark' ? '#111c19' : '#087f72')
    try { localStorage.setItem('dicatat:theme', theme) } catch { /* Optional preference storage. */ }
  }, [theme])
  return <ThemeContext.Provider value={{ theme, setTheme }}>{children}</ThemeContext.Provider>
}
export const useTheme = () => useContext(ThemeContext)
