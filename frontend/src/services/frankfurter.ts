import { RATE_SCALE } from '../lib/currency'
import type { ExchangeRate } from '../models/ledger'

export type RateObservation = { date: string; base: 'USD'; quote: 'ZAR'; rate: number; fetchedAt: number }
export const RATE_CACHE_KEY = 'ledgernest:frankfurter:usd-zar:v1'
const DAY = 86_400_000
export const REFRESH_AFTER = 6 * 60 * 60 * 1000
const MAX_AGE = 7 * DAY
export function parseObservation(value: unknown, fetchedAt: number, now = Date.now()): RateObservation {
  if (!value || typeof value !== 'object') throw new Error('Invalid exchange-rate response.')
  const row = value as Record<string, unknown>
  const date = typeof row.date === 'string' ? row.date : ''
  const timestamp = Date.parse(`${date}T00:00:00Z`)
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !Number.isFinite(timestamp) ||
      new Date(timestamp).toISOString().slice(0, 10) !== date ||
      date > new Date(now).toISOString().slice(0, 10) ||
      now - timestamp > MAX_AGE || row.base !== 'USD' || row.quote !== 'ZAR' ||
      typeof row.rate !== 'number' || !Number.isFinite(row.rate) || row.rate <= 0 || row.rate > 1000 ||
      !Number.isFinite(fetchedAt) || fetchedAt > now || now - fetchedAt > MAX_AGE) {
    throw new Error('A recent USD/ZAR exchange rate is unavailable.')
  }
  const micros = Math.round(row.rate * RATE_SCALE)
  if (!Number.isSafeInteger(micros) || micros <= 0) throw new Error('Invalid exchange rate.')
  return { date, base: 'USD', quote: 'ZAR', rate: row.rate, fetchedAt }
}
export function readCachedRate(now = Date.now()): RateObservation | undefined {
  try {
    const value = JSON.parse(localStorage.getItem(RATE_CACHE_KEY) ?? 'null') as unknown
    const fetchedAt = value && typeof value === 'object' ? (value as Record<string, unknown>).fetchedAt : undefined
    return parseObservation(value, typeof fetchedAt === 'number' ? fetchedAt : NaN, now)
  } catch { return undefined }
}
export function conversionRate(observation: RateObservation): ExchangeRate {
  return { zarPerUsdMicros: Math.round(observation.rate * RATE_SCALE), updatedAt: `${observation.date}T00:00:00Z` }
}
export async function fetchRate(signal?: AbortSignal): Promise<RateObservation> {
  // Public request: no account identifiers, phone numbers, or authorization headers.
  const response = await fetch('https://api.frankfurter.dev/v2/rate/USD/ZAR', {
    signal, credentials: 'omit', referrerPolicy: 'no-referrer', cache: 'no-cache',
  })
  if (!response.ok) throw new Error('Could not refresh exchange rates.')
  const now = Date.now()
  const observation = parseObservation(await response.json(), now, now)
  try { localStorage.setItem(RATE_CACHE_KEY, JSON.stringify(observation)) } catch { /* Rate still usable for this session. */ }
  return observation
}
