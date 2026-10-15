import type { Business, BusinessTransaction } from '../models/ledger'
import { MAX_CENTS, today, validDate } from './debts'
export function validateTransaction(business: Business, transaction: BusinessTransaction): string | null {
  if (!Number.isSafeInteger(transaction.amount) || transaction.amount <= 0 || transaction.amount > MAX_CENTS) return 'Enter a positive amount of up to 1,000,000,000.00.'
  if (!validDate(transaction.date) || transaction.date > today()) return 'Enter a valid date that is not in the future.'
  if (transaction.kind === 'capital_return' && transaction.amount > business.contributed - business.returned) return 'A capital return cannot exceed the capital still invested. Profit distributions are not capital returns.'
  if (transaction.kind === 'contribution' && business.contributed + transaction.amount > MAX_CENTS) return 'This would exceed the supported total of 1,000,000,000.00 for this business.'
  return null
}
