import { useEffect, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { RecoveryPanel } from './RecoveryPanel'
import { request } from '../../services/http'
import { Modal } from '../../components/Modal'
import { authApi } from '../../services/authApi'
import type { User } from '../../services/authApi'
export function AccountEditor({ user, onUpdate, onClose }: { user: User; onUpdate: (user: User) => void; onClose: () => void }) {
  const [recovery, setRecovery] = useState(false)
  const [recoveryStatus, setRecoveryStatus] = useState('Checking recovery setup…')
  useEffect(() => { void request('/api/v1/auth/recovery/status').then(raw => {
    const configured = raw && typeof raw === 'object' && 'configured' in raw && raw.configured === true
    setRecoveryStatus(configured ? 'A recovery contact is verified.' : 'No verified recovery contact. Set one up before you forget your password.')
  }).catch(() => setRecoveryStatus('Could not check recovery setup.')) }, [recovery])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const locked = useRef(false)
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (locked.current) return
    const form = new FormData(event.currentTarget)
    locked.current = true; setBusy(true); setError('')
    try { onUpdate(await authApi.changeUsername(String(form.get('username')).trim(), String(form.get('currentPassword')))); onClose() }
    catch (problem) { setError((problem instanceof Error ? problem.message : 'Unable to change your sign-in identifier.') + ' If the result is uncertain, close and reopen Account to see the latest identifier.') }
    finally { locked.current = false; setBusy(false) }
  }
  if (recovery) return <Modal title="Account recovery" onClose={onClose}><RecoveryPanel mode="enroll" onClose={() => setRecovery(false)} /></Modal>
  return <Modal title="Your account" onClose={() => { if (!locked.current) onClose() }}>
    <p>{user.firstName} {user.surname}</p><p className="account-identifier">Current sign-in: <strong>{user.username}</strong></p>
    <p role="status">{recoveryStatus}</p>
    <button className="secondary" disabled={busy} onClick={() => setRecovery(true)}>Set up or replace recovery contact</button>
    <form className="editor-form" onSubmit={submit}><fieldset className="editor-fields" disabled={busy}>
      <label>New email, phone number or username<input name="username" defaultValue={user.username} autoComplete="username" autoCapitalize="none" spellCheck={false} required maxLength={254} /></label>
      <p className="form-help">Include +country code for a phone number. Changing this does not change your separate verified recovery contact. Your account and financial records stay the same when this changes.</p>
      <label>Current password<input name="currentPassword" type="password" autoComplete="current-password" required maxLength={128} /></label>
    </fieldset>{error && <p role="alert" className="form-error">{error}</p>}
    <button className="primary" disabled={busy} type="submit">{busy ? 'Saving…' : 'Change sign-in identifier'}</button></form>
  </Modal>
}
