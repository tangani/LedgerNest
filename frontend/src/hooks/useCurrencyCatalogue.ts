import { useEffect, useState } from 'react'
import { CURRENCY_SNAPSHOT, parseCatalogue } from '../lib/currencyCatalogue'
import type { CurrencyOption } from '../lib/currencyCatalogue'
const key = 'ledgernest:currency-catalogue:v1'
let pending: Promise<CurrencyOption[]> | undefined
function saved(): CurrencyOption[] {
  try {
    const data = JSON.parse(localStorage.getItem(key) ?? 'null')
    if (data && Array.isArray(data.rows)) return parseCatalogue(data.rows)
  } catch { /* use shipped catalogue */ }
  return CURRENCY_SNAPSHOT
}
async function refresh(): Promise<CurrencyOption[]> {
  if (pending) return pending
  pending = (async () => {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), 12_000)
    try {
      const response = await fetch('https://api.frankfurter.dev/v2/currencies', {
        credentials: 'omit', referrerPolicy: 'no-referrer', signal: controller.signal,
      })
      if (!response.ok) throw new Error('Currency list unavailable.')
      const raw: unknown = await response.json()
      const options = parseCatalogue(raw)
      try { localStorage.setItem(key, JSON.stringify({ rows: raw })) } catch { /* in-memory only */ }
      return options
    } finally { clearTimeout(timer) }
  })()
  try { return await pending } finally { pending = undefined }
}
export function useCurrencyCatalogue() {
  const [currencies, setCurrencies] = useState(saved)
  useEffect(() => {
    let active = true
    void refresh().then(list => { if (active) setCurrencies(list) }).catch(() => {})
    return () => { active = false }
  }, [])
  return currencies
}
