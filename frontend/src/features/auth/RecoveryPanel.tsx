import { useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { request } from '../../services/http'

type Challenge = { id: string; purpose: 'enroll' | 'reset'; secret?: string }
function result(value: unknown): { id: string; message: string } {
  if (!value || typeof value !== 'object') throw new Error('Invalid recovery response.')
  const v = value as Record<string, unknown>
  if (typeof v.id !== 'string' || typeof v.message !== 'string') throw new Error('Invalid recovery response.')
  return { id: v.id, message: v.message }
}
// Read once on initial application mount; immediately remove secrets from the address bar.
export function takeRecoveryLink(): Challenge | null {
  const params = new URLSearchParams(window.location.hash.slice(1))
  if (!params.has('recovery')) return null
  const id = params.get('recovery') ?? '', secret = params.get('secret') ?? ''
  const purpose = params.get('purpose')
  window.history.replaceState(null, '', window.location.pathname + window.location.search)
  if (!/^[0-9a-f-]{36}$/i.test(id) || !secret || !['enroll', 'reset'].includes(purpose ?? '')) return null
  return { id, secret, purpose: purpose as 'enroll' | 'reset' }
}
export function RecoveryPanel({ mode, initial, onClose }: { mode: 'enroll' | 'reset'; initial?: Challenge | null; onClose: () => void }) {
  const [challenge, setChallenge] = useState<Challenge | null>(initial ?? null)
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState('')
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)
  const [channel, setChannel] = useState('email')
  const lock = useRef(false)
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (lock.current) return
    const form = new FormData(event.currentTarget)
    lock.current = true; setBusy(true); setError('')
    try {
      if (challenge) {
        const password = String(form.get('newPassword') ?? '')
        if (challenge.purpose === 'reset' && password !== String(form.get('confirmPassword'))) throw new Error('Passwords do not match.')
        const raw = await request('/api/v1/auth/recovery/finish', 'POST', {
          id: challenge.id, secret: challenge.secret ?? String(form.get('code') ?? ''),
          ...(challenge.purpose === 'reset' ? { newPassword: password } : {}),
        })
        if (!raw || typeof raw !== 'object' || !('message' in raw) || typeof raw.message !== 'string') throw new Error('Invalid recovery response.')
        setNotice(raw.message); setDone(true); setChallenge(null)
      } else {
        const raw = mode === 'enroll'
          ? await request('/api/v1/auth/recovery/enroll', 'POST', { target: String(form.get('target')).trim(), currentPassword: String(form.get('currentPassword')) })
          : await request('/api/v1/auth/recovery/start', 'POST', { username: String(form.get('username')).trim(), channel })
        const response = result(raw)
        setNotice(response.message)
        const sms = mode === 'enroll' ? String(form.get('target')).trim().startsWith('+') : channel === 'sms'
        if (sms) setChallenge({ id: response.id, purpose: mode })
      }
    } catch (problem) { setError(problem instanceof Error ? problem.message : 'Recovery could not be completed.') }
    finally { lock.current = false; setBusy(false) }
  }
  return <section className="auth-card" aria-label="Account recovery">
    <h2>{mode === 'enroll' ? 'Set up account recovery' : 'Reset your password'}</h2>
    <p>{mode === 'enroll' ? 'Verify an email or phone you control. It can recover your account even if your login is a username.' : 'Use a recovery contact you previously verified in Account. Existing unverified contact details cannot reset a password.'}</p>
    {!done && <form className="editor-form" onSubmit={submit}>
      <fieldset className="editor-fields" disabled={busy}>
        {!challenge && (mode === 'enroll' ? <>
          <label>Recovery email or international phone<input name="target" required maxLength={254} autoCapitalize="none" spellCheck={false} /></label>
          <label>Current password<input name="currentPassword" type="password" required maxLength={128} autoComplete="current-password" /></label>
        </> : <>
          <label>Sign-in email, phone or username<input name="username" required maxLength={254} autoComplete="username" autoCapitalize="none" spellCheck={false} /></label>
          <label>Verified recovery method<select value={channel} onChange={e => setChannel(e.target.value)}><option value="email">Email link</option><option value="sms">SMS code</option></select></label>
        </>)}
        {challenge && !challenge.secret && <label>SMS code<input name="code" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{4,10}" required /></label>}
        {challenge?.purpose === 'reset' && <>
          <label>New password<input name="newPassword" type="password" minLength={15} maxLength={128} required autoComplete="new-password" /></label>
          <label>Confirm password<input name="confirmPassword" type="password" minLength={15} maxLength={128} required autoComplete="new-password" /></label>
        </>}
      </fieldset>
      <button className="primary" disabled={busy}>{busy ? 'Please wait…' : challenge ? 'Confirm' : 'Send verification'}</button>
    </form>}
    {notice && <p role="status">{notice}</p>}
    {error && <p className="form-error" role="alert">{error}</p>}
    <button className="secondary" disabled={busy} onClick={onClose}>{done ? 'Continue' : 'Back'}</button>
  </section>
}
