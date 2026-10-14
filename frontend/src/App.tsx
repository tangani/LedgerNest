import { useRef, useState } from 'react'
import './App.css'

type Currency = 'ZAR' | 'USD'
type Direction = 'receivable' | 'payable'
type Debt = {
  id: string
  person: string
  purpose: string
  direction: Direction
  currency: Currency
  principal: number
  repaid: number
  due: string
}

// All amounts are integer minor units (cents). Fictional data only.
const debts: Debt[] = [
  { id: 'd1', person: 'Alex Morgan', purpose: 'Emergency repair', direction: 'receivable', currency: 'ZAR', principal: 250000, repaid: 50000, due: '2026-10-25' },
  { id: 'd2', person: 'Sam Ndlovu', purpose: 'Course fees', direction: 'receivable', currency: 'ZAR', principal: 180000, repaid: 0, due: '2026-11-01' },
  { id: 'd3', person: 'Jamie Dube', purpose: 'Shared travel costs', direction: 'payable', currency: 'ZAR', principal: 120000, repaid: 30000, due: '2026-10-30' },
  { id: 'd4', person: 'Taylor Moyo', purpose: 'Equipment loan', direction: 'receivable', currency: 'USD', principal: 30000, repaid: 10000, due: '2026-11-05' },
  { id: 'd5', person: 'Casey Banda', purpose: 'Short-term loan', direction: 'payable', currency: 'USD', principal: 15000, repaid: 0, due: '2026-11-10' },
]
const businesses: { id: string; name: string; description: string; currency: Currency; contributed: number; returned: number }[] = [
  { id: 'b1', name: 'Sunrise Poultry', description: 'Egg production', currency: 'ZAR', contributed: 850000, returned: 100000 },
  { id: 'b2', name: 'Studio Print', description: 'Printing & stationery', currency: 'ZAR', contributed: 400000, returned: 0 },
  { id: 'b3', name: 'Green Acre', description: 'Market garden', currency: 'USD', contributed: 60000, returned: 5000 },
]
const activity: { id: string; date: string; title: string; detail: string; currency: Currency; amount: number }[] = [
  { id: 'a1', date: '2026-10-14', title: 'Repayment received', detail: 'Alex Morgan · Personal debt', currency: 'ZAR', amount: 50000 },
  { id: 'a2', date: '2026-10-13', title: 'Capital contributed', detail: 'Sunrise Poultry · Business', currency: 'ZAR', amount: 150000 },
  { id: 'a3', date: '2026-10-12', title: 'Repayment made', detail: 'Jamie Dube · Personal debt', currency: 'ZAR', amount: 30000 },
  { id: 'a4', date: '2026-10-14', title: 'Repayment received', detail: 'Taylor Moyo · Personal debt', currency: 'USD', amount: 10000 },
  { id: 'a5', date: '2026-10-10', title: 'Capital returned', detail: 'Green Acre · Business', currency: 'USD', amount: 5000 },
]
const money = (cents: number, currency: Currency) => new Intl.NumberFormat('en-ZA', { style: 'currency', currency, currencyDisplay: 'code' }).format(cents / 100)
const dateLabel = (date: string) => new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(`${date}T12:00:00`))

type TabOption<T extends string> = { value: T; label: string }

function Tabs<T extends string>({ id, label, options, value, onChange }: {
  id: string
  label: string
  options: readonly TabOption<T>[]
  value: T
  onChange: (value: T) => void
}) {
  const buttons = useRef<(HTMLButtonElement | null)[]>([])
  return (
    <div className="tabs" role="tablist" aria-label={label}>
      {options.map((option, index) => (
        <button
          key={option.value}
          ref={(element) => { buttons.current[index] = element }}
          type="button"
          role="tab"
          id={`${id}-tab-${option.value}`}
          aria-controls={`${id}-panel-${option.value}`}
          aria-selected={value === option.value}
          tabIndex={value === option.value ? 0 : -1}
          onClick={() => onChange(option.value)}
          onKeyDown={(event) => {
            let next = index
            if (event.key === 'ArrowRight') next = (index + 1) % options.length
            else if (event.key === 'ArrowLeft') next = (index - 1 + options.length) % options.length
            else if (event.key === 'Home') next = 0
            else if (event.key === 'End') next = options.length - 1
            else return
            event.preventDefault()
            const optionToSelect = options[next]
            if (optionToSelect) {
              onChange(optionToSelect.value)
              buttons.current[next]?.focus()
            }
          }}
        >{option.label}</button>
      ))}
    </div>
  )
}

const mainTabs = [
  { value: 'debts', label: 'Personal debts' },
  { value: 'business', label: 'Business' },
  { value: 'activity', label: 'Recent activity' },
] as const
const debtTabs = [
  { value: 'receivable', label: 'Owed to me' },
  { value: 'payable', label: 'I owe' },
] as const

function App() {
  const [tab, setTab] = useState<'debts' | 'business' | 'activity'>('debts')
  const [direction, setDirection] = useState<Direction>('receivable')
  const [currency, setCurrency] = useState<Currency>('ZAR')
  const visibleDebts = debts.filter((debt) => debt.currency === currency && debt.direction === direction)
  const visibleBusinesses = businesses.filter((business) => business.currency === currency)
  const visibleActivity = activity.filter((item) => item.currency === currency).sort((a, b) => b.date.localeCompare(a.date))
  const totalDebt = visibleDebts.reduce((total, debt) => total + debt.principal - debt.repaid, 0)
  const contributions = visibleBusinesses.reduce((total, business) => total + business.contributed, 0)

  return (
    <div className="app-shell">
      <a className="skip-link" href="#main">Skip to content</a>
      <header className="app-header">
        <a className="brand" href="#main"><span className="brand-mark" aria-hidden="true">L</span>LedgerNest</a>
        <span className="demo-badge">Sample data</span>
      </header>
      <main id="main">
        <div className="workspace-heading">
          <div><p className="eyebrow">YOUR WORKSPACE</p><h1>A little more clarity.</h1></div>
          <label className="currency-control">Currency
            <select value={currency} onChange={(event) => setCurrency(event.target.value as Currency)}>
              <option value="ZAR">ZAR · South African rand</option>
              <option value="USD">USD · US dollar</option>
            </select>
          </label>
        </div>
        <Tabs id="workspace" label="Workspace sections" options={mainTabs} value={tab} onChange={setTab} />
        <p className="currency-note">Showing {currency} only · No currency conversion</p>

        <section role="tabpanel" id="workspace-panel-debts" aria-labelledby="workspace-tab-debts" hidden={tab !== 'debts'} tabIndex={0}>
          <div className="section-heading"><h2>Personal debts</h2><p>Keep lending and borrowing in their own place.</p></div>
          <Tabs id="debt" label="Debt direction" options={debtTabs} value={direction} onChange={setDirection} />
          {debtTabs.map((option) => (
            <section key={option.value} role="tabpanel" id={`debt-panel-${option.value}`} aria-labelledby={`debt-tab-${option.value}`} hidden={direction !== option.value} tabIndex={0}>
              {direction === option.value && <>
                <div className={`summary-card ${direction}`}>
                  <p>{direction === 'receivable' ? 'Total owed to me' : 'Total I owe'}</p>
                  <strong className="summary-value">{money(totalDebt, currency)}</strong>
                  <span>{visibleDebts.length} outstanding {visibleDebts.length === 1 ? 'debt' : 'debts'}</span>
                </div>
                <div className="record-grid">
                  {visibleDebts.map((debt) => (
                    <article className="record-card" key={debt.id}>
                      <div className="record-heading"><span className="monogram" aria-hidden="true">{debt.person.charAt(0)}</span><div><h3>{debt.person}</h3><p>{debt.purpose}</p></div></div>
                      <dl>
                        <div className="balance"><dt>Outstanding</dt><dd>{money(debt.principal - debt.repaid, currency)}</dd></div>
                        <div><dt>Original amount</dt><dd>{money(debt.principal, currency)}</dd></div>
                        <div><dt>Repaid</dt><dd>{money(debt.repaid, currency)}</dd></div>
                        <div><dt>Due date</dt><dd><time dateTime={debt.due}>{dateLabel(debt.due)}</time></dd></div>
                      </dl>
                    </article>
                  ))}
                </div>
                {visibleDebts.length === 0 && <p className="empty-state">No debts in this currency.</p>}
              </>}
            </section>
          ))}
        </section>

        <section role="tabpanel" id="workspace-panel-business" aria-labelledby="workspace-tab-business" hidden={tab !== 'business'} tabIndex={0}>
          <div className="section-heading"><h2>Business</h2><p>Track the capital you put into each venture.</p></div>
          <div className="summary-card"><p>Total capital contributed</p><strong className="summary-value">{money(contributions, currency)}</strong><span>{visibleBusinesses.length} {visibleBusinesses.length === 1 ? 'business' : 'businesses'} in {currency}</span></div>
          <div className="record-grid">
            {visibleBusinesses.map((business) => (
              <article className="record-card" key={business.id}>
                <div className="record-heading"><span className="monogram" aria-hidden="true">{business.name.charAt(0)}</span><div><h3>{business.name}</h3><p>{business.description}</p></div></div>
                <dl><div><dt>Capital contributed</dt><dd>{money(business.contributed, currency)}</dd></div><div><dt>Capital returned</dt><dd>{money(business.returned, currency)}</dd></div></dl>
              </article>
            ))}
          </div>
          {visibleBusinesses.length === 0 && <p className="empty-state">No businesses in this currency.</p>}
          <p className="panel-note">Contributions are historical amounts, not current valuations or profit.</p>
        </section>

        <section role="tabpanel" id="workspace-panel-activity" aria-labelledby="workspace-tab-activity" hidden={tab !== 'activity'} tabIndex={0}>
          <div className="section-heading"><h2>Recent activity</h2><p>Repayments and business contributions, newest first.</p></div>
          <ul className="activity-list">
            {visibleActivity.map((item) => (
              <li key={item.id}><div><time dateTime={item.date}>{dateLabel(item.date)}</time><h3>{item.title}</h3><p>{item.detail}</p></div><strong>{money(item.amount, currency)}</strong></li>
            ))}
          </ul>
          {visibleActivity.length === 0 && <p className="empty-state">No activity in this currency.</p>}
        </section>
        <footer>Demo workspace · Fictional records from October 2026.<br />Adding records and repayments is coming next.</footer>
      </main>
    </div>
  )
}
export default App
