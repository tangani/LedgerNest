import { request } from './http'
export type User = { id: string; firstName: string; surname: string; username: string; identifierType: 'email' | 'phone' | 'handle'; identifierVerified: boolean }
export type Registration = { firstName: string; surname: string; username: string; password: string }
function user(value: unknown): User {
  if (!value || typeof value !== 'object') throw new Error('Invalid account response.')
  const v = value as Record<string, unknown>
  if (['id','firstName','surname','username'].some(key => typeof v[key] !== 'string') || !['email','phone','handle'].includes(String(v.identifierType))) throw new Error('Invalid account response.')
  return { ...v, identifierVerified: v.identifierVerified === true } as User
}
export type RecoveryChallengeResponse = { id: string; message: string }
export type RecoveryPurpose = 'enroll' | 'reset'

function recoveryMessage(value: unknown): { message: string } {
  if (!value || typeof value !== 'object' ||
      !('message' in value) || typeof value.message !== 'string') {
    throw new Error('Invalid recovery response.')
  }
  return { message: value.message }
}

function recoveryChallenge(value: unknown): RecoveryChallengeResponse {
  const { message } = recoveryMessage(value)
  if (!value || typeof value !== 'object' ||
      !('id' in value) || typeof value.id !== 'string') {
    throw new Error('Invalid recovery response.')
  }
  return { id: value.id, message }
}

export const authApi = {
  async register(input: Registration) { return user(await request('/api/v1/auth/register', 'POST', input)) },
  async login(username: string, password: string) {
    const raw = await request('/api/v1/auth/login', 'POST', { username, password })
    if (!raw || typeof raw !== 'object') throw new Error('Invalid login response.')
    const value = raw as Record<string, unknown>
    if (typeof value.access_token !== 'string' || typeof value.expires_in !== 'number' || value.expires_in <= 0) throw new Error('Invalid login response.')
    return { token: value.access_token, expiresIn: Math.min(value.expires_in, 900) }
  },
  async enrollRecovery(target: string, currentPassword: string) {
    return recoveryChallenge(await request('/api/v1/auth/recovery/enroll', 'POST', {
      target, currentPassword,
    }))
  },
  async startSmsRecovery(username: string) {
    return recoveryChallenge(await request('/api/v1/auth/recovery/start', 'POST', {
      username, channel: 'sms',
    }))
  },
  async finishRecovery(id: string, secret: string, newPassword?: string) {
    return recoveryMessage(await request('/api/v1/auth/recovery/finish', 'POST', {
      id, secret, ...(newPassword !== undefined ? { newPassword } : {}),
    }))
  },
  async me() { return user(await request('/api/v1/auth/me')) },
  async changeUsername(username: string, currentPassword: string) {
    return user(await request('/api/v1/auth/username', 'PUT', { username, currentPassword }))
  },
}
