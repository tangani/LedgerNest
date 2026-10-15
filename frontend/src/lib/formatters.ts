import type { Currency } from '../models/ledger'
export const money = (cents: number, currency: Currency) => new Intl.NumberFormat('en-ZA', { style: 'currency', currency, currencyDisplay: 'code' }).format(cents / 100)
export const dateLabel = (date: string) => new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(`${date}T12:00:00`))

