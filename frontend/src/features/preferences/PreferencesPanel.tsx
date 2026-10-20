import { useState } from 'react'
import { countries, countryFromPhone } from '../../lib/countries'
import { defaultCurrency } from '../../lib/preferences'
import { usePreferences } from '../../hooks/usePreferences'
import type { Currency } from '../../models/ledger'

export function PreferencesPanel({ userId, username }: { userId: string; username: string }) {
  const { preferences, update } = usePreferences(userId, countryFromPhone(username))
  const [error, setError] = useState('')
  function change(country: string, currency: Currency) {
    try { update({ country, currency }); setError('') }
    catch (problem) { setError(problem instanceof Error ? problem.message : 'Could not save preferences.') }
  }
  return <section className="account-preferences" aria-labelledby="preferences-heading">
    <h3 id="preferences-heading">Country and currency</h3>
    <label>Country of residence
      <select value={preferences.country} onChange={event => change(event.target.value, defaultCurrency(event.target.value))}>
        <option value="" disabled>Select country</option>
        {countries.map(item => <option key={item.code} value={item.code}>{item.name}</option>)}
      </select>
    </label>
    <label>Preferred display currency
      <select value={preferences.currency} onChange={event => change(preferences.country, event.target.value as Currency)}>
        <option value="USD">USD · US dollar</option><option value="ZAR">ZAR · South African rand</option>
      </select>
    </label>
    <p className="form-help">Saved on this device. Changing country suggests a currency; you can choose another. Original record currencies stay the same.</p>
    {error && <p role="alert" className="form-error">{error}</p>}
  </section>
}
