import { useCallback, useEffect, useState } from 'react'
import { PREFERENCES_EVENT, readPreferences, savePreferences } from '../lib/preferences'
import type { UserPreferences } from '../lib/preferences'

export function usePreferences(userId: string, suggestedCountry = 'ZA') {
  const [preferences, setPreferences] = useState(() => readPreferences(userId, suggestedCountry))
  useEffect(() => {
    const refresh = () => setPreferences(readPreferences(userId, suggestedCountry))
    refresh()
    window.addEventListener(PREFERENCES_EVENT, refresh)
    window.addEventListener('storage', refresh)
    return () => { window.removeEventListener(PREFERENCES_EVENT, refresh); window.removeEventListener('storage', refresh) }
  }, [userId, suggestedCountry])
  const update = useCallback((next: UserPreferences) => {
    savePreferences(userId, next)
    setPreferences(next)
  }, [userId])
  return { preferences, update }
}
