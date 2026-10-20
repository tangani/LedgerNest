import { countries } from '../lib/countries'
import type { CountryCode } from '../lib/countries'

type Props = {
  country: CountryCode
  onCountryChange: (country: CountryCode) => void
}
export function PhoneInput({ country, onCountryChange }: Props) {
  return <div className="phone-input">
    <label htmlFor="phone-country">Phone country
      <select id="phone-country" value={country} onChange={event => onCountryChange(event.target.value as CountryCode)}>
        {countries.map(item => <option key={item.code} value={item.code}>{item.name} (+{item.callingCode})</option>)}
      </select>
    </label>
    <label htmlFor="national-phone">Phone number
      <input id="national-phone" name="nationalPhone" type="tel" inputMode="tel"
        autoComplete="tel" maxLength={40} required aria-describedby="phone-help" />
    </label>
    <p id="phone-help" className="form-help">Enter your local number, or paste a full international number starting with +.</p>
  </div>
}
