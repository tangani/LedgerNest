import { useCallback, useEffect, useRef, useState } from 'react'
import { asExchangeRate, fetchDisplayRates, freshObservation, readDisplayCache, validObservation } from '../services/displayRates'
import type { DisplayObservation } from '../services/displayRates'

export function useExchangeRate(target = 'ZAR') {
  const [observation, setObservation] = useState<DisplayObservation>(() => readDisplayCache(target))
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const request = useRef<AbortController | null>(null)
  const refresh = useCallback(async (force = false) => {
    if (request.current) return
    const cached = readDisplayCache(target)
    if (!force && freshObservation(cached)) { setObservation(cached); setLoading(false); setError(''); return }
    const controller = new AbortController()
    request.current = controller
    const timeout = setTimeout(() => controller.abort(), 12_000)
    setLoading(true); setError(''); setObservation(cached)
    try {
      const result = await fetchDisplayRates(target, controller.signal)
      if (request.current === controller) {
        setObservation(result)
        if (['USD', 'ZAR'].some(base => base !== target &&
            (!result.quotes[base as 'USD' | 'ZAR'] || result.quotes[base as 'USD' | 'ZAR']?.cached))) {
          setError('Some rates could not be refreshed. Cached rates show their dates; missing conversions remain unavailable.')
        }
      }
    } catch {
      if (request.current === controller) {
        setObservation(validObservation(cached))
        setError('Rates could not be refreshed. Original amounts remain available.')
      }
    } finally {
      clearTimeout(timeout)
      if (request.current === controller) { request.current = null; setLoading(false) }
    }
  }, [target])
  useEffect(() => {
    void refresh()
    const check = () => { void refresh() }
    const interval = setInterval(check, 60 * 60 * 1000)
    window.addEventListener('focus', check); window.addEventListener('online', check)
    return () => {
      clearInterval(interval)
      window.removeEventListener('focus', check); window.removeEventListener('online', check)
      const controller = request.current; request.current = null; controller?.abort()
    }
  }, [refresh])
  // A currency switch must never reuse a previous target's rates, even for one render.
  const usable = observation.target === target ? validObservation(observation) : { target, quotes: {} }
  return { rate: asExchangeRate(usable), observation: usable, loading, error, refresh }
}
