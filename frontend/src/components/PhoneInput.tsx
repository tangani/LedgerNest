import { useId } from 'react'
import { countries } from '../lib/countries'
import type { CountryCode } from '../lib/countries'

type Props = {
  country: CountryCode
  onCountryChange: (country: CountryCode) => void
  compact?: boolean
}
export function PhoneInput({ country, onCountryChange, compact = false }: Props) {
  const id = useId()
  const countryId = `${id}-country`
  const phoneId = `${id}-phone`
  const helpId = `${id}-help`
  return <div className={`phone-input${compact ? ' phone-input--compact' : ''}`}>
    <label htmlFor={countryId}>{compact ? 'Code' : 'Phone country'}
      <select id={countryId} aria-label="Phone country" value={country} onChange={event => onCountryChange(event.target.value as CountryCode)}>
        {countries.map(item => <option key={item.code} value={item.code}>
          {compact ? `+${item.callingCode} · ${item.name}` : `${item.name} (+${item.callingCode})`}
        </option>)}
      </select>
    </label>
    <label htmlFor={phoneId}>Phone number
      <input id={phoneId} name="nationalPhone" type="tel" inputMode="tel"
        autoComplete="tel" maxLength={40} required aria-describedby={helpId} />
    </label>
    <p id={helpId} className="form-help">{compact ? 'Local or +international number.' : 'Enter your local number, or paste a full international number starting with +.'}</p>
  </div>
}
