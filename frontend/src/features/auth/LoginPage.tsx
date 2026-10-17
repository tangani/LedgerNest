import { useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { authApi } from '../../services/authApi'
import { ApiError } from '../../services/http'
import './auth.css'
import { RecoveryPanel } from './RecoveryPanel'
export function LoginPage({ onLogin, message }: { onLogin: (username: string, password: string) => Promise<void>; message: string }) {
  const [register, setRegister] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [forgot, setForgot] = useState(false)
  const lock = useRef(false)
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (lock.current) return
    const formElement = event.currentTarget
    const form = new FormData(formElement)
    const username = String(form.get('username')).trim()
    const password = String(form.get('password'))
    lock.current = true; setBusy(true); setError(''); setNotice('')
    try {
      if (register) {
        await authApi.register({ firstName: String(form.get('firstName')).trim(), surname: String(form.get('surname')).trim(), username, password })
        setRegister(false); formElement.reset()
        setNotice('Account created. Sign in, then open Account to set up password recovery.')
      } else await onLogin(username, password)
    } catch (problem) {
      setError(problem instanceof ApiError && problem.status === 401
        ? 'Unable to sign in. Check your identifier and password, or wait a minute if you have tried several times.'
        : problem instanceof ApiError && problem.status === 0 && register
          ? 'The response was interrupted. Your account may have been created; try signing in before registering again.'
          : problem instanceof Error ? problem.message : 'Could not complete the request.')
    } finally { lock.current = false; setBusy(false) }
  }
  if (forgot) return <main className="auth-page"><RecoveryPanel mode="reset" onClose={() => setForgot(false)} /></main>
  return <main className="auth-page"><section className="auth-card" aria-labelledby="auth-heading">
    <p className="eyebrow">LEDGERNEST</p><h1 id="auth-heading">{register ? 'Create your account' : 'Welcome back'}</h1>
    <p>Personal debts and business capital, in one place.</p>
    {message && <p role="status">{message}</p>}{notice && <p role="status">{notice}</p>}
    <form onSubmit={submit} className="editor-form">
      <fieldset className="editor-fields" disabled={busy}>
        {register && <><label>Name<input name="firstName" autoComplete="given-name" maxLength={100} required /></label><label>Surname<input name="surname" autoComplete="family-name" maxLength={100} required /></label></>}
        <label>Email, phone number or username<input name="username" type="text" autoComplete="username" autoCapitalize="none" spellCheck={false} maxLength={254} required aria-describedby="identifier-help" /></label>
        <p id="identifier-help" className="form-help">Phone: include +country code (+27 for South Africa, +263 for Zimbabwe). Usernames: 3–30 letters, digits, dots, underscores or hyphens; start with a letter.</p>
        <label>Password<input key={register ? 'new' : 'current'} name="password" type="password" autoComplete={register ? 'new-password' : 'current-password'} minLength={register ? 15 : 1} maxLength={128} required /></label>
        {register && <p className="form-help">Use 15–128 characters. Choose a long, unique password. After signing in, open Account to verify a recovery email or phone.</p>}
      </fieldset>
      {error && <p className="form-error" role="alert">{error}</p>}
      <button className="primary" disabled={busy} type="submit">{busy ? 'Please wait…' : register ? 'Create account' : 'Sign in'}</button>
    </form>
    <button className="secondary auth-switch" disabled={busy} onClick={() => { setRegister(!register); setError(''); setNotice('') }}>{register ? 'Already have an account? Sign in' : 'New here? Create an account'}</button>
    <button className="secondary" disabled={busy} onClick={() => setForgot(true)}>Forgot password?</button>
    <p className="form-help">For now, refreshing this page signs you out.</p>
  </section></main>
}
