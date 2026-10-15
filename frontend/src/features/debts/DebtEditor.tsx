import { useState } from 'react'
import type { FormEvent } from 'react'
import { Modal } from '../../components/Modal'
import type { Currency, Debt, Direction } from '../../models/ledger'
import { parseAmount, repaid, validateDebt } from '../../lib/debts'
import { money } from '../../lib/formatters'
export function DebtEditor({ debt, currency, direction, onSave, onClose }: {
  debt?: Debt; currency: Currency; direction: Direction
  onSave: (debt: Debt) => string | null; onClose: () => void
}) {
  const [error, setError] = useState('')
  const [dirty, setDirty] = useState(false)
  const locked = Boolean(debt?.repayments.length)
  const close = () => { if (!dirty || window.confirm('Discard unsaved changes?')) onClose() }
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    const principal = parseAmount(String(form.get('amount')))
    if (principal === null) { setError('Enter a positive amount with at most two decimal places, using a dot and no separators.'); return }
    const next: Debt = {
      id: debt?.id ?? crypto.randomUUID(), person: String(form.get('person')).trim(),
      purpose: String(form.get('purpose')).trim(), principal,
      currency: locked && debt ? debt.currency : form.get('currency') as Currency,
      direction: locked && debt ? debt.direction : form.get('direction') as Direction,
      due: String(form.get('due')), notes: String(form.get('notes')).trim(), repayments: debt?.repayments ?? [],
    }
    const problem = validateDebt(next, debt) ?? onSave(next)
    if (problem) setError(problem)
  }
  return <Modal title={debt ? 'Edit debt' : 'Add debt'} onClose={close}>
    <form className="editor-form" onSubmit={submit} onChange={() => setDirty(true)}>
      <label>Person<input name="person" defaultValue={debt?.person ?? ''} required maxLength={100} autoFocus /></label>
      <label>Purpose<input name="purpose" defaultValue={debt?.purpose ?? ''} maxLength={160} /></label>
      <div className="form-row"><label>Direction<select name="direction" defaultValue={debt?.direction ?? direction} disabled={locked}><option value="receivable">Owed to me</option><option value="payable">I owe</option></select></label><label>Currency<select name="currency" defaultValue={debt?.currency ?? currency} disabled={locked}><option>ZAR</option><option>USD</option></select></label></div>
      {locked && <p className="form-help">Currency and direction are fixed because repayments exist. Already repaid: {money(repaid(debt!), debt!.currency)}.</p>}
      <label>Original amount<input name="amount" inputMode="decimal" defaultValue={debt ? (debt.principal / 100).toFixed(2) : ''} placeholder="1000.00" required maxLength={13} /></label>
      <label>Due date (optional)<input name="due" type="date" defaultValue={debt?.due ?? ''} /></label>
      <label>Notes (optional)<textarea name="notes" defaultValue={debt?.notes ?? ''} maxLength={2000} /></label>
      {error && <p className="form-error" role="alert">{error}</p>}
      <div className="form-actions"><button className="secondary" type="button" onClick={close}>Cancel</button><button className="primary" type="submit">Save debt</button></div>
    </form>
  </Modal>
}
