import { isCurrencyCode } from './currencyCatalogue'
export type UserPreferences = { country: string; currency: string }
export const PREFERENCES_EVENT = 'ledgernest-preferences-changed'
export function defaultCurrency(country: string): string {
  // Product defaults within the backend's CURRENT supported currency set.
  // Zimbabwe intentionally uses USD. Other countries fall back to USD for now.
  return country === 'ZA' ? 'ZAR' : 'USD'
}
function key(userId: string) { return `ledgernest:preferences:v1:${userId}` }
export function readPreferences(userId: string, suggestedCountry = 'ZA'): UserPreferences {
  const fallback: UserPreferences = { country: '', currency: defaultCurrency(suggestedCountry) }
  try {
    const stored: unknown = JSON.parse(localStorage.getItem(key(userId)) ?? 'null')
    if (!stored || typeof stored !== 'object') return fallback
    const value = stored as Record<string, unknown>
    if (!isCurrencyCode(value.currency) ||
        typeof value.country !== 'string' || !/^(?:[A-Z]{2})?$/.test(value.country)) return fallback
    return { country: value.country, currency: value.currency }
  } catch { return fallback }
}
export function savePreferences(userId: string, preferences: UserPreferences): void {
  if (!userId) throw new Error('Sign in before saving preferences.')
  try { localStorage.setItem(key(userId), JSON.stringify(preferences)) }
  catch { throw new Error('Could not save your preferences on this device. Enable browser storage and try again.') }
  window.dispatchEvent(new CustomEvent(PREFERENCES_EVENT, { detail: userId }))
}
