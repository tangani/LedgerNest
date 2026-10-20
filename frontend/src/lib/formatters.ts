import { minorDigits } from './currencyCatalogue'
export const money = (cents: number, currency: string) => new Intl.NumberFormat('en-ZA', { style: 'currency', currency, currencyDisplay: 'code' }).format(cents / (10 ** minorDigits(currency)))
export const dateLabel = (date: string) => new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(`${date}T12:00:00`))

