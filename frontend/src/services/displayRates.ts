import { isCurrencyCode } from '../lib/currencyCatalogue'
import { decimalRatio } from '../lib/displayConversion'
import type { Currency, ExchangeRate } from '../models/ledger'
export type DisplayQuote = { rate: number; date: string; fetchedAt: number; cached: boolean }
export type DisplayObservation = { target: string; quotes: Partial<Record<Currency, DisplayQuote>> }
export const REFRESH_AFTER = 6 * 60 * 60 * 1000
const MAX_AGE = 7 * 86_400_000
const sources: Currency[] = ['USD', 'ZAR']
function cacheKey(target: string) { return `ledgernest:display-rates:v1:${target}` }
export function parseQuote(raw: unknown, base: Currency, target: string, fetchedAt: number, now = Date.now()): DisplayQuote {
  if (!raw || typeof raw !== 'object' || !isCurrencyCode(target)) throw new Error('Invalid rate response.')
  const row = raw as Record<string, unknown>
  const date = typeof row.date === 'string' ? row.date : ''
  const timestamp = Date.parse(`${date}T00:00:00Z`)
  if (row.base !== base || row.quote !== target || !/^\d{4}-\d{2}-\d{2}$/.test(date) ||
      !Number.isFinite(timestamp) || new Date(timestamp).toISOString().slice(0, 10) !== date ||
      timestamp > now || now - timestamp > MAX_AGE || !Number.isFinite(fetchedAt) ||
      fetchedAt > now || now - fetchedAt > MAX_AGE || typeof row.rate !== 'number' || !decimalRatio(row.rate)) {
    throw new Error('A recent exchange rate is unavailable.')
  }
  return { rate: row.rate, date, fetchedAt, cached: false }
}
export function readDisplayCache(target: string, now = Date.now()): DisplayObservation {
  const result: DisplayObservation = { target, quotes: {} }
  try {
    const stored = JSON.parse(localStorage.getItem(cacheKey(target)) ?? 'null')
    if (stored?.target !== target) return result
    for (const base of sources) {
      const row = stored.quotes?.[base]
      try {
        result.quotes[base] = { ...parseQuote({ ...row, base, quote: target }, base, target, row?.fetchedAt, now), cached: true }
      } catch { /* corrupt or expired individual row */ }
    }
  } catch { /* unavailable storage */ }
  return result
}
export function validObservation(observation: DisplayObservation, now = Date.now()): DisplayObservation {
  const result: DisplayObservation = { target: observation.target, quotes: {} }
  for (const base of sources) {
    const quote = observation.quotes[base]
    if (!quote) continue
    try { result.quotes[base] = { ...parseQuote({ ...quote, base, quote: observation.target }, base, observation.target, quote.fetchedAt, now), cached: quote.cached } } catch { /* expired */ }
  }
  return result
}
export function freshObservation(observation: DisplayObservation, now = Date.now()): boolean {
  return sources.every(base => base === observation.target ||
    (observation.quotes[base] && now - observation.quotes[base]!.fetchedAt < REFRESH_AFTER))
}
export async function fetchDisplayRates(target: string, signal?: AbortSignal): Promise<DisplayObservation> {
  if (!isCurrencyCode(target)) throw new Error('Invalid currency code.')
  const result = readDisplayCache(target)
  const outcomes = await Promise.allSettled(sources.filter(base => base !== target).map(async base => {
    const response = await fetch(`https://api.frankfurter.dev/v2/rate/${base}/${target}`, {
      signal, credentials: 'omit', referrerPolicy: 'no-referrer', cache: 'no-cache',
    })
    if (!response.ok) throw new Error('Rate unavailable.')
    const now = Date.now()
    return { base, quote: parseQuote(await response.json(), base, target, now, now) }
  }))
  for (const outcome of outcomes) {
    if (outcome.status === 'fulfilled') result.quotes[outcome.value.base] = outcome.value.quote
  }
  const usable = validObservation(result)
  if (Object.keys(usable.quotes).length === 0) throw new Error('No usable exchange rates are available.')
  try { localStorage.setItem(cacheKey(target), JSON.stringify(usable)) } catch { /* session-only rates */ }
  return usable
}
export function asExchangeRate(observation: DisplayObservation): ExchangeRate {
  const dates = Object.values(observation.quotes).map(quote => quote.date).sort()
  return { zarPerUsdMicros: 0, updatedAt: `${dates[0] ?? new Date().toISOString().slice(0, 10)}T00:00:00Z`, display: observation }
}
