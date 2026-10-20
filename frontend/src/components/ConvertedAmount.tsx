import type { Currency, ExchangeRate } from '../models/ledger'
import { convert } from '../lib/currency'
import { money } from '../lib/formatters'
export function ConvertedAmount({ amount, from, to, rate }: { amount: number; from: Currency; to: string; rate?: ExchangeRate }) {
  if (from === to) return null
  const converted = convert(amount, from, to, rate)
  return <span className="conversion-note">{converted === null ? 'Conversion unavailable' : `≈ ${money(converted, to)}`}</span>
}
