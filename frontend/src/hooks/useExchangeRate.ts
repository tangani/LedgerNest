import { useCallback, useEffect, useRef, useState } from 'react'
import { conversionRate, fetchRate, parseObservation, readCachedRate, REFRESH_AFTER } from '../services/frankfurter'
import type { RateObservation } from '../services/frankfurter'

export function useExchangeRate() {
  const [observation, setObservation] = useState<RateObservation | undefined>(() => readCachedRate())
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [cached, setCached] = useState(Boolean(observation))
  const request = useRef<AbortController | null>(null)
  const refresh = useCallback(async (force = false) => {
    if (request.current) return
    const existing = readCachedRate()
    if (!force && existing && Date.now() - existing.fetchedAt < REFRESH_AFTER) {
      setObservation(existing); setCached(true); return
    }
    const controller = new AbortController()
    request.current = controller
    const timeout = setTimeout(() => controller.abort(), 12_000)
    setLoading(true); setError('')
    try {
      const latest = await fetchRate(controller.signal)
      if (request.current === controller) { setObservation(latest); setCached(false) }
    } catch {
      if (request.current === controller) {
        setObservation(current => {
          if (!current) return undefined
          try { return parseObservation(current, current.fetchedAt) } catch { return undefined }
        })
        setCached(true)
        setError('Rates could not be refreshed. Any available cached rate is shown with its date.')
      }
    } finally {
      clearTimeout(timeout)
      if (request.current === controller) { request.current = null; setLoading(false) }
    }
  }, [])
  useEffect(() => {
    void refresh()
    const check = () => { void refresh() }
    const interval = setInterval(check, 60 * 60 * 1000)
    window.addEventListener('focus', check)
    window.addEventListener('online', check)
    return () => {
      clearInterval(interval)
      window.removeEventListener('focus', check); window.removeEventListener('online', check)
      const controller = request.current
      request.current = null
      controller?.abort()
    }
  }, [refresh])
  let usable: RateObservation | undefined
  try { if (observation) usable = parseObservation(observation, observation.fetchedAt) } catch { /* expired */ }
  return { rate: usable ? conversionRate(usable) : undefined, observation: usable, loading, error, cached, refresh }
}
