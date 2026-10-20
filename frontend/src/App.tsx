import { CurrencySelect } from './components/CurrencySelect'
import type { User } from './services/authApi'
import { useState } from 'react'
import './App.css'
import { Tabs } from './components/Tabs'
import { Modal } from './components/Modal'
import { AppHeader } from './components/AppHeader'
import { PersonalDebts } from './features/debts/PersonalDebts'
import { DebtEditor } from './features/debts/DebtEditor'
import { RepaymentEditor } from './features/debts/RepaymentEditor'
import { ExchangeRateStatus } from './components/ExchangeRateStatus'
import { useExchangeRate } from './hooks/useExchangeRate'
import { usePreferences } from './hooks/usePreferences'
import { countryFromPhone } from './lib/countries'
import './features/preferences/country-currency.css'
import { BusinessSection } from './features/business/BusinessSection'
import { FundsEditor } from './features/business/FundsEditor'
import { RecentActivity } from './features/activity/RecentActivity'
import { BusinessEditor } from './features/business/BusinessEditor'
import type { Business, Currency, Debt, Direction, BusinessTransaction } from './models/ledger'
import { loadLedger } from './lib/storage'
import { useBusinesses } from './hooks/useBusinesses'
import { useDebts } from './hooks/useDebts'
import { ApiError } from './services/debtsApi'
import { balance, validateDebt } from './lib/debts'
import { dateLabel, money } from './lib/formatters'
const mainTabs = [{ value: 'debts', label: 'Personal debts' }, { value: 'business', label: 'Business' }, { value: 'activity', label: 'Recent activity' }] as const
type Editor = { kind: 'debt'; debt?: Debt } | { kind: 'repay' | 'details'; debt: Debt } | { kind: 'business'; business?: Business } | { kind: 'funds'; business: Business; transactionKind: BusinessTransaction['kind'] } | { kind: 'businessHistory'; business: Business } | null

export default function App({ user, onLogout, onAccount }: { user: User; onLogout: () => void; onAccount: () => void }) {
  const [loaded] = useState(() => loadLedger(user.id))
  const [ledger] = useState(loaded.ledger)
  const loadError = loaded.error
  const api = useDebts()
  const businessApi = useBusinesses()
  const repayments = api.debts.flatMap(debt => debt.repayments.map(payment => ({
    id: payment.id, date: payment.date,
    title: debt.direction === 'receivable' ? 'Repayment received' : 'Repayment made',
    detail: `${debt.person} · Personal debt`, currency: debt.currency, amount: payment.amount,
  })))
  const businessActivity = businessApi.businesses.flatMap(business => (business.transactions ?? []).map(transaction => ({
    id: transaction.id, date: transaction.date,
    title: transaction.kind === 'contribution' ? 'Capital contributed' : 'Capital returned',
    detail: `${business.name} · Business`, currency: business.currency, amount: transaction.amount,
  })))
  const serverActivity = [...repayments, ...businessActivity]
  const serverIds = new Set(serverActivity.map(item => item.id))
  const activity = [...serverActivity, ...ledger.activity.filter(item => !serverIds.has(item.id))]
    .sort((a, b) => b.date.localeCompare(a.date))
  const [tab, setTab] = useState<'debts' | 'business' | 'activity'>('debts')
  const { preferences, update: updatePreferences } = usePreferences(user.id, countryFromPhone(user.username))
  const currency = preferences.currency
  const fx = useExchangeRate(currency)
  const recordCurrency: Currency = currency === 'ZAR' ? 'ZAR' : 'USD'
  const exchangeRate = fx.rate
  function setCurrency(next: string) {
    try { updatePreferences({ ...preferences, currency: next }) }
    catch (problem) { setNotice(problem instanceof Error ? problem.message : 'Could not save display currency.') }
  }
  const [direction, setDirection] = useState<Direction>('receivable')
  const [editor, setEditor] = useState<Editor>(null)
  const [notice, setNotice] = useState('')
  async function saveDebt(debt: Debt) {
    const original = editor?.kind === 'debt' ? editor.debt : undefined
    const error = validateDebt(debt, original)
    if (error) return error
    try {
      await api.save(debt, Boolean(original))
      setEditor(null)
      setDirection(debt.direction)
      setNotice('Debt saved to the backend.')
      return null
    } catch (problem) {
      throw new ApiError(api.message(problem), problem instanceof ApiError ? problem.status : 0)
    }
  }
  return <div className="app-shell">
    <a className="skip-link" href="#main">Skip to content</a>
    <AppHeader
        onAccount={onAccount}
        onLogout={onLogout}
    />
    <main id="main">
      <div className="workspace-heading"><div><p className="eyebrow">YOUR WORKSPACE</p><h1>A little more clarity.</h1></div><label className="currency-control">Display currency<CurrencySelect value={currency} onChange={setCurrency} /></label></div>
      {loadError && <p className="storage-error" role="alert">{loadError}</p>}
      <p className="notice" role="status">{notice}</p>
      <Tabs id="workspace" label="Workspace sections" options={mainTabs} value={tab} onChange={setTab} />
      <ExchangeRateStatus fx={fx} currency={currency} />
      <section role="tabpanel" id="workspace-panel-debts" aria-labelledby="workspace-tab-debts" hidden={tab !== 'debts'} tabIndex={0}>
        <div className="api-toolbar"><p>Personal debts are saved to the backend.</p><button className="secondary" disabled={api.loading || editor !== null} onClick={() => { void api.refresh() }}>Refresh debts</button></div>
        {api.loading && <p role="status" className="empty-state">Loading debts…</p>}
        {api.error && <p className="storage-error" role="alert">{api.error} Start the backend and use Refresh debts to try again.</p>}
        {!api.loading && !api.error && <PersonalDebts rate={exchangeRate} debts={api.debts} currency={currency} direction={direction} onDirection={setDirection} onAdd={() => setEditor({ kind: 'debt' })} onEdit={(debt) => setEditor({ kind: 'debt', debt })} onRepay={(debt) => setEditor({ kind: 'repay', debt })} onDetails={(debt) => setEditor({ kind: 'details', debt })} disabled={false} />}
        {ledger.debts.length > 0 && <details className="local-archive"><summary>Previous browser debts ({ledger.debts.length}) · read only</summary>
          <p>These records remain on this device and have not been imported. They are excluded from backend totals. Review them before recreating any records to avoid duplicates.</p>
          <PersonalDebts id="local-debt" rate={exchangeRate} debts={ledger.debts} currency={currency} direction={direction} onDirection={setDirection} onAdd={() => {}} onEdit={() => {}} onRepay={() => {}} onDetails={(debt) => setEditor({ kind: 'details', debt })} disabled={true} />
        </details>}
      </section>
      <section role="tabpanel" id="workspace-panel-business" aria-labelledby="workspace-tab-business" hidden={tab !== 'business'} tabIndex={0}>
        <div className="api-toolbar"><p>Business records are saved to the backend.</p><button className="secondary" disabled={businessApi.loading || editor !== null} onClick={() => { void businessApi.refresh() }}>Refresh businesses</button></div>
        {businessApi.loading && <p role="status" className="empty-state">Loading businesses…</p>}
        {businessApi.error && <p className="storage-error" role="alert">{businessApi.error} Use Refresh businesses to try again.</p>}
        {!businessApi.loading && !businessApi.error && <BusinessSection businesses={businessApi.businesses} currency={currency} rate={exchangeRate} disabled={false} onAdd={() => setEditor({ kind: 'business' })} onEdit={(business) => setEditor({ kind: 'business', business })} onFunds={(business) => setEditor({ kind: 'funds', business, transactionKind: 'contribution' })} onReturn={(business) => setEditor({ kind: 'funds', business, transactionKind: 'capital_return' })} onHistory={(business) => setEditor({ kind: 'businessHistory', business })} />}
        {ledger.businesses.length > 0 && <details className="local-archive"><summary>Previous browser businesses ({ledger.businesses.length}) · read only</summary>
          <p>These records remain on this device and have not been imported. They are excluded from backend totals. Check them before recreating records to avoid duplicates.</p>
          <BusinessSection businesses={ledger.businesses} currency={currency} rate={exchangeRate} disabled={true} onAdd={() => {}} onEdit={() => {}} onFunds={() => {}} onReturn={() => {}} onHistory={(business) => setEditor({ kind: 'businessHistory', business })} />
        </details>}
      </section>
      <section role="tabpanel" id="workspace-panel-activity" aria-labelledby="workspace-tab-activity" hidden={tab !== 'activity'} tabIndex={0}><p className="form-help">Backend repayments, business contributions and capital returns, plus activity previously saved on this device. Creation and edit history are not yet provided by the APIs.</p>{api.error && <p role="alert">Backend repayment history is unavailable until debts refresh successfully.</p>}{businessApi.error && <p role="alert">Business history may be out of date until businesses refresh successfully.</p>}{(api.loading || businessApi.loading) && <p role="status">Refreshing transaction history…</p>}<RecentActivity activity={activity} currency={currency} rate={exchangeRate} /></section>
      <footer>Personal debts and business records: backend database. Estimated exchange rates: Frankfurter. Preferences and previous local records: this device.</footer>
    </main>
    {editor?.kind === 'debt' && <DebtEditor debt={editor.debt} currency={recordCurrency} direction={direction} onSave={saveDebt} onClose={() => setEditor(null)} />}
    {editor?.kind === 'repay' && <RepaymentEditor debt={editor.debt} onClose={() => setEditor(null)} onSave={async (payment) => {
      try {
        await api.repay(editor.debt.id, payment)
        setEditor(null)
        setNotice('Repayment saved to the backend.')
        return null
      } catch (problem) {
        throw new ApiError(api.message(problem), problem instanceof ApiError ? problem.status : 0)
      }
    }} />}
    {editor?.kind === 'details' && <Modal title={editor.debt.person} onClose={() => setEditor(null)}>
      <p>Outstanding: <strong>{money(balance(editor.debt), editor.debt.currency)}</strong></p>
      <p className="detail-notes">{editor.debt.notes || 'No notes recorded.'}</p>
      <h3>Repayment history</h3>
      <ul className="history">{[...editor.debt.repayments].sort((a, b) => b.date.localeCompare(a.date)).map((item) => <li key={item.id}><strong>{money(item.amount, editor.debt.currency)}</strong> · {dateLabel(item.date)}<p>{item.notes}</p></li>)}</ul>
      {!editor.debt.repayments.length && <p>No repayments yet.</p>}
      <p className="form-help">Backend debts can be edited using the card’s Edit or Repayment button. Previous browser debts are read only.</p>
    </Modal>}
    {editor?.kind === 'business' && <BusinessEditor business={editor.business} currency={recordCurrency} onClose={() => setEditor(null)} onSave={async (business) => {
      try {
        await businessApi.save(business, Boolean(editor.business))
        setEditor(null)
        setNotice('Business saved to the backend.')
        return null
      } catch (problem) {
        throw new ApiError(businessApi.message(problem), problem instanceof ApiError ? problem.status : 0)
      }
    }} />}
    {editor?.kind === 'funds' && <FundsEditor business={editor.business} kind={editor.transactionKind} onClose={() => setEditor(null)} onSave={async (transaction) => {
      try {
        await businessApi.transact(editor.business.id, transaction)
        setEditor(null)
        setNotice('Business transaction saved to the backend.')
        return null
      } catch (problem) {
        throw new ApiError(businessApi.message(problem), problem instanceof ApiError ? problem.status : 0)
      }
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
