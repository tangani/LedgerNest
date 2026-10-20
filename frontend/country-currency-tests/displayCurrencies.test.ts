import { beforeEach, describe, expect, it, vi } from 'vitest'
import { CURRENCY_SNAPSHOT, minorDigits, parseCatalogue } from '../src/lib/currencyCatalogue'
import { convert, convertedTotal } from '../src/lib/currency'
import { money } from '../src/lib/formatters'
import { decimalRatio } from '../src/lib/displayConversion'
import { asExchangeRate, fetchDisplayRates, parseQuote, readDisplayCache } from '../src/services/displayRates'
import { readPreferences, savePreferences } from '../src/lib/preferences'
import type { Currency } from '../src/models/ledger'
const now = Date.UTC(2026, 9, 20, 12)
let storage: Map<string, string>
function rate(target: string, usd: number, zar: number, date = '2026-10-20') {
  return asExchangeRate({ target, quotes: {
    USD: { rate: usd, date, fetchedAt: now, cached: false },
    ZAR: { rate: zar, date, fetchedAt: now, cached: false },
  } })
}
beforeEach(() => {
  vi.restoreAllMocks(); vi.unstubAllGlobals()
  vi.spyOn(Date, 'now').mockReturnValue(now)
  storage = new Map()
  vi.stubGlobal('localStorage', { getItem: (key: string) => storage.get(key) ?? null,
    setItem: (key: string, value: string) => { storage.set(key, value) } })
  vi.stubGlobal('window', new EventTarget())
})
describe('currency catalogue and preferences', () => {
  it('ships all current catalogue entries for offline selection', () => {
    expect(CURRENCY_SNAPSHOT.length).toBe(165)
    for (const code of ['USD', 'ZAR', 'EUR', 'GBP', 'JPY', 'BHD', 'ZWG']) expect(CURRENCY_SNAPSHOT.some(row => row.code === code)).toBe(true)
  })
  it('validates and deduplicates the live API catalogue', () => {
    expect(parseCatalogue([{ iso_code: 'USD', name: 'US dollar' }, { iso_code: 'ZAR', name: 'Rand' }, { iso_code: 'USD', name: 'Dollar' }])).toHaveLength(2)
    expect(() => parseCatalogue([{ iso_code: '../bad', name: 'Invalid' }])).toThrow()
  })
  it('persists a non-USD/ZAR preference independently per account', () => {
    savePreferences('a', { country: 'ZW', currency: 'JPY' })
    expect(readPreferences('a')).toEqual({ country: 'ZW', currency: 'JPY' })
    expect(readPreferences('b', 'ZW').currency).toBe('USD')
  })
  it.each([['JPY', 0], ['USD', 2], ['BHD', 3], ['CLF', 4]])('uses the proper minor units for %s', (code, digits) => expect(minorDigits(code as string)).toBe(digits))
})
describe('amounts and cross-currency display', () => {
  it('converts both record currencies to a third currency', () => {
    const fx = rate('EUR', 0.9, 0.05)
    expect(convert(10000, 'USD', 'EUR', fx)).toBe(9000)
    expect(convert(10000, 'ZAR', 'EUR', fx)).toBe(500)
    expect(convertedTotal([{ amount: 10000, currency: 'USD' }, { amount: 10000, currency: 'ZAR' }], 'EUR', fx)).toBe(9500)
  })
  it('handles zero-decimal JPY and formats the resulting minor units', () => {
    expect(convert(1000, 'USD', 'JPY', rate('JPY', 158.3, 9.64))).toBe(1583)
    expect(money(1583, 'JPY')).toContain('1')
    expect(money(1583, 'JPY')).not.toContain(',00')
  })
  it('preserves three-decimal BHD amounts', () => {
    expect(convert(100, 'USD', 'BHD', rate('BHD', 0.376, 0.0229))).toBe(376)
    expect(money(376, 'BHD')).toMatch(/0[,.]376/)
  })
  it('supports very small rates and symmetric rounding', () => {
    expect(decimalRatio(1e-8)).toEqual({ numerator: 1n, denominator: 100000000n })
    const fx = rate('JPY', 1, 1)
    expect(convert(50, 'USD', 'JPY', fx)).toBe(1)
    expect(convert(-50, 'USD', 'JPY', fx)).toBe(-1)
  })
  it('never applies a previous target rate or an expired observation', () => {
    expect(convert(100, 'USD', 'EUR', rate('JPY', 158, 9))).toBeNull()
    expect(convert(100, 'USD', 'EUR', rate('EUR', .9, .05, '2026-10-01'))).toBeNull()
  })
  it('rejects unsafe outputs and leaves same-currency amounts unchanged', () => {
    expect(convert(Number.MAX_SAFE_INTEGER, 'USD', 'JPY', rate('JPY', 1e12, 1))).toBeNull()
    expect(convert(12345, 'USD', 'USD')).toBe(12345)
    expect(convert(12345, 'USD', 'EUR')).toBeNull()
    expect(convert(12345, 'USD', 'EUR', { zarPerUsdMicros: 16419000, updatedAt: '2026-10-20' })).toBeNull()
  })
})
describe('provider errors and cache isolation', () => {
  it.each([0, NaN, Infinity, -2])('rejects invalid provider rate %s', value => {
    expect(() => parseQuote({ base: 'USD', quote: 'EUR', date: '2026-10-20', rate: value }, 'USD', 'EUR', now, now)).toThrow()
  })
  it('fetches direct rates for each stored currency and caches by target', async () => {
    const fetchMock = vi.fn().mockImplementation(async (url: string) => {
      const base = url.includes('/USD/') ? 'USD' : 'ZAR'
      return { ok: true, json: async () => ({ base, quote: 'EUR', date: '2026-10-20', rate: base === 'USD' ? .9 : .05 }) }
    })
    vi.stubGlobal('fetch', fetchMock)
    const result = await fetchDisplayRates('EUR')
    expect(result.quotes.USD?.rate).toBe(.9)
    expect(result.quotes.ZAR?.rate).toBe(.05)
    expect(readDisplayCache('JPY', now).quotes).toEqual({})
    expect(readDisplayCache('EUR', now).quotes.USD?.cached).toBe(true)
    expect(fetchMock.mock.calls[0][1].credentials).toBe('omit')
  })
  it('retains valid cached quotes on outage, without inventing missing rates', async () => {
    const cached = { target: 'EUR', quotes: { USD: { rate: .9, date: '2026-10-20', fetchedAt: now } } }
    storage.set('ledgernest:display-rates:v1:EUR', JSON.stringify(cached))
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline')))
    const result = await fetchDisplayRates('EUR')
    expect(convert(100, 'USD', 'EUR', asExchangeRate(result))).toBe(90)
    expect(convert(100, 'ZAR', 'EUR', asExchangeRate(result))).toBeNull()
  })
  it('does not request an identity conversion', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ base: 'ZAR', quote: 'USD', date: '2026-10-20', rate: .06 }) })
    vi.stubGlobal('fetch', fetchMock)
    await fetchDisplayRates('USD')
    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(fetchMock.mock.calls[0][0]).toContain('/ZAR/USD')
  })
  it('validates request currency and provider response pair', async () => {
    expect(() => parseQuote({ base: 'USD', quote: 'JPY', date: '2026-10-20', rate: 2 }, 'USD', 'EUR', now, now)).toThrow()
    await expect(fetchDisplayRates('../../secret')).rejects.toThrow()
    expect(readDisplayCache('EUR', now).quotes['USD' as Currency]).toBeUndefined()
  })
})
