// Access tokens intentionally live only in memory, never in browser storage.
let token: string | null = null
export const getToken = () => token
export function setToken(value: string | null) { token = value }
export function expireSession(expected: string) {
  if (token !== expected) return
  token = null
  window.dispatchEvent(new Event('ledgernest-session-expired'))
}
