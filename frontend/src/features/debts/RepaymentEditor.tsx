import { useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { Modal } from '../../components/Modal'
import type { Debt, Repayment } from '../../models/ledger'
import { balance, parseAmount, today, validDate } from '../../lib/debts'
import { ApiError } from '../../services/debtsApi'
import { money } from '../../lib/formatters'
export function RepaymentEditor({ debt, onSave, onClose }: { debt: Debt; onSave: (repayment: Repayment) => Promise<string | null>; onClose: () => void }) {
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [attempt, setAttempt] = useState<Repayment | null>(null)
  const submitting = useRef(false)
  const [dirty, setDirty] = useState(false)
  const close = () => { if (!submitting.current && (!dirty || window.confirm('Discard unsaved repayment?'))) onClose() }
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (submitting.current) return
    const form = new FormData(event.currentTarget)
    const amount = attempt?.amount ?? parseAmount(String(form.get('amount')))
    const date = attempt?.date ?? String(form.get('date'))
    if (amount === null || amount > balance(debt)) { setError('Enter a positive amount, with at most two decimal places, no greater than the outstanding balance.'); return }
    if (!validDate(date) || date > today()) { setError('Enter a valid repayment date that is not in the future.'); return }
    const payment = attempt ?? { id: crypto.randomUUID(), amount, date, notes: String(form.get('notes')).trim() }
    setAttempt(payment)
    submitting.current = true
    setBusy(true)
    setError('')
    try {
      const problem = await onSave(payment)
      if (problem) setError(problem)
    } catch (problem) {
      if (problem instanceof ApiError && problem.status === 400) setAttempt(null)
      setError(problem instanceof Error ? problem.message : 'Could not save repayment.')
    } finally { submitting.current = false; setBusy(false) }
  }
  return <Modal title="Record repayment" onClose={close}><form className="editor-form" onSubmit={submit} onChange={() => setDirty(true)}>
    <p>{debt.person} · {debt.direction === 'receivable' ? 'Payment received' : 'Payment made'}<br />Outstanding: <strong>{money(balance(debt), debt.currency)}</strong></p>
    <fieldset className="editor-fields" disabled={busy || attempt !== null}>
    <label>Amount ({debt.currency})<input name="amount" inputMode="decimal" placeholder="250.00" required maxLength={13} autoFocus /></label>
    <label>Payment date<input name="date" type="date" defaultValue={today()} max={today()} required /></label>
    <label>Notes (optional)<textarea name="notes" maxLength={2000} /></label>
    </fieldset>
    {attempt && !busy && error && <p className="form-help">Retry sends the same repayment ID and details, preventing a duplicate payment. If you close this form, refresh and check repayment history before starting another payment.</p>}
    {error && <p role="alert" className="form-error">{error}</p>}
    <div className="form-actions"><button type="button" className="secondary" onClick={close} disabled={busy}>Cancel</button><button type="submit" className="primary" disabled={busy}>{busy ? 'Saving…' : attempt ? 'Retry repayment' : 'Save repayment'}</button></div>
  </form></Modal>
}
