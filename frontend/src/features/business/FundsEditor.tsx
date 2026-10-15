import { useState } from 'react'
import type { FormEvent } from 'react'
import { Modal } from '../../components/Modal'
import type { Business, BusinessTransaction } from '../../models/ledger'
import { parseAmount, today } from '../../lib/debts'
import { validateTransaction } from '../../lib/business'
import { money } from '../../lib/formatters'
export function FundsEditor({ business, kind, onSave, onClose }: { business: Business; kind: BusinessTransaction['kind']; onSave: (item: BusinessTransaction) => string | null; onClose: () => void }) {
  const [error, setError] = useState('')
  const [dirty, setDirty] = useState(false)
  const close = () => { if (!dirty || window.confirm('Discard unsaved transaction?')) onClose() }
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    const amount = parseAmount(String(form.get('amount')))
    if (amount === null) { setError('Enter a positive amount with at most two decimal places.'); return }
    const transaction: BusinessTransaction = { id: crypto.randomUUID(), kind, amount, date: String(form.get('date')), notes: String(form.get('notes')).trim() }
    const problem = validateTransaction(business, transaction) ?? onSave(transaction)
    if (problem) setError(problem)
  }
  return <Modal title={kind === 'contribution' ? 'Add funds' : 'Record capital return'} onClose={close}><form className="editor-form" onSubmit={submit} onChange={() => setDirty(true)}>
    <p><strong>{business.name}</strong><br />Capital still invested: {money(business.contributed - business.returned, business.currency)}</p>
    <label>Amount ({business.currency})<input name="amount" inputMode="decimal" required maxLength={13} autoFocus /></label>
    <label>Transaction date<input name="date" type="date" defaultValue={today()} max={today()} required /></label>
    <label>Notes (optional)<textarea name="notes" maxLength={2000} /></label>
    {kind === 'capital_return' && <p className="form-help">Record returned capital only. Profit distributions need a separate transaction type.</p>}
    {error && <p className="form-error" role="alert">{error}</p>}
    <div className="form-actions"><button className="secondary" type="button" onClick={close}>Cancel</button><button className="primary" type="submit">Save transaction</button></div>
  </form></Modal>
}
