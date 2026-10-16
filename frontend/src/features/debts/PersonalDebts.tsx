import { ConvertedAmount } from '../../components/ConvertedAmount'
import { convertedTotal } from '../../lib/currency'
import { Tabs } from '../../components/Tabs'
import type { Currency, Debt, Direction, ExchangeRate } from '../../models/ledger'
import { balance, repaid } from '../../lib/debts'
import { money, dateLabel } from '../../lib/formatters'
const options = [{ value: 'receivable', label: 'Owed to me' }, { value: 'payable', label: 'I owe' }] as const
export function PersonalDebts({ debts, currency, direction, onDirection, onAdd, onEdit, onRepay, onDetails, disabled, rate, id = 'debt' }: {
  id?: string; debts: Debt[]; currency: Currency; direction: Direction; onDirection: (value: Direction) => void
  onAdd: () => void; onEdit: (debt: Debt) => void; onRepay: (debt: Debt) => void; onDetails: (debt: Debt) => void; disabled: boolean; rate?: ExchangeRate
}) {
  const visible = debts.filter((debt) => debt.direction === direction)
  const total = convertedTotal(visible.map((debt) => ({ amount: balance(debt), currency: debt.currency })), currency, rate)
  const active = visible.filter((debt) => balance(debt) > 0).length
  return <>
    <div className="section-toolbar"><div><h2>Personal debts</h2><p className="form-help">Lending, borrowing, and repayments.</p></div><button className="primary" onClick={onAdd} disabled={disabled}>+ Add debt</button></div>
    <Tabs id={id} label="Debt direction" options={options} value={direction} onChange={onDirection} />
    {options.map((option) => <section key={option.value} role="tabpanel" id={`${id}-panel-${option.value}`} aria-labelledby={`${id}-tab-${option.value}`} hidden={direction !== option.value} tabIndex={0}>
      {direction === option.value && <>
        <div className={`summary-card ${direction}`}><p>{direction === 'receivable' ? 'Total owed to me' : 'Total I owe'}</p><strong className="summary-value">{total === null ? 'Exchange rate needed' : money(total, currency)}</strong><span>{visible.some((debt) => debt.currency !== currency) ? 'Estimated total · ' : ''}{active} outstanding · {visible.length - active} settled</span></div>
        <div className="record-grid">{visible.map((debt) => <article className="record-card" key={debt.id}>
          <div className="record-heading"><span className="monogram" aria-hidden="true">{debt.person.charAt(0)}</span><div><h3>{debt.person}</h3><p>{debt.purpose || 'Personal debt'}{balance(debt) === 0 ? ' · Settled' : ''}</p></div></div>
          <dl><div className="balance"><dt>Outstanding</dt><dd>{money(balance(debt), debt.currency)}<ConvertedAmount amount={balance(debt)} from={debt.currency} to={currency} rate={rate} /></dd></div><div><dt>Original amount</dt><dd>{money(debt.principal, debt.currency)}</dd></div><div><dt>Repaid</dt><dd>{money(repaid(debt), debt.currency)}</dd></div><div><dt>Due date</dt><dd>{debt.due ? dateLabel(debt.due) : 'No due date'}</dd></div></dl>
          <div className="card-actions"><button className="secondary" onClick={() => onDetails(debt)} aria-label={`Details for ${debt.person}`}>Details</button><button className="secondary" onClick={() => onEdit(debt)} disabled={disabled} aria-label={`Edit debt for ${debt.person}`}>Edit</button><button className="primary" onClick={() => onRepay(debt)} disabled={disabled || balance(debt) === 0} aria-label={`Record repayment for ${debt.person}`}>Repayment</button></div>
        </article>)}</div>
        {!visible.length && <p className="empty-state">No debts here yet. Add your first debt to get started.</p>}
      </>}
    </section>)}
  </>
}
