import { useState } from 'react'
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

function App() {
  const [currency, setCurrency] = useState<Currency>('ZAR')
  const [filter, setFilter] = useState<'all' | Direction>('all')
  const currencyDebts = debts.filter((debt) => debt.currency === currency)
  const visibleDebts = currencyDebts.filter((debt) => filter === 'all' || debt.direction === filter)
  const currencyBusinesses = businesses.filter((business) => business.currency === currency)
  const outstanding = (direction: Direction) => currencyDebts.filter((debt) => debt.direction === direction).reduce((total, debt) => total + debt.principal - debt.repaid, 0)
  const contributions = currencyBusinesses.reduce((total, business) => total + business.contributed, 0)

  return (
    <div className="app-shell">
      <a className="skip-link" href="#main">Skip to content</a>
      <aside className="sidebar">
        <a className="brand" href="#main"><span className="brand-mark" aria-hidden="true">L</span>LedgerNest</a>
        <p className="sidebar-label">YOUR WORKSPACE</p>
        <nav aria-label="Main navigation">
          <a href="#overview">Overview <span aria-hidden="true">↗</span></a>
          <a href="#debts">Personal debts</a>
          <a href="#businesses">Businesses</a>
          <a href="#activity">Recent activity</a>
        </nav>
        <div className="sidebar-note"><span className="status-dot" /> A little more clarity.<p>Keep track of what’s owed and what you’re building.</p></div>
      </aside>
      <main id="main">
        <header className="topbar"><span>Workspace / <strong>Overview</strong></span><span className="demo-badge">Demo workspace</span></header>
        <section id="overview" aria-labelledby="overview-title">
          <div className="page-heading"><div><p className="eyebrow">EVERY AMOUNT, ACCOUNTED FOR</p><h1 id="overview-title">Your money, in perspective.</h1><p>A clear view of your debts and business contributions.</p></div>
            <label className="currency-control">Display currency<select value={currency} onChange={(event) => setCurrency(event.target.value as Currency)}><option value="ZAR">ZAR · South African rand</option><option value="USD">USD · US dollar</option></select></label>
          </div>
          <div className="demo-notice"><strong>Preview with sample data</strong><span>Fictional records dated October 2026. No real accounts are connected.</span></div>
          <div className="summary-grid" aria-live="polite">
            <article className="summary-card incoming"><span className="card-symbol" aria-hidden="true">↙</span><h2>Owed to me</h2><p className="summary-value">{money(outstanding('receivable'), currency)}</p><p>Outstanding personal loans</p></article>
            <article className="summary-card"><span className="card-symbol warm" aria-hidden="true">↗</span><h2>I owe</h2><p className="summary-value">{money(outstanding('payable'), currency)}</p><p>Outstanding personal borrowing</p></article>
            <article className="summary-card"><span className="card-symbol" aria-hidden="true">▥</span><h2>Business contributions</h2><p className="summary-value">{money(contributions, currency)}</p><p>Total capital contributed · {currencyBusinesses.length} businesses</p></article>
          </div>
          <p className="currency-note">Showing {currency} records only. Currencies are never combined or converted.</p>
        </section>
        <section id="debts" className="panel" aria-labelledby="debts-title">
          <div className="section-heading"><div><p className="eyebrow">PEOPLE & PAYMENTS</p><h2 id="debts-title">Personal debts</h2></div><div className="filters" role="group" aria-label="Filter debts">{(['all', 'receivable', 'payable'] as const).map((value) => <button key={value} type="button" aria-pressed={filter === value} onClick={() => setFilter(value)}>{value === 'all' ? 'All debts' : value === 'receivable' ? 'Owed to me' : 'I owe'}</button>)}</div></div>
          <div className="table-scroll" role="region" aria-label="Personal debts table" tabIndex={0}><table><caption className="sr-only">Sample personal debts in {currency}</caption><thead><tr><th scope="col">Person / purpose</th><th scope="col">Direction</th><th scope="col">Due date</th><th scope="col" className="amount">Outstanding</th></tr></thead><tbody>{visibleDebts.map((debt) => <tr key={debt.id}><td><strong>{debt.person}</strong><span className="cell-detail">{debt.purpose}</span></td><td><span className={`badge ${debt.direction}`}>{debt.direction === 'receivable' ? 'Owed to me' : 'I owe'}</span></td><td>{dateLabel(debt.due)}</td><td className="amount"><strong>{money(debt.principal - debt.repaid, currency)}</strong><span className="cell-detail">{money(debt.repaid, currency)} repaid</span></td></tr>)}</tbody></table></div>
          {visibleDebts.length === 0 && <p className="empty-state">No sample debts match this filter.</p>}
        </section>
        <div className="lower-grid">
          <section id="businesses" className="panel" aria-labelledby="businesses-title"><div className="section-heading"><div><p className="eyebrow">WHAT YOU’RE BUILDING</p><h2 id="businesses-title">Business contributions</h2></div></div><div className="business-list">{currencyBusinesses.map((business) => <article className="business-card" key={business.id}><div className="business-title"><span className="business-monogram" aria-hidden="true">{business.name.charAt(0)}</span><div><h3>{business.name}</h3><p>{business.description}</p></div></div><dl><div><dt>Capital contributed</dt><dd>{money(business.contributed, currency)}</dd></div><div><dt>Capital returned</dt><dd>{money(business.returned, currency)}</dd></div></dl></article>)}</div><p className="panel-note">Contributions are historical amounts, not current business valuations or profit.</p></section>
          <section id="activity" className="panel" aria-labelledby="activity-title"><div className="section-heading"><div><p className="eyebrow">THE LATEST MOVEMENTS</p><h2 id="activity-title">Recent activity</h2></div></div><ul className="activity-list">{activity.filter((item) => item.currency === currency).map((item) => <li key={item.id}><div><h3>{item.title}</h3><p>{item.detail}</p><time dateTime={item.date}>{dateLabel(item.date)}</time></div><strong>{money(item.amount, currency)}</strong></li>)}</ul></section>
        </div>
        <footer>LedgerNest <span>Personal debts. Business ambitions. One place.</span></footer>
      </main>
    </div>
  )
}
export default App
