import { useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { request } from '../../services/http'

export function DeleteAccountPanel({ userId, onDeleted }: { userId: string; onDeleted: () => void }) {
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const locked = useRef(false)
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (locked.current) return
    const form = new FormData(event.currentTarget)
    if (!window.confirm('Permanently delete your account and all its financial records?')) return
    locked.current = true; setBusy(true); setError('')
    try {
      await request('/api/v1/auth/delete-account', 'POST', { currentPassword: form.get('currentPassword'), confirmation: form.get('confirmation') })
      try { localStorage.removeItem(`ledgernest:preferences:v1:${userId}`) } catch { /* Deletion has already succeeded. */ }
      onDeleted()
    } catch (problem) { setError(problem instanceof Error ? problem.message : 'Unable to delete account.') }
    finally { locked.current = false; setBusy(false) }
  }
  return <section style={{ marginTop: 24, borderTop: '1px solid #ddd', paddingTop: 16 }}>
    <h2>Delete account</h2>
    <p>Permanently delete your profile, debts, repayments, businesses, recovery details and identifier history. This cannot be undone.</p>
    {!open ? <button type="button" onClick={() => setOpen(true)}>Delete my account…</button> :
      <form className="editor-form" onSubmit={submit}>
        <fieldset disabled={busy} className="editor-fields">
          <label>Current password<input name="currentPassword" type="password" autoComplete="current-password" required maxLength={128} /></label>
          <label>Type DELETE to confirm<input name="confirmation" required pattern="DELETE" autoComplete="off" /></label>
          <button type="submit" style={{ background: '#a51d28', color: 'white' }}>{busy ? 'Deleting…' : 'Permanently delete account'}</button>
          <button type="button" onClick={() => setOpen(false)}>Cancel</button>
        </fieldset>
        {error && <p role="alert">{error}</p>}
      </form>}
  </section>
}
