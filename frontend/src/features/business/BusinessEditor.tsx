import { useRef, useState } from 'react'
import { ApiError } from '../../services/http'
import type { FormEvent } from 'react'
import { Modal } from '../../components/Modal'
import type { Business, Currency } from '../../models/ledger'
export function BusinessEditor({ business, currency, onSave, onClose }: { business?: Business; currency: Currency; onSave: (business: Business) => Promise<string | null>; onClose: () => void }) {
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [uncertain, setUncertain] = useState(false)
  const submitting = useRef(false)
  const locked = Boolean(business?.transactions?.length)
  const [dirty, setDirty] = useState(false)
  const close = () => { if (!submitting.current && (!dirty || window.confirm('Discard unsaved changes?'))) onClose() }
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (submitting.current || uncertain) return
    const form = new FormData(event.currentTarget)
    const name = String(form.get('name')).trim()
    if (!name) { setError('Enter a business name.'); return }
    const next: Business = business ?? { id: crypto.randomUUID(), name, description: '', currency: form.get('currency') as Currency, contributed: 0, returned: 0, transactions: [] }
    submitting.current = true
    setBusy(true)
    setError('')
    try {
      const problem = await onSave({ ...next, name, description: String(form.get('description')).trim(),
        currency: locked && business ? business.currency : form.get('currency') as Currency })
      if (problem) setError(problem)
    } catch (problem) {
      const ambiguous = !business && (!(problem instanceof ApiError) || problem.status === 0 || problem.status >= 500)
      setUncertain(ambiguous)
      setError((problem instanceof Error ? problem.message : 'Could not save business.') +
        (ambiguous ? ' This business may already have been saved. Close this form and refresh businesses before adding it again.' : ''))
    } finally { submitting.current = false; setBusy(false) }
  }
  return <Modal title={business ? 'Edit business details' : 'Add business'} onClose={close}><form className="editor-form" onSubmit={submit} onChange={() => setDirty(true)}>
    <fieldset className="editor-fields" disabled={busy || uncertain}>
    <label>Business name<input name="name" defaultValue={business?.name ?? ''} required maxLength={100} autoFocus /></label>
    <label>Description<textarea name="description" defaultValue={business?.description ?? ''} maxLength={2000} /></label>
    <label>Business currency<select name="currency" defaultValue={business?.currency ?? currency} disabled={locked}><option>ZAR</option><option>USD</option></select></label>
    <p className="form-help">Contributions and capital returns are recorded in the business currency. The display currency converts totals without changing these records.</p>
    </fieldset>
    {locked && <p className="form-help">Currency is fixed because this business has recorded transactions.</p>}
    {error && <p role="alert" className="form-error">{error}</p>}
    <div className="form-actions"><button type="button" className="secondary" onClick={close} disabled={busy}>Cancel</button><button className="primary" type="submit" disabled={busy || uncertain}>{busy ? 'Saving…' : 'Save business'}</button></div>
  </form></Modal>
}
