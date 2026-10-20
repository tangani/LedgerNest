import { minorDigits } from './currencyCatalogue'
import type { Currency, ExchangeRate } from '../models/ledger'

// Preserve the decimal rate returned by the API, including exponential notation.
export function decimalRatio(value: number): { numerator: bigint; denominator: bigint } | null {
  if (!Number.isFinite(value) || value <= 0 || value > 1e12 || value < 1e-12) return null
  const match = /^(\d+)(?:\.(\d+))?(?:e([+-]?\d+))?$/i.exec(String(value))
  if (!match) return null
  const fraction = match[2] ?? ''
  const shift = Number(match[3] ?? 0) - fraction.length
  const digits = BigInt(match[1] + fraction)
  return shift >= 0
    ? { numerator: digits * 10n ** BigInt(shift), denominator: 1n }
    : { numerator: digits, denominator: 10n ** BigInt(-shift) }
}
export function convertDisplay(amount: number, from: Currency, to: string, rate?: ExchangeRate): number | null {
  if (!Number.isSafeInteger(amount)) return null
  if (from === to || amount === 0) return amount
  const table = rate?.display
  const quote = table?.quotes[from]
  if (!table || table.target !== to || !quote) return null
  const date = Date.parse(`${quote.date}T00:00:00Z`)
  const now = Date.now()
  if (!Number.isFinite(date) || date > now || now - date > 7 * 86_400_000) return null
  const ratio = decimalRatio(quote.rate)
  if (!ratio) return null
  let digits: number
  try { digits = minorDigits(to) } catch { return null }
  const sign = amount < 0 ? -1n : 1n
  const numerator = BigInt(Math.abs(amount)) * ratio.numerator * 10n ** BigInt(digits)
  // Original stored USD and ZAR amounts always use two decimal places.
  const denominator = 100n * ratio.denominator
  const result = Number(sign * ((numerator + denominator / 2n) / denominator))
  return Number.isSafeInteger(result) ? result : null
}
