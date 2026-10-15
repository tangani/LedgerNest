import type { Currency, ExchangeRate } from '../models/ledger'
export const RATE_SCALE = 1_000_000
export function parseRate(input: string): number | null {
  const value = input.trim()
  if (!/^\d{1,4}(\.\d{1,6})?$/.test(value)) return null
  const [whole, fraction = ''] = value.split('.')
  const scaled = Number(whole) * RATE_SCALE + Number(fraction.padEnd(6, '0'))
  return scaled > 0 && scaled <= 1000 * RATE_SCALE ? scaled : null
}
// Display conversion only. Original stored amounts and repayment currency never change.
export function convert(cents: number, from: Currency, to: Currency, rate?: ExchangeRate): number | null {
  if (from === to || cents === 0) return cents
  if (!rate || rate.zarPerUsdMicros <= 0) return null
  const numerator = BigInt(cents) * BigInt(from === 'USD' ? rate.zarPerUsdMicros : RATE_SCALE)
  const denominator = BigInt(from === 'USD' ? RATE_SCALE : rate.zarPerUsdMicros)
  const rounded = Number((numerator + denominator / 2n) / denominator)
  return Number.isSafeInteger(rounded) ? rounded : null
}
export function convertedTotal(items: { amount: number; currency: Currency }[], to: Currency, rate?: ExchangeRate): number | null {
  let total = 0
  for (const item of items) {
    const result = convert(item.amount, item.currency, to, rate)
    if (result === null) return null
    total += result
    if (!Number.isSafeInteger(total)) return null
  }
  return total
}
