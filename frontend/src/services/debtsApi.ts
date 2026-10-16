import type { Debt, Repayment } from '../models/ledger'

import { ApiError, request as httpRequest } from './http'
export { ApiError } from './http'
const request = (path: string, method = 'GET', body?: unknown, signal?: AbortSignal) => httpRequest(`/api/v1/debts${path}`, method, body, signal)

const object = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null
const cents = (value: unknown): value is number =>
  typeof value === 'number' && Number.isSafeInteger(value) && value >= 0

// Micronaut can omit empty fields, including an empty repayment collection.
export function decodeDebt(value: unknown): Debt {
  if (!object(value) || typeof value.id !== 'string' || typeof value.person !== 'string' ||
      !['receivable', 'payable'].includes(String(value.direction)) ||
      !['ZAR', 'USD'].includes(String(value.currency)) || !cents(value.principal) ||
      !cents(value.version) || !cents(value.repaid) || !cents(value.outstanding)) {
    throw new ApiError('The backend returned an unexpected debt format.', 0)
  }
  const payments = value.repayments ?? []
  if (!Array.isArray(payments) || payments.some((p: unknown) => !object(p) ||
      typeof p.id !== 'string' || !cents(p.amount) || typeof p.date !== 'string' ||
      (p.notes != null && typeof p.notes !== 'string'))) {
    throw new ApiError('The backend returned an unexpected repayment format.', 0)
  }
  const repayments: Repayment[] = payments.map(p => ({ ...p, notes: p.notes ?? '' }))
  if (repayments.reduce((sum, p) => sum + p.amount, 0) !== value.repaid ||
      value.principal - value.repaid !== value.outstanding) {
    throw new ApiError('The backend returned inconsistent debt totals. Refresh before continuing.', 0)
  }
  for (const key of ['purpose', 'due', 'notes']) {
    if (value[key] != null && typeof value[key] !== 'string') throw new ApiError('Invalid debt details received.', 0)
  }
  return {
    id: value.id, person: value.person, direction: value.direction as Debt['direction'],
    currency: value.currency as Debt['currency'], principal: value.principal, version: value.version,
    purpose: (value.purpose as string) ?? '', due: (value.due as string) ?? '',
    notes: (value.notes as string) ?? '', repayments,
  }
}


function input(debt: Debt, update: boolean) {
  return {
    person: debt.person, purpose: debt.purpose, direction: debt.direction,
    currency: debt.currency, principal: debt.principal, due: debt.due || null,
    notes: debt.notes, ...(update ? { version: debt.version } : {}),
  }
}

export const debtsApi = {
  async list(signal?: AbortSignal): Promise<Debt[]> {
    const result: Debt[] = []
    const limit = 50
    for (let offset = 0; ; offset += limit) {
      const page = await request(`?limit=${limit}&offset=${offset}`, 'GET', undefined, signal)
      if (!Array.isArray(page)) throw new ApiError('Expected a list of debts from the backend.', 0)
      result.push(...page.map(decodeDebt))
      if (page.length < limit) return [...new Map(result.map(d => [d.id, d])).values()]
    }
  },
  async create(debt: Debt): Promise<Debt> {
    return decodeDebt(await request('', 'POST', input(debt, false)))
  },
  async update(debt: Debt): Promise<Debt> {
    if (debt.version === undefined) throw new ApiError('Missing debt version. Refresh and reopen the editor.', 409)
    return decodeDebt(await request(`/${encodeURIComponent(debt.id)}`, 'PUT', input(debt, true)))
  },
  async repay(id: string, payment: Repayment): Promise<Debt> {
    return decodeDebt(await request(`/${encodeURIComponent(id)}/repayments`, 'POST', payment))
  },
}
