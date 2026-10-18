import { useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { authApi } from '../../services/authApi'
import type { RecoveryPurpose } from '../../services/authApi'
import { PasswordField } from './PasswordField'

type Challenge = { id: string; purpose: RecoveryPurpose; secret?: string }
type Props = {
  mode: RecoveryPurpose
  initial?: Challenge | null
  onClose: () => void
}

function field(form: FormData, name: string): string {
  const value = form.get(name)
  return typeof value === 'string' ? value : ''
}

// Existing email links still work if email delivery is enabled separately.
// Consume on initial application mount, then remove the secret from the address bar.
export function takeRecoveryLink(): Challenge | null {
  const params = new URLSearchParams(window.location.hash.slice(1))
  if (!params.has('recovery')) return null
  const id = params.get('recovery') ?? ''
  const secret = params.get('secret') ?? ''
  const purpose = params.get('purpose')
  window.history.replaceState(null, '', window.location.pathname + window.location.search)
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id) ||
      !secret || (purpose !== 'enroll' && purpose !== 'reset')) return null
  return { id, secret, purpose }
}

export function RecoveryPanel({ mode, initial, onClose }: Props) {
  const [challenge, setChallenge] = useState<Challenge | null>(initial ?? null)
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState('')
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)
  const lock = useRef(false)
  const purpose = challenge?.purpose ?? mode

  async function startChallenge(form: FormData) {
    const response = mode === 'enroll'
      ? await authApi.enrollRecovery(field(form, 'target').trim(), field(form, 'currentPassword'))
      : await authApi.startSmsRecovery(field(form, 'username').trim())
    setNotice(response.message)
    setChallenge({ id: response.id, purpose: mode })
  }

  async function finishChallenge(form: FormData, current: Challenge) {
    const password = field(form, 'newPassword')
    if (current.purpose === 'reset' && password !== field(form, 'confirmPassword')) {
      throw new Error('Passwords do not match.')
    }
    const response = await authApi.finishRecovery(
      current.id,
      current.secret ?? field(form, 'code').trim(),
      current.purpose === 'reset' ? password : undefined,
    )
    setNotice(response.message)
    setDone(true)
    setChallenge(null)
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (lock.current) return
    const element = event.currentTarget
    const form = new FormData(element)
    lock.current = true
    setBusy(true)
    setError('')
    try {
      if (challenge) await finishChallenge(form, challenge)
      else await startChallenge(form)
      element.reset()
    } catch (problem) {
      setError(problem instanceof Error ? problem.message : 'Recovery could not be completed.')
    } finally {
      lock.current = false
      setBusy(false)
    }
  }

  function startAgain() {
    setChallenge(null)
    setNotice('')
    setError('')
  }

  return (
    <section className="auth-card" aria-labelledby="recovery-heading">
      <h2 id="recovery-heading">
        {purpose === 'enroll' ? 'Set up SMS recovery' : 'Reset your password'}
      </h2>
      {!done && (
        <p>
          {challenge?.secret
            ? 'Confirm this recovery link below.'
            : purpose === 'enroll'
              ? 'Verify a phone number you control so you can recover your account later.'
              : 'We will send a code to the recovery phone you previously verified in Account.'}
        </p>
      )}

      {!done && (
        <form
          key={challenge ? 'confirm' : 'request'}
          className="editor-form"
          onSubmit={submit}
          aria-busy={busy}
        >
          <fieldset className="editor-fields" disabled={busy}>
            {!challenge && (mode === 'enroll' ? (
              <>
                <label>
                  Recovery phone number
                  <input
                    name="target" type="tel" autoComplete="tel"
                    placeholder="+27… or +263…" maxLength={40}
                    aria-describedby="recovery-phone-help" required
                  />
                </label>
                <p id="recovery-phone-help" className="form-help">
                  Include the country code. This number is verified before it can reset your password.
                </p>
                <PasswordField
                  label="Current password" name="currentPassword"
                  autoComplete="current-password" maxLength={128}
                />
              </>
            ) : (
              <label>
                Sign-in email, phone or username
                <input
                  name="username" autoComplete="username" autoCapitalize="none"
                  spellCheck={false} maxLength={254} required
                />
              </label>
            ))}

            {challenge && !challenge.secret && (
              <label>
                SMS code
                <input
                  name="code" type="text" inputMode="numeric"
                  autoComplete="one-time-code" pattern="[0-9]{4,10}"
                  minLength={4} maxLength={10} required
                />
              </label>
            )}

            {challenge?.purpose === 'reset' && (
              <>
                <PasswordField
                  label="New password" name="newPassword" autoComplete="new-password"
                  minLength={15} maxLength={128} describedBy="recovery-password-help"
                />
                <PasswordField
                  label="Confirm password" name="confirmPassword"
                  autoComplete="new-password" minLength={15} maxLength={128}
                />
                <p id="recovery-password-help" className="form-help">
                  Use 15–128 characters and choose a unique password.
                </p>
              </>
            )}
          </fieldset>
          <button className="primary" disabled={busy} type="submit">
            {busy ? 'Please wait…' : !challenge ? 'Send SMS code'
              : challenge.purpose === 'enroll' ? 'Verify recovery contact' : 'Reset password'}
          </button>
        </form>
      )}
      {notice && <p role="status">{notice}</p>}
      {error && <p className="form-error" role="alert">{error}</p>}
      {challenge && !done && (
        <button type="button" className="secondary" disabled={busy} onClick={startAgain}>
          Start again
        </button>
      )}
      <button type="button" className="secondary" disabled={busy} onClick={onClose}>
        {done ? 'Continue' : 'Back'}
      </button>
    </section>
  )
}
