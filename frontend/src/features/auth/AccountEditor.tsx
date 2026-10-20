import { DeleteAccountPanel } from './DeleteAccountPanel'
import { PreferencesPanel } from '../preferences/PreferencesPanel'
import { PhoneInput } from '../../components/PhoneInput'
import { canonicalPhone, countryFromPhone, suggestedCountry } from '../../lib/countries'
import type { CountryCode } from '../../lib/countries'
import { useEffect, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { RecoveryPanel } from './RecoveryPanel'
import { request } from '../../services/http'
import { Modal } from '../../components/Modal'
import { authApi } from '../../services/authApi'
import type { User } from '../../services/authApi'
export function AccountEditor({ user, onUpdate, onClose, onDeleted }: { user: User; onUpdate: (user: User) => void; onClose: () => void; onDeleted: () => void }) {
  const [recovery, setRecovery] = useState(false)
  const [recoveryStatus, setRecoveryStatus] = useState('Checking recovery setup…')
  useEffect(() => { void request('/api/v1/auth/recovery/status').then(raw => {
    const configured = raw && typeof raw === 'object' && 'configured' in raw && raw.configured === true
    setRecoveryStatus(configured ? 'A recovery contact is verified.' : 'No verified recovery contact. Set one up before you forget your password.')
  }).catch(() => setRecoveryStatus('Could not check recovery setup.')) }, [recovery])
  const [phoneCountry, setPhoneCountry] = useState<CountryCode>(() => countryFromPhone(user.username) ?? suggestedCountry())
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const locked = useRef(false)
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (locked.current) return
    const form = new FormData(event.currentTarget)
    locked.current = true; setBusy(true); setError('')
    try { onUpdate(await authApi.changeUsername(canonicalPhone(String(form.get('nationalPhone') ?? ''), phoneCountry), String(form.get('currentPassword')))); onClose() }
    catch (problem) { setError((problem instanceof Error ? problem.message : 'Unable to change your sign-in identifier.') + ' If the result is uncertain, close and reopen Account to see the latest identifier.') }
    finally { locked.current = false; setBusy(false) }
  }
  if (recovery) return <Modal title="Account recovery" onClose={onClose}><RecoveryPanel mode="enroll" onClose={() => setRecovery(false)} /></Modal>
  return <Modal title="Your account" onClose={() => { if (!locked.current) onClose() }}>
    <p>{user.firstName} {user.surname}</p><p className="account-identifier">Current sign-in: <strong>{user.username}</strong></p>
    <p role="status">{recoveryStatus}</p>
    <button className="secondary" disabled={busy} onClick={() => setRecovery(true)}>Set up or replace recovery contact</button>
    <PreferencesPanel userId={user.id} username={user.username} />
    <form className="editor-form" onSubmit={submit}><fieldset className="editor-fields" disabled={busy}>
      <PhoneInput country={phoneCountry} onCountryChange={setPhoneCountry} />
      <p className="form-help">Include +country code for a phone number. Changing this does not change your separate verified recovery contact. Your account and financial records stay the same when this changes.</p>
      <label>Current password<input name="currentPassword" type="password" autoComplete="current-password" required maxLength={128} /></label>
    </fieldset>{error && <p role="alert" className="form-error">{error}</p>}
    <button className="primary" disabled={busy} type="submit">{busy ? 'Saving…' : 'Change sign-in identifier'}</button></form>
    <DeleteAccountPanel userId={user.id} onDeleted={onDeleted} />
  </Modal>
}
