import type { Ledger } from '../models/ledger'
import { MAX_CENTS, validDate } from './debts'
const key = (userId: string) => `ledgernest.v2.account:${userId}`
export function initialLedger(): Ledger { return { version: 1, debts: [], businesses: [], activity: [] } }
const object = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null
const text = (value: unknown): value is string => typeof value === 'string'
const currency = (value: unknown) => value === 'ZAR' || value === 'USD'
const amount = (value: unknown): value is number => typeof value === 'number' && Number.isSafeInteger(value) && value >= 0 && value <= MAX_CENTS
export function validLedger(value: unknown): value is Ledger {
  if (!object(value) || value.version !== 1 || !Array.isArray(value.debts) || !Array.isArray(value.businesses) || !Array.isArray(value.activity)) return false
  if (value.exchangeRate !== undefined && (!object(value.exchangeRate) || !Number.isSafeInteger(value.exchangeRate.zarPerUsdMicros) || Number(value.exchangeRate.zarPerUsdMicros) <= 0 || Number(value.exchangeRate.zarPerUsdMicros) > 1_000_000_000 || !text(value.exchangeRate.updatedAt) || Number.isNaN(Date.parse(value.exchangeRate.updatedAt)))) return false
  return value.debts.every((d: unknown) => {
    if (!object(d) || !text(d.id) || !text(d.person) || !d.person.trim() || !text(d.purpose) || !text(d.notes) || !currency(d.currency) || !['payable', 'receivable'].includes(String(d.direction)) || !amount(d.principal) || d.principal === 0 || !text(d.due) || (d.due !== '' && !validDate(d.due)) || !Array.isArray(d.repayments)) return false
    let total = 0
    for (const r of d.repayments as unknown[]) {
      if (!object(r) || !text(r.id) || !amount(r.amount) || r.amount === 0 || !text(r.date) || !validDate(r.date) || !text(r.notes)) return false
      total += r.amount
    }
    return total <= d.principal
  }) && value.businesses.every((b: unknown) => {
    if (!object(b) || !text(b.id) || !text(b.name) || !text(b.description) || !currency(b.currency) || !amount(b.contributed) || !amount(b.returned) || b.returned > b.contributed) return false
    if (b.transactions === undefined) return true // Preserve pre-transaction records.
    if (!Array.isArray(b.transactions)) return false
    let contributions = 0
    let returns = 0
    for (const t of b.transactions as unknown[]) {
      if (!object(t) || !text(t.id) || !['contribution', 'capital_return'].includes(String(t.kind)) || !amount(t.amount) || t.amount === 0 || !text(t.date) || !validDate(t.date) || !text(t.notes)) return false
      if (t.kind === 'contribution') contributions += t.amount
      else returns += t.amount
    }
    return contributions <= b.contributed && returns <= b.returned
  }) && value.activity.every((a: unknown) => object(a) && text(a.id) && text(a.title) && text(a.detail) && text(a.date) && validDate(a.date) && currency(a.currency) && amount(a.amount))
}
export function loadLedger(userId: string): { ledger: Ledger; error: string } {
  try {
    const raw = localStorage.getItem(key(userId))
    if (raw === null) return { ledger: initialLedger(), error: '' }
    const parsed: unknown = JSON.parse(raw)
    if (!validLedger(parsed)) throw new Error('Invalid stored data')
    return { ledger: parsed, error: '' }
  } catch {
    return { ledger: initialLedger(), error: 'Stored data could not be loaded. Editing is disabled to protect it. Restore browser storage before continuing.' }
  }
}
export function saveLedger(ledger: Ledger, userId: string) {
  localStorage.setItem(key(userId), JSON.stringify(ledger))
}
