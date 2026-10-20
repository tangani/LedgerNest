import { beforeEach, describe, expect, it, vi } from 'vitest'
import { canonicalPhone } from '../src/lib/countries'
import { defaultCurrency, readPreferences, savePreferences } from '../src/lib/preferences'
import { parseObservation, conversionRate, readCachedRate, RATE_CACHE_KEY, fetchRate } from '../src/services/frankfurter'
import { convert } from '../src/lib/currency'

const now = Date.UTC(2026, 9, 20, 12)
const observation = { date: '2026-10-20', base: 'USD', quote: 'ZAR', rate: 16.419 }
let storage: Map<string, string>
beforeEach(() => {
  vi.useRealTimers(); vi.unstubAllGlobals()
  storage = new Map()
  vi.stubGlobal('localStorage', { getItem: (key: string) => storage.get(key) ?? null,
    setItem: (key: string, value: string) => { storage.set(key, value) } })
  vi.stubGlobal('window', new EventTarget())
})
describe('international phone input', () => {
  it('converts a South African national number', () => expect(canonicalPhone('082 123 4567', 'ZA')).toBe('+27821234567'))
  it('converts a Zimbabwean national number', () => expect(canonicalPhone('0772 123 456', 'ZW')).toBe('+263772123456'))
  it('honours explicit international input over the country suggestion', () => expect(canonicalPhone('+44 20 7946 0018', 'ZA')).toBe('+442079460018'))
  it.each(['abc@example.com', 'molisa', '123', '+27', '0821234567 ext 12'])('rejects invalid number %s', raw => expect(() => canonicalPhone(raw, 'ZA')).toThrow())
})
describe('per-account preferences', () => {
  it('uses USD for Zimbabwe and ZAR for South Africa', () => {
    expect(defaultCurrency('ZW')).toBe('USD'); expect(defaultCurrency('ZA')).toBe('ZAR')
  })
  it('does not persist a suggested country as confirmed residence', () => expect(readPreferences('a', 'ZW')).toEqual({ country: '', currency: 'USD' }))
  it('isolates users and persists an explicit currency override', () => {
    savePreferences('a', { country: 'ZW', currency: 'ZAR' })
    expect(readPreferences('a').currency).toBe('ZAR')
    expect(readPreferences('b', 'ZW').currency).toBe('USD')
  })
  it('handles blocked storage reads and reports failed writes', () => {
    vi.stubGlobal('localStorage', { getItem: () => { throw new Error('blocked') }, setItem: () => { throw new Error('blocked') } })
    expect(readPreferences('a', 'ZW').currency).toBe('USD')
    expect(() => savePreferences('a', { country: 'ZW', currency: 'USD' })).toThrow('Could not save')
  })
})
describe('exchange rate validation and conversion', () => {
  it('converts cents in both directions without changing original amounts', () => {
    const rate = conversionRate(parseObservation(observation, now, now))
    expect(convert(10000, 'USD', 'ZAR', rate)).toBe(164190)
    expect(convert(164190, 'ZAR', 'USD', rate)).toBe(10000)
  })
  it.each([
    { ...observation, rate: 0 }, { ...observation, rate: NaN }, { ...observation, rate: Infinity },
    { ...observation, quote: 'EUR' }, { ...observation, base: 'ZAR' },
    { ...observation, date: '2026-10-21' }, { ...observation, date: '2026-10-01' },
    { ...observation, date: '2026-02-30' },
  ])('rejects invalid or expired observations %#', value => expect(() => parseObservation(value, now, now)).toThrow())
  it('rejects a cache with a future retrieval timestamp', () => expect(() => parseObservation(observation, now + 1, now)).toThrow())
  it('ignores corrupt cache and preserves same-currency totals without a rate', () => {
    storage.set(RATE_CACHE_KEY, '{broken')
    expect(readCachedRate(now)).toBeUndefined()
    expect(convert(1234, 'USD', 'USD')).toBe(1234)
    expect(convert(1234, 'USD', 'ZAR')).toBeNull()
  })
  it('fetches anonymously and caches the provider date', async () => {
    vi.spyOn(Date, 'now').mockReturnValue(now)
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => observation })
    vi.stubGlobal('fetch', fetchMock)
    try {
      const result = await fetchRate()
      expect(result.date).toBe('2026-10-20')
      expect(readCachedRate(now)?.rate).toBe(16.419)
      expect(fetchMock.mock.calls[0][1].credentials).toBe('omit')
      expect(fetchMock.mock.calls[0][1].headers).toBeUndefined()
    } finally { vi.restoreAllMocks() }
  })
  it('does not overwrite usable cache on HTTP failure', async () => {
    const cached = { ...observation, fetchedAt: now }
    storage.set(RATE_CACHE_KEY, JSON.stringify(cached))
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 503 }))
    await expect(fetchRate()).rejects.toThrow()
    expect(storage.get(RATE_CACHE_KEY)).toBe(JSON.stringify(cached))
  })
})
