import { useState } from 'react'
import type { FormEvent } from 'react'
import { Modal } from '../../components/Modal'
import type { Business, Currency } from '../../models/ledger'
export function BusinessEditor({ business, currency, onSave, onClose }: { business?: Business; currency: Currency; onSave: (business: Business) => string | null; onClose: () => void }) {
  const [error, setError] = useState('')
  const [dirty, setDirty] = useState(false)
  const close = () => { if (!dirty || window.confirm('Discard unsaved changes?')) onClose() }
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    const name = String(form.get('name')).trim()
    if (!name) { setError('Enter a business name.'); return }
    const next: Business = business ?? { id: crypto.randomUUID(), name, description: '', currency: form.get('currency') as Currency, contributed: 0, returned: 0, transactions: [] }
    const problem = onSave({ ...next, name, description: String(form.get('description')).trim() })
    if (problem) setError(problem)
  }
  return <Modal title={business ? 'Edit business details' : 'Add business'} onClose={close}><form className="editor-form" onSubmit={submit} onChange={() => setDirty(true)}>
    <label>Business name<input name="name" defaultValue={business?.name ?? ''} required maxLength={100} autoFocus /></label>
    <label>Description<textarea name="description" defaultValue={business?.description ?? ''} maxLength={500} /></label>
    <label>Business currency<select name="currency" defaultValue={business?.currency ?? currency} disabled={Boolean(business)}><option>ZAR</option><option>USD</option></select></label>
    <p className="form-help">Contributions and capital returns are recorded in the business currency. The display currency converts totals without changing these records.</p>
    {error && <p role="alert" className="form-error">{error}</p>}
    <div className="form-actions"><button type="button" className="secondary" onClick={close}>Cancel</button><button className="primary" type="submit">Save business</button></div>
  </form></Modal>
}
