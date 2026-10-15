import type { Currency, ExchangeRate } from '../models/ledger'
import { convert } from '../lib/currency'
import { money } from '../lib/formatters'
export function ConvertedAmount({ amount, from, to, rate }: { amount: number; from: Currency; to: Currency; rate?: ExchangeRate }) {
  if (from === to) return null
  const converted = convert(amount, from, to, rate)
  return <span className="conversion-note">{converted === null ? 'Set an exchange rate to convert' : `≈ ${money(converted, to)}`}</span>
}
