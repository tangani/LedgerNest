import type { useExchangeRate } from '../hooks/useExchangeRate'
import type { Currency } from '../models/ledger'
export function ExchangeRateStatus({ fx, currency }: { fx: ReturnType<typeof useExchangeRate>; currency: string }) {
  const sources: Currency[] = ['USD', 'ZAR']
  const rows = sources.filter(base => base !== currency && fx.observation.quotes[base])
  return <div className="rate-bar">
    <div aria-live="polite">
      {rows.map(base => {
        const quote = fx.observation.quotes[base]!
        return <p key={base}>1 {base} = {quote.rate.toLocaleString(undefined, { maximumSignificantDigits: 8 })} {currency} · Rate dated {quote.date}{quote.cached ? ' · Cached' : ''}</p>
      })}
      {!rows.length && <p>{fx.loading ? 'Loading exchange rates…' : 'Conversion rates unavailable.'}</p>}
      <p className="conversion-note">Estimated totals in {currency} · Frankfurter. Original amounts and currencies are preserved.</p>
      {fx.error && <p className="form-help">{fx.error}</p>}
    </div>
    <button type="button" className="secondary" disabled={fx.loading} onClick={() => { void fx.refresh(true) }}>{fx.loading ? 'Refreshing…' : 'Refresh rates'}</button>
  </div>
}
