import { useState } from 'react'
import type { FormEvent } from 'react'
import type { ExchangeRate } from '../models/ledger'
import { parseRate, RATE_SCALE } from '../lib/currency'
import { Modal } from './Modal'
export function RateEditor({ rate, onSave, onClose }: { rate?: ExchangeRate; onSave: (rate: ExchangeRate) => string | null; onClose: () => void }) {
  const [error, setError] = useState('')
  const [dirty, setDirty] = useState(false)
  const close = () => { if (!dirty || window.confirm('Discard unsaved exchange rate?')) onClose() }
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const value = parseRate(String(new FormData(event.currentTarget).get('rate')))
    if (value === null) { setError('Enter a rate greater than zero and no more than 1,000, using up to six decimal places.'); return }
    const problem = onSave({ zarPerUsdMicros: value, updatedAt: new Date().toISOString() })
    if (problem) setError(problem)
  }
  return <Modal title="Exchange rate" onClose={close}><form className="editor-form" onSubmit={submit} onChange={() => setDirty(true)}>
    <p>Use one rate to compare all your records. This is a manual rate, not a live quote.</p>
    <label>1 USD equals how many ZAR?<input name="rate" inputMode="decimal" defaultValue={rate ? String(rate.zarPerUsdMicros / RATE_SCALE) : ''} placeholder="Enter your USD/ZAR rate" required autoFocus /></label>
    <p className="form-help">Conversions are estimates using this saved rate, including historical activity. They do not include fees or change the original debt, contribution, or repayment currency.</p>
    {error && <p className="form-error" role="alert">{error}</p>}
    <div className="form-actions"><button className="secondary" type="button" onClick={close}>Cancel</button><button className="primary" type="submit">Save rate</button></div>
  </form></Modal>
}
