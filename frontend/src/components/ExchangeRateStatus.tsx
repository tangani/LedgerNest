import type { Currency } from '../models/ledger'
import type { useExchangeRate } from '../hooks/useExchangeRate'
export function ExchangeRateStatus({ fx, currency }: { fx: ReturnType<typeof useExchangeRate>; currency: Currency }) {
  return <div className="rate-bar">
    <div aria-live="polite">
      <p>{fx.observation
        ? `1 USD = ${fx.observation.rate.toLocaleString(undefined, { maximumFractionDigits: 6 })} ZAR · Rate dated ${fx.observation.date} · Frankfurter${fx.cached ? ' · Cached' : ''}`
        : fx.loading ? 'Loading exchange rates…' : 'Exchange rate unavailable. Combined totals requiring conversion are unavailable.'}</p>
      <p className="conversion-note">Estimated totals in {currency}. Original amounts and currencies are preserved.</p>
      {fx.error && <p className="form-help">{fx.error}</p>}
    </div>
    <button type="button" className="secondary" disabled={fx.loading} onClick={() => { void fx.refresh(true) }}>
      {fx.loading ? 'Refreshing…' : 'Refresh rate'}
    </button>
  </div>
}
