import { useState } from 'react'
import type { FormEvent } from 'react'
import { Modal } from '../../components/Modal'
import type { Debt, Repayment } from '../../models/ledger'
import { balance, parseAmount, today, validDate } from '../../lib/debts'
import { money } from '../../lib/formatters'
export function RepaymentEditor({ debt, onSave, onClose }: { debt: Debt; onSave: (repayment: Repayment) => string | null; onClose: () => void }) {
  const [error, setError] = useState('')
  const [dirty, setDirty] = useState(false)
  const close = () => { if (!dirty || window.confirm('Discard unsaved repayment?')) onClose() }
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    const amount = parseAmount(String(form.get('amount')))
    const date = String(form.get('date'))
    if (amount === null || amount > balance(debt)) { setError('Enter a positive amount, with at most two decimal places, no greater than the outstanding balance.'); return }
    if (!validDate(date) || date > today()) { setError('Enter a valid repayment date that is not in the future.'); return }
    const problem = onSave({ id: crypto.randomUUID(), amount, date, notes: String(form.get('notes')).trim() })
    if (problem) setError(problem)
  }
  return <Modal title="Record repayment" onClose={close}><form className="editor-form" onSubmit={submit} onChange={() => setDirty(true)}>
    <p>{debt.person} · {debt.direction === 'receivable' ? 'Payment received' : 'Payment made'}<br />Outstanding: <strong>{money(balance(debt), debt.currency)}</strong></p>
    <label>Amount ({debt.currency})<input name="amount" inputMode="decimal" placeholder="250.00" required maxLength={13} autoFocus /></label>
    <label>Payment date<input name="date" type="date" defaultValue={today()} max={today()} required /></label>
    <label>Notes (optional)<textarea name="notes" maxLength={2000} /></label>
    {error && <p role="alert" className="form-error">{error}</p>}
    <div className="form-actions"><button type="button" className="secondary" onClick={close}>Cancel</button><button type="submit" className="primary">Save repayment</button></div>
  </form></Modal>
}
