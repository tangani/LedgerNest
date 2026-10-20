import { useEffect, useRef, useState } from 'react'
import App from '../../App'
import { authApi } from '../../services/authApi'
import type { User } from '../../services/authApi'
import { setToken } from '../../services/session'
import { LoginPage } from './LoginPage'
import { AccountEditor } from './AccountEditor'
import { RecoveryPanel, takeRecoveryLink } from './RecoveryPanel'
const initialRecovery = takeRecoveryLink()
export function AuthRoot() {
  const [recovery, setRecovery] = useState(initialRecovery)
  const [user, setUser] = useState<User | null>(null)
  const [message, setMessage] = useState('')
  const [accountOpen, setAccountOpen] = useState(false)
  const [accountError, setAccountError] = useState('')
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  function logout(message = 'You have signed out.') {
    if (timer.current) clearTimeout(timer.current)
    setToken(null); setUser(null); setAccountOpen(false); setMessage(message); setAccountError('')
  }
  useEffect(() => {
    const expired = () => {
      setToken(null); setUser(null); setAccountOpen(false); setMessage('Your session expired. Sign in again.')
      if (timer.current) clearTimeout(timer.current)
    }
    window.addEventListener('ledgernest-session-expired', expired)
    return () => { window.removeEventListener('ledgernest-session-expired', expired); if (timer.current) clearTimeout(timer.current) }
  }, [])
  async function login(username: string, password: string) {
    const session = await authApi.login(username, password)
    setToken(session.token)
    try {
      const current = await authApi.me()
      setUser(current); setMessage('')
      timer.current = setTimeout(() => logout('Your session expired. Sign in again.'), session.expiresIn * 1000)
    } catch (error) { setToken(null); throw error }
  }
  async function openAccount() {
    setAccountError('')
    try { const current = await authApi.me(); setUser(current); setAccountOpen(true) }
    catch (error) { setAccountError(error instanceof Error ? error.message : 'Could not load account.') }
  }
  if (recovery) return <main className="auth-page"><RecoveryPanel mode={recovery.purpose} initial={recovery} onClose={() => { setRecovery(null); logout('Sign in to continue.') }} /></main>
  if (!user) return <LoginPage onLogin={login} message={message} />
  return <><App key={user.id} user={user} onLogout={() => logout()} onAccount={() => { void openAccount() }} />
    {accountError && <p className="storage-error" role="alert">{accountError}</p>}
    {accountOpen && <AccountEditor onDeleted={() => logout("Your account has been permanently deleted.")} user={user} onUpdate={setUser} onClose={() => setAccountOpen(false)} />}</>
}
