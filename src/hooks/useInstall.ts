import { useEffect, useState } from 'react'
interface InstallEvent extends Event { prompt(): Promise<void>; userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }> }
export function useInstall() {
  const [event, setEvent] = useState<InstallEvent | null>(null)
  const [standalone, setStandalone] = useState(matchMedia('(display-mode: standalone)').matches || Boolean((navigator as Navigator & { standalone?: boolean }).standalone))
  const [installed, setInstalled] = useState(standalone)
  const [installing, setInstalling] = useState(false)
  useEffect(() => {
    const media = matchMedia('(display-mode: standalone)')
    const modeChanged = () => {
      const active = media.matches || Boolean((navigator as Navigator & { standalone?: boolean }).standalone)
      setStandalone(active)
      if (active) setInstalled(true)
    }
    const before = (e: Event) => { e.preventDefault(); setEvent(e as InstallEvent) }
    const done = () => { setInstalled(true); setEvent(null) }
    media.addEventListener('change', modeChanged)
    window.addEventListener('beforeinstallprompt', before); window.addEventListener('appinstalled', done)
    return () => { media.removeEventListener('change', modeChanged); window.removeEventListener('beforeinstallprompt', before); window.removeEventListener('appinstalled', done) }
  }, [])
  return {
    available: Boolean(event) && !installed && !standalone && window.isSecureContext,
    installed, standalone, installing, secure: window.isSecureContext,
    install: async () => {
      if (!event || installing) return
      setInstalling(true)
      try { await event.prompt(); await event.userChoice }
      finally { setEvent(null); setInstalling(false) }
    },
  }
}
