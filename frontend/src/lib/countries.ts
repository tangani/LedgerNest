import { getCountries, getCountryCallingCode, parsePhoneNumberFromString } from 'libphonenumber-js/max'
import type { CountryCode } from 'libphonenumber-js'

export type { CountryCode }
const supported = new Set<string>(getCountries())
export function isCountry(value: unknown): value is CountryCode {
  return typeof value === 'string' && supported.has(value)
}
const names = new Intl.DisplayNames(['en'], { type: 'region' })
export const countries = getCountries()
  .map(code => ({ code, name: names.of(code) ?? code, callingCode: getCountryCallingCode(code) }))
  .sort((a, b) => a.name.localeCompare(b.name))

// A suggestion only. Never treat a phone country or locale as proof of residence.
export function suggestedCountry(): CountryCode {
  if (typeof navigator !== 'undefined') {
    for (const language of navigator.languages ?? [navigator.language]) {
      try { const region = new Intl.Locale(language).region; if (isCountry(region)) return region } catch { /* keep looking */ }
    }
  }
  return 'ZA'
}
export function countryFromPhone(value: string): CountryCode | undefined {
  return parsePhoneNumberFromString(value)?.country
}
export function canonicalPhone(raw: string, country: CountryCode): string {
  const input = raw.trim()
  if (!/^[+\d\s().-]+$/.test(input)) throw new Error('Enter a valid phone number.')
  const phone = parsePhoneNumberFromString(input, country)
  if (!phone || !phone.isValid() || phone.ext) throw new Error('Enter a valid phone number for the selected country, without an extension.')
  // An explicit + number takes precedence over the selected national format.
  return phone.number
}
