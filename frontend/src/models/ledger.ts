export type Currency = 'ZAR' | 'USD'
export type Direction = 'receivable' | 'payable'
export type Repayment = { id: string; amount: number; date: string; notes: string }
export type Debt = {
  id: string; person: string; purpose: string; direction: Direction
  currency: Currency; principal: number; due: string; notes: string
  repayments: Repayment[]
}
export type Business = { id: string; name: string; description: string; currency: Currency; contributed: number; returned: number; transactions?: BusinessTransaction[] }
export type Activity = { id: string; date: string; title: string; detail: string; currency: Currency; amount: number }
export type ExchangeRate = { zarPerUsdMicros: number; updatedAt: string }
export type BusinessTransaction = { id: string; kind: 'contribution' | 'capital_return'; amount: number; date: string; notes: string }
export type Ledger = { version: 1; debts: Debt[]; businesses: Business[]; activity: Activity[]; exchangeRate?: ExchangeRate }
