import type { Business, ExchangeRate } from '../../models/ledger'
import { money } from '../../lib/formatters'
import { convertedTotal } from '../../lib/currency'
import { ConvertedAmount } from '../../components/ConvertedAmount'
export function BusinessSection({ businesses, currency, rate, disabled, onAdd, onEdit, onFunds, onReturn, onHistory }: {
  businesses: Business[]; currency: string; rate?: ExchangeRate; disabled: boolean
  onAdd: () => void; onEdit: (business: Business) => void; onFunds: (business: Business) => void; onReturn: (business: Business) => void; onHistory: (business: Business) => void
}) {
  const contributed = convertedTotal(businesses.map((b) => ({ amount: b.contributed, currency: b.currency })), currency, rate)
  return <>
    <div className="section-toolbar"><div><h2>Business</h2><p className="form-help">Contributions and returned capital.</p></div><button className="primary" disabled={disabled} onClick={onAdd}>+ Add business</button></div>
    <div className="summary-card"><p>Total capital contributed</p><strong className="summary-value">{contributed === null ? 'Exchange rate needed' : money(contributed, currency)}</strong><span>{businesses.some((b) => b.currency !== currency) ? 'Estimated total · ' : ''}{businesses.length} businesses</span></div>
    <div className="record-grid">{businesses.map((business) => <article className="record-card" key={business.id}>
      <div className="record-heading"><span className="monogram" aria-hidden="true">{business.name.charAt(0)}</span><div><h3>{business.name}</h3><p>{business.description || business.currency}</p></div></div>
      <dl><div><dt>Capital contributed</dt><dd>{money(business.contributed, business.currency)}<ConvertedAmount amount={business.contributed} from={business.currency} to={currency} rate={rate} /></dd></div><div><dt>Capital returned</dt><dd>{money(business.returned, business.currency)}<ConvertedAmount amount={business.returned} from={business.currency} to={currency} rate={rate} /></dd></div><div className="balance"><dt>Capital still invested</dt><dd>{money(business.contributed - business.returned, business.currency)}</dd></div></dl>
      <div className="card-actions"><button className="primary" disabled={disabled} onClick={() => onFunds(business)} aria-label={`Add funds to ${business.name}`}>Add funds</button><button className="secondary" disabled={disabled || business.contributed <= business.returned} onClick={() => onReturn(business)} aria-label={`Record capital return for ${business.name}`}>Capital return</button><button className="secondary" onClick={() => onHistory(business)} aria-label={`History for ${business.name}`}>History</button><button className="secondary" disabled={disabled} onClick={() => onEdit(business)} aria-label={`Edit ${business.name}`}>Edit</button></div>
    </article>)}</div>
    {!businesses.length && <p className="empty-state">Add your first business, then record the funds you put into it.</p>}
    <p className="panel-note">Capital contributed is not current business value or profit. These entries track funds; they do not transfer money.</p>
  </>
}
