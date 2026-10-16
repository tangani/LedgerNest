import { useRef, useState } from 'react'
import { ApiError } from '../../services/http'
import type { FormEvent } from 'react'
import { Modal } from '../../components/Modal'
import type { Business, BusinessTransaction } from '../../models/ledger'
import { parseAmount, today } from '../../lib/debts'
import { validateTransaction } from '../../lib/business'
import { money } from '../../lib/formatters'
export function FundsEditor({ business, kind, onSave, onClose }: { business: Business; kind: BusinessTransaction['kind']; onSave: (item: BusinessTransaction) => Promise<string | null>; onClose: () => void }) {
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [attempt, setAttempt] = useState<BusinessTransaction | null>(null)
  const submitting = useRef(false)
  const [dirty, setDirty] = useState(false)
  const close = () => { if (!submitting.current && (!dirty || window.confirm('Discard unsaved transaction?'))) onClose() }
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (submitting.current) return
    const form = new FormData(event.currentTarget)
    const amount = attempt?.amount ?? parseAmount(String(form.get('amount')))
    if (amount === null) { setError('Enter a positive amount with at most two decimal places.'); return }
    const transaction: BusinessTransaction = attempt ?? { id: crypto.randomUUID(), kind, amount, date: String(form.get('date')), notes: String(form.get('notes')).trim() }
    const invalid = validateTransaction(business, transaction)
    if (invalid) { setError(invalid); return }
    setAttempt(transaction)
    submitting.current = true
    setBusy(true)
    setError('')
    try {
      const problem = await onSave(transaction)
      if (problem) setError(problem)
    } catch (problem) {
      if (problem instanceof ApiError && problem.status === 400) setAttempt(null)
      setError(problem instanceof Error ? problem.message : 'Could not save transaction.')
    } finally { submitting.current = false; setBusy(false) }
  }
  return <Modal title={kind === 'contribution' ? 'Add funds' : 'Record capital return'} onClose={close}><form className="editor-form" onSubmit={submit} onChange={() => setDirty(true)}>
    <p><strong>{business.name}</strong><br />Capital still invested: {money(business.contributed - business.returned, business.currency)}</p>
    <fieldset className="editor-fields" disabled={busy || attempt !== null}>
    <label>Amount ({business.currency})<input name="amount" inputMode="decimal" required maxLength={13} autoFocus /></label>
    <label>Transaction date<input name="date" type="date" defaultValue={today()} max={today()} required /></label>
    <label>Notes (optional)<textarea name="notes" maxLength={2000} /></label>
    </fieldset>
    {kind === 'capital_return' && <p className="form-help">Record returned capital only. Profit distributions need a separate transaction type.</p>}
    {attempt && !busy && error && <p className="form-help">Retry uses the same transaction ID and details to prevent duplicates. If you close this form, refresh and check history before recording another transaction.</p>}
    {error && <p className="form-error" role="alert">{error}</p>}
    <div className="form-actions"><button className="secondary" type="button" onClick={close} disabled={busy}>Cancel</button><button className="primary" type="submit" disabled={busy}>{busy ? 'Saving…' : attempt ? 'Retry transaction' : 'Save transaction'}</button></div>
  </form></Modal>
}
