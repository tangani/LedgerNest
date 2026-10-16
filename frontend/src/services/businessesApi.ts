import type { Business, BusinessTransaction } from '../models/ledger'
import { ApiError, request } from './http'
export { ApiError } from './http'

const object = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null
const amount = (value: unknown): value is number => typeof value === 'number' && Number.isSafeInteger(value) && value >= 0

export function decodeBusiness(value: unknown): Business {
  if (!object(value) || typeof value.id !== 'string' || typeof value.name !== 'string' ||
      !['ZAR', 'USD'].includes(String(value.currency)) || !amount(value.version) ||
      !amount(value.contributed) || !amount(value.returned) || !amount(value.invested) ||
      (value.description != null && typeof value.description !== 'string')) {
    throw new ApiError('The backend returned an unexpected business format.', 0)
  }
  const records: unknown = value.transactions ?? []
  if (!Array.isArray(records)) throw new ApiError('Invalid business transaction history.', 0)
  const transactions: BusinessTransaction[] = records.map((item: unknown) => {
    if (!object(item) || typeof item.id !== 'string' || !['contribution', 'capital_return'].includes(String(item.kind)) ||
        !amount(item.amount) || item.amount === 0 || typeof item.date !== 'string' ||
        (item.notes != null && typeof item.notes !== 'string')) throw new ApiError('Invalid business transaction history.', 0)
    return { id: item.id, kind: item.kind as BusinessTransaction['kind'], amount: item.amount, date: item.date, notes: (item.notes as string) ?? '' }
  })
  const contributed = transactions.filter(t => t.kind === 'contribution').reduce((sum, t) => sum + t.amount, 0)
  const returned = transactions.filter(t => t.kind === 'capital_return').reduce((sum, t) => sum + t.amount, 0)
  if (contributed !== value.contributed || returned !== value.returned || contributed - returned !== value.invested) {
    throw new ApiError('Business totals do not match its history. Refresh before continuing.', 0)
  }
  return { id: value.id, name: value.name, currency: value.currency as Business['currency'],
    description: (value.description as string) ?? '', version: value.version, contributed, returned, transactions }
}
const base = '/api/v1/businesses'
function input(business: Business, existing: boolean) {
  return { name: business.name, description: business.description, currency: business.currency,
    ...(existing ? { version: business.version } : {}) }
}
export const businessesApi = {
  async list(signal?: AbortSignal): Promise<Business[]> {
    const result: Business[] = []
    const limit = 50
    for (let offset = 0; ; offset += limit) {
      const page = await request(`${base}?limit=${limit}&offset=${offset}`, 'GET', undefined, signal)
      if (!Array.isArray(page)) throw new ApiError('Expected a list of businesses.', 0)
      result.push(...page.map(decodeBusiness))
      if (page.length < limit) return [...new Map(result.map(b => [b.id, b])).values()]
    }
  },
  async create(business: Business): Promise<Business> {
    return decodeBusiness(await request(base, 'POST', input(business, false)))
  },
  async update(business: Business): Promise<Business> {
    if (business.version === undefined) throw new ApiError('Missing version. Refresh and reopen this business.', 409)
    return decodeBusiness(await request(`${base}/${encodeURIComponent(business.id)}`, 'PUT', input(business, true)))
  },
  async transact(id: string, transaction: BusinessTransaction): Promise<Business> {
    return decodeBusiness(await request(`${base}/${encodeURIComponent(id)}/transactions`, 'POST', transaction))
  },
}
