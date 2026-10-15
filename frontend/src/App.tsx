import { useState } from 'react'
import './App.css'
import { Tabs } from './components/Tabs'
import { Modal } from './components/Modal'
import { PersonalDebts } from './features/debts/PersonalDebts'
import { DebtEditor } from './features/debts/DebtEditor'
import { RepaymentEditor } from './features/debts/RepaymentEditor'
import { RateEditor } from './components/RateEditor'
import { RATE_SCALE } from './lib/currency'
import { BusinessSection } from './features/business/BusinessSection'
import { FundsEditor } from './features/business/FundsEditor'
import { RecentActivity } from './features/activity/RecentActivity'
import { validateTransaction } from './lib/business'
import { BusinessEditor } from './features/business/BusinessEditor'
import type { Business, Currency, Debt, Direction, Ledger, BusinessTransaction } from './models/ledger'
import { loadLedger, saveLedger } from './lib/storage'
import { balance, today, validateDebt } from './lib/debts'
import { dateLabel, money } from './lib/formatters'
const mainTabs = [{ value: 'debts', label: 'Personal debts' }, { value: 'business', label: 'Business' }, { value: 'activity', label: 'Recent activity' }] as const
type Editor = { kind: 'debt'; debt?: Debt } | { kind: 'repay' | 'details'; debt: Debt } | { kind: 'business'; business?: Business } | { kind: 'funds'; business: Business; transactionKind: BusinessTransaction['kind'] } | { kind: 'businessHistory'; business: Business } | { kind: 'rate' } | null

export default function App() {
  const [loaded] = useState(() => loadLedger())
  const [ledger, setLedger] = useState(loaded.ledger)
  const loadError = loaded.error
  const [tab, setTab] = useState<'debts' | 'business' | 'activity'>('debts')
  const [currency, setCurrency] = useState<Currency>('ZAR')
  const [direction, setDirection] = useState<Direction>('receivable')
  const [editor, setEditor] = useState<Editor>(null)
  const [notice, setNotice] = useState('')
  function commit(next: Ledger): string | null {
    if (loadError) return loadError
    try {
      // Write the complete change first: never announce success if storage fails.
      saveLedger(next)
      setLedger(next)
      setEditor(null)
      setNotice('Saved in this browser.')
      return null
    } catch { return 'Could not save to browser storage. Your changes have not been applied. Free storage or enable site storage and try again.' }
  }
  function saveDebt(debt: Debt) {
    const original = ledger.debts.find((item) => item.id === debt.id)
    const error = validateDebt(debt, original)
    if (error) return error
    const problem = commit({ ...ledger,
      debts: original ? ledger.debts.map((item) => item.id === debt.id ? debt : item) : [debt, ...ledger.debts],
      activity: [{ id: crypto.randomUUID(), date: today(), title: original ? 'Debt details updated' : 'Debt added', detail: `${debt.person} · ${debt.direction === 'receivable' ? 'Owed to me' : 'I owe'}`, currency: debt.currency, amount: debt.principal }, ...ledger.activity],
    })
    if (!problem) setDirection(debt.direction)
    return problem
  }
  return <div className="app-shell">
    <a className="skip-link" href="#main">Skip to content</a>
    <header className="app-header"><a className="brand" href="#main"><span className="brand-mark" aria-hidden="true">L</span>LedgerNest</a></header>
    <main id="main">
      <div className="workspace-heading"><div><p className="eyebrow">YOUR WORKSPACE</p><h1>A little more clarity.</h1></div><label className="currency-control">Display currency<select value={currency} onChange={(event) => setCurrency(event.target.value as Currency)}><option value="ZAR">ZAR · South African rand</option><option value="USD">USD · US dollar</option></select></label></div>
      {loadError && <p className="storage-error" role="alert">{loadError}</p>}
      <p className="notice" role="status">{notice}</p>
      <Tabs id="workspace" label="Workspace sections" options={mainTabs} value={tab} onChange={setTab} />
      <div className="rate-bar"><p>{ledger.exchangeRate ? `Manual rate: 1 USD = ${ledger.exchangeRate.zarPerUsdMicros / RATE_SCALE} ZAR · Saved ${new Date(ledger.exchangeRate.updatedAt).toLocaleDateString()}` : 'Set an exchange rate to combine ZAR and USD totals.'}<span className="conversion-note">Display totals in {currency}. Original amounts are preserved.</span></p><button className="secondary" disabled={Boolean(loadError)} onClick={() => setEditor({ kind: 'rate' })}>{ledger.exchangeRate ? 'Edit rate' : 'Set rate'}</button></div>
      <section role="tabpanel" id="workspace-panel-debts" aria-labelledby="workspace-tab-debts" hidden={tab !== 'debts'} tabIndex={0}>
        <PersonalDebts rate={ledger.exchangeRate} debts={ledger.debts} currency={currency} direction={direction} onDirection={setDirection} onAdd={() => setEditor({ kind: 'debt' })} onEdit={(debt) => setEditor({ kind: 'debt', debt })} onRepay={(debt) => setEditor({ kind: 'repay', debt })} onDetails={(debt) => setEditor({ kind: 'details', debt })} disabled={Boolean(loadError)} />
      </section>
      <section role="tabpanel" id="workspace-panel-business" aria-labelledby="workspace-tab-business" hidden={tab !== 'business'} tabIndex={0}>
        <BusinessSection businesses={ledger.businesses} currency={currency} rate={ledger.exchangeRate} disabled={Boolean(loadError)} onAdd={() => setEditor({ kind: 'business' })} onEdit={(business) => setEditor({ kind: 'business', business })} onFunds={(business) => setEditor({ kind: 'funds', business, transactionKind: 'contribution' })} onReturn={(business) => setEditor({ kind: 'funds', business, transactionKind: 'capital_return' })} onHistory={(business) => setEditor({ kind: 'businessHistory', business })} />
      </section>
      <section role="tabpanel" id="workspace-panel-activity" aria-labelledby="workspace-tab-activity" hidden={tab !== 'activity'} tabIndex={0}><RecentActivity activity={ledger.activity} currency={currency} rate={ledger.exchangeRate} /></section>
      <footer>Saved on this device. Clearing site data removes records.</footer>
    </main>
    {editor?.kind === 'debt' && <DebtEditor debt={editor.debt} currency={currency} direction={direction} onSave={saveDebt} onClose={() => setEditor(null)} />}
    {editor?.kind === 'repay' && <RepaymentEditor debt={editor.debt} onClose={() => setEditor(null)} onSave={(payment) => {
      const debt = ledger.debts.find((item) => item.id === editor.debt.id)
      if (!debt || payment.amount > balance(debt)) return 'The outstanding balance has changed. Close and reopen this repayment.'
      return commit({ ...ledger, debts: ledger.debts.map((item) => item.id === debt.id ? { ...item, repayments: [...item.repayments, payment] } : item), activity: [{ id: payment.id, date: payment.date, title: debt.direction === 'receivable' ? 'Repayment received' : 'Repayment made', detail: `${debt.person} · Personal debt`, currency: debt.currency, amount: payment.amount }, ...ledger.activity] })
    }} />}
    {editor?.kind === 'details' && <Modal title={editor.debt.person} onClose={() => setEditor(null)}>
      <p>Outstanding: <strong>{money(balance(editor.debt), editor.debt.currency)}</strong></p>
      <p className="detail-notes">{editor.debt.notes || 'No notes recorded.'}</p>
      <h3>Repayment history</h3>
      <ul className="history">{[...editor.debt.repayments].sort((a, b) => b.date.localeCompare(a.date)).map((item) => <li key={item.id}><strong>{money(item.amount, editor.debt.currency)}</strong> · {dateLabel(item.date)}<p>{item.notes}</p></li>)}</ul>
      {!editor.debt.repayments.length && <p>No repayments yet.</p>}
      <p className="form-help">Use the card’s Edit or Repayment button to make changes.</p>
    </Modal>}
    {editor?.kind === 'business' && <BusinessEditor business={editor.business} currency={currency} onClose={() => setEditor(null)} onSave={(business) => {
      const exists = ledger.businesses.some((item) => item.id === business.id)
      return commit({ ...ledger, businesses: exists ? ledger.businesses.map((item) => item.id === business.id ? business : item) : [business, ...ledger.businesses], activity: [{ id: crypto.randomUUID(), date: today(), title: exists ? 'Business details updated' : 'Business created', detail: business.name, currency: business.currency, amount: business.contributed }, ...ledger.activity] })
    }} />}
    {editor?.kind === 'rate' && <RateEditor rate={ledger.exchangeRate} onClose={() => setEditor(null)} onSave={(exchangeRate) => commit({ ...ledger, exchangeRate })} />}
    {editor?.kind === 'funds' && <FundsEditor business={editor.business} kind={editor.transactionKind} onClose={() => setEditor(null)} onSave={(transaction) => {
      const business = ledger.businesses.find((item) => item.id === editor.business.id)
      if (!business) return 'This business is no longer available.'
      const error = validateTransaction(business, transaction)
      if (error) return error
      const updated: Business = { ...business, contributed: business.contributed + (transaction.kind === 'contribution' ? transaction.amount : 0), returned: business.returned + (transaction.kind === 'capital_return' ? transaction.amount : 0), transactions: [...(business.transactions ?? []), transaction] }
      return commit({ ...ledger, businesses: ledger.businesses.map((item) => item.id === business.id ? updated : item), activity: [{ id: transaction.id, date: transaction.date, title: transaction.kind === 'contribution' ? 'Capital contributed' : 'Capital returned', detail: business.name, currency: business.currency, amount: transaction.amount }, ...ledger.activity] })
    }} />}
    {editor?.kind === 'businessHistory' && <Modal title={`${editor.business.name} history`} onClose={() => setEditor(null)}>
      {(() => {
        const transactions = editor.business.transactions ?? []
        const openingContribution = editor.business.contributed - transactions.filter((t) => t.kind === 'contribution').reduce((sum, t) => sum + t.amount, 0)
        const openingReturn = editor.business.returned - transactions.filter((t) => t.kind === 'capital_return').reduce((sum, t) => sum + t.amount, 0)
        return <>
          {(openingContribution > 0 || openingReturn > 0) && <p className="form-help">Earlier balances without transaction details: contributed {money(openingContribution, editor.business.currency)}, returned {money(openingReturn, editor.business.currency)}.</p>}
          <ul className="history">{[...transactions].sort((a, b) => b.date.localeCompare(a.date)).map((item) => <li key={item.id}><strong>{item.kind === 'contribution' ? 'Funds added' : 'Capital returned'} · {money(item.amount, editor.business.currency)}</strong><p>{dateLabel(item.date)}</p><p>{item.notes}</p></li>)}</ul>
          {!transactions.length && <p>No dated transactions recorded yet.</p>}
        </>
      })()}
    </Modal>}
  </div>
}
