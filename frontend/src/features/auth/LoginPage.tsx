import { useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { RecoveryPanel } from './RecoveryPanel'
import { PasswordField } from './PasswordField'
import {
  authErrorMessage,
  PASSWORD_MAX_LENGTH,
  PASSWORD_MIN_LENGTH,
  readCredentials,
  registerAccount,
} from './authForm'
import './auth.css'

type Props = {
  onLogin: (username: string, password: string) => Promise<void>
  message: string
}

export function LoginPage({ onLogin, message }: Props) {
  const [register, setRegister] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [forgot, setForgot] = useState(false)
  const lock = useRef(false)

  async function handleRegistration(form: FormData, element: HTMLFormElement) {
    await registerAccount(form)
    element.reset()
    setRegister(false)
    setNotice('Account created. Sign in, then open Account to set up password recovery.')
  }

  async function handleSignIn(form: FormData) {
    const { username, password } = readCredentials(form)
    await onLogin(username, password)
  }

  function switchMode() {
    setRegister((current) => !current)
    setError('')
    setNotice('')
  }

  function openRecovery() {
    setError('')
    setNotice('')
    setForgot(true)
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (lock.current) return

    const element = event.currentTarget
    const form = new FormData(element)
    const registering = register
    lock.current = true
    setBusy(true)
    setError('')
    setNotice('')

    try {
      if (registering) {
        await handleRegistration(form, element)
      } else {
        await handleSignIn(form)
      }
    } catch (problem) {
      setError(authErrorMessage(problem, registering))
    } finally {
      lock.current = false
      setBusy(false)
    }
  }

  if (forgot) {
    return (
      <main className="auth-page">
        <RecoveryPanel mode="reset" onClose={() => setForgot(false)} />
      </main>
    )
  }

  return (
    <main className="auth-page">
      <section className="auth-card" aria-labelledby="auth-heading">
        {!register && (
            <div className="auth-brand">
              <img
                  className="auth-logo"
                  src="/ledgernest-logo1.png"
                  alt="LedgerNest — Personal debts and business capital, in one place."
              />
            </div>
        )}

        <h1 id="auth-heading">
          {register ? 'Create your account' : 'Welcome back'}
        </h1>
        {message && <p role="status">{message}</p>}
        {notice && <p role="status">{notice}</p>}

        <form onSubmit={submit} className="editor-form" aria-busy={busy}>
          <fieldset className="editor-fields" disabled={busy}>
            {register && (
              <>
                <label>
                  Name
                  <input name="firstName" autoComplete="given-name" maxLength={100} required />
                </label>
                <label>
                  Surname
                  <input name="surname" autoComplete="family-name" maxLength={100} required />
                </label>
              </>
            )}

            <label>
              Email, phone number or username
              <input
                name="username"
                type="text"
                autoComplete="username"
                autoCapitalize="none"
                spellCheck={false}
                maxLength={254}
                required
                aria-describedby={register ? 'identifier-help' : undefined}
              />
            </label>
            {register && (
              <p id="identifier-help" className="form-help">
                Phone: include +country code (+27 for South Africa, +263 for Zimbabwe).
                Usernames: 3–30 letters, digits, dots, underscores or hyphens; start with a letter.
              </p>
            )}

            <PasswordField
              key={register ? 'new' : 'current'}
              label="Password"
              name="password"
              autoComplete={register ? 'new-password' : 'current-password'}
              minLength={register ? PASSWORD_MIN_LENGTH : 1}
              maxLength={PASSWORD_MAX_LENGTH}
              describedBy={register ? 'password-help' : undefined}
            />

            {register && (
              <>
                <PasswordField
                  label="Confirm password"
                  name="confirmPassword"
                  autoComplete="new-password"
                  maxLength={PASSWORD_MAX_LENGTH}
                />
                <p id="password-help" className="form-help">
                  Use {PASSWORD_MIN_LENGTH}–{PASSWORD_MAX_LENGTH} characters.
                  Choose a long, unique password. After signing in, open Account
                  to verify a recovery email or phone.
                </p>
              </>
            )}

          </fieldset>

          {error && <p className="form-error" role="alert">{error}</p>}
          <button className="primary" disabled={busy} type="submit">
            {busy ? 'Please wait…' : register ? 'Create account' : 'Sign in'}
          </button>
        </form>

        <button
          type="button"
          className="secondary auth-switch"
          disabled={busy}
          onClick={switchMode}
        >
          {register ? 'Already have an account? Sign in' : 'New here? Create an account'}
        </button>
        <button type="button" className="secondary" disabled={busy} onClick={openRecovery}>
          Forgot password?
        </button>
        <p className="form-help">For now, refreshing this page signs you out.</p>
      </section>
    </main>
  )
}
