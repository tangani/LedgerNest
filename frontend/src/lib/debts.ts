import type { Debt } from '../models/ledger'
export const MAX_CENTS = 100_000_000_000
export function parseAmount(input: string): number | null {
  const value = input.trim()
  if (!/^\d{1,10}(\.\d{1,2})?$/.test(value)) return null
  const [whole, fraction = ''] = value.split('.')
  const cents = Number(whole) * 100 + Number(fraction.padEnd(2, '0'))
  return Number.isSafeInteger(cents) && cents > 0 && cents <= MAX_CENTS ? cents : null
}
export const repaid = (debt: Debt) => debt.repayments.reduce((sum, item) => sum + item.amount, 0)
export const balance = (debt: Debt) => debt.principal - repaid(debt)
export function today() {
  const date = new Date()
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}
export function validDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const date = new Date(`${value}T12:00:00Z`)
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value
}
export function validateDebt(debt: Debt, original?: Debt): string | null {
  if (!debt.person.trim() || debt.person.length > 100) return 'Enter a name of up to 100 characters.'
  if (!Number.isSafeInteger(debt.principal) || debt.principal <= 0 || debt.principal > MAX_CENTS) return 'Enter a positive amount of up to 1,000,000,000.00.'
  if (debt.principal < repaid(debt)) return 'The original amount cannot be below the repayments already recorded.'
  if (debt.due && !validDate(debt.due)) return 'Enter a valid due date.'
  if (original && original.repayments.length && (original.currency !== debt.currency || original.direction !== debt.direction)) return 'Currency and direction cannot change after a repayment.'
  return null
}
