import { useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { RecoveryPanel } from './RecoveryPanel'
import { PasswordField } from './PasswordField'
import { PhoneInput } from '../../components/PhoneInput'
import { canonicalPhone, countries, suggestedCountry } from '../../lib/countries'
import type { CountryCode } from '../../lib/countries'
import { defaultCurrency, savePreferences } from '../../lib/preferences'
import { authErrorMessage, PASSWORD_MAX_LENGTH, PASSWORD_MIN_LENGTH, readCredentials, registerAccount } from './authForm'
import './auth.css'
import '../preferences/country-currency.css'

type Props = { onLogin: (username: string, password: string) => Promise<void>; message: string }
export function LoginPage({ onLogin, message }: Props) {
  const [register, setRegister] = useState(false)
  const [legacy, setLegacy] = useState(false)
  const [phoneCountry, setPhoneCountry] = useState<CountryCode>(suggestedCountry)
  const [residence, setResidence] = useState<CountryCode>(phoneCountry)
  const [residenceEdited, setResidenceEdited] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [forgot, setForgot] = useState(false)
  const lock = useRef(false)
  function switchMode() {
    setRegister(current => !current); setLegacy(false); setError(''); setNotice('')
  }
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (lock.current) return
    const element = event.currentTarget
    const form = new FormData(element)
    lock.current = true; setBusy(true); setError(''); setNotice('')
    try {
      if (register || !legacy) form.set('username', canonicalPhone(String(form.get('nationalPhone') ?? ''), phoneCountry))
      if (register) {
        const account = await registerAccount(form)
        let preferenceWarning = ''
        try { savePreferences(account.id, { country: residence, currency: defaultCurrency(residence) }) }
        catch { preferenceWarning = ' Your country preference could not be saved on this device; choose it later in Account.' }
        element.reset(); setRegister(false)
        setNotice('Account created. Sign in, then open Account to set up password recovery.' + preferenceWarning)
      } else {
        const { username, password } = readCredentials(form)
        await onLogin(username, password)
      }
    } catch (problem) { setError(authErrorMessage(problem, register)) }
    finally { lock.current = false; setBusy(false) }
  }
  if (forgot) return <main className="auth-page"><RecoveryPanel mode="reset" onClose={() => setForgot(false)} /></main>
  return <main className="auth-page"><section className="auth-card" aria-labelledby="auth-heading">
    {!register && <div className="auth-brand"><img className="auth-logo" src="/ledgernest-logo.png" alt="LedgerNest — Personal Debt & Capital Tracker" /></div>}
    <h1 id="auth-heading">{register ? 'Create your account' : 'Welcome back'}</h1>
    {message && <p role="status">{message}</p>}{notice && <p role="status">{notice}</p>}
    <form key={`${register}-${legacy}`} onSubmit={submit} className="editor-form" aria-busy={busy}>
      <fieldset className="editor-fields" disabled={busy}>
        {register && <>
          <label>Name<input name="firstName" autoComplete="given-name" maxLength={100} required /></label>
          <label>Surname<input name="surname" autoComplete="family-name" maxLength={100} required /></label>
        </>}
        {!register && legacy
          ? <label>Email or username<input name="username" autoComplete="username" autoCapitalize="none" spellCheck={false} maxLength={254} required /></label>
          : <PhoneInput country={phoneCountry} onCountryChange={country => {
              setPhoneCountry(country); if (!residenceEdited) setResidence(country)
            }} />}
        {register && <label>Country of residence
          <select value={residence} onChange={event => { setResidence(event.target.value as CountryCode); setResidenceEdited(true) }} autoComplete="country">
            {countries.map(item => <option key={item.code} value={item.code}>{item.name}</option>)}
          </select>
          <span className="form-help">Your display currency starts as {defaultCurrency(residence)}. You can change it in Account.</span>
        </label>}
        <PasswordField key={register ? 'new' : 'current'} label="Password" name="password"
          autoComplete={register ? 'new-password' : 'current-password'} minLength={register ? PASSWORD_MIN_LENGTH : 1}
          maxLength={PASSWORD_MAX_LENGTH} describedBy={register ? 'password-help' : undefined} />
        {register && <>
          <PasswordField label="Confirm password" name="confirmPassword" autoComplete="new-password" maxLength={PASSWORD_MAX_LENGTH} />
          <p id="password-help" className="form-help">Use {PASSWORD_MIN_LENGTH}–{PASSWORD_MAX_LENGTH} characters. Choose a unique password.</p>
        </>}
      </fieldset>
      {error && <p className="form-error" role="alert">{error}</p>}
      <button className="primary" disabled={busy} type="submit">{busy ? 'Please wait…' : register ? 'Create account' : 'Sign in'}</button>
    </form>
    {!register && <button type="button" className="auth-legacy" disabled={busy} onClick={() => { setLegacy(current => !current); setError(''); setNotice('') }}>
      {legacy ? 'Sign in with a phone number' : 'Sign in with an existing email or username'}
    </button>}
    <button type="button" className="secondary auth-switch" disabled={busy} onClick={switchMode}>{register ? 'Already have an account? Sign in' : 'New here? Create an account'}</button>
    {!register && <button type="button" className="secondary auth-forgot" disabled={busy} onClick={() => { setError(''); setNotice(''); setForgot(true) }}>Forgot password?</button>}
  </section></main>
}
