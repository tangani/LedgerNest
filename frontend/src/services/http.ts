import { getToken, expireSession } from './session'
import { Capacitor } from '@capacitor/core'

export class ApiError extends Error {
  readonly status: number

  constructor(message: string, status: number) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}

const object = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null

const API_ORIGIN = Capacitor.isNativePlatform()
    ? 'https://ledgernest-api.onrender.com'
    : ''

export async function request(path: string, method = 'GET', body?: unknown, signal?: AbortSignal): Promise<unknown> {
  const requestToken = getToken()
  const controller = new AbortController()
  const cancel = () => controller.abort()
  if (signal?.aborted) controller.abort()
  signal?.addEventListener('abort', cancel, { once: true })
  const timer = setTimeout(cancel, 90000)
  try {
    const response = await fetch(`${API_ORIGIN}${path}`, {
      method, signal: controller.signal, cache: 'no-store',
      headers: { Accept: 'application/json', ...(body === undefined ? {} : { 'Content-Type': 'application/json' }), ...(requestToken ? { Authorization: `Bearer ${requestToken}` } : {}) },
      body: body === undefined ? undefined : JSON.stringify(body),
    })
    if (requestToken !== getToken()) throw new ApiError('Session changed. Sign in again.', 401)
    if (response.status === 401 && requestToken) expireSession(requestToken)
    const data: unknown = await response.json().catch(() => null)
    if (requestToken !== getToken() && response.status !== 401) throw new ApiError('Session changed. Sign in again.', 401)
    if (!response.ok) {
      let message = `Request failed (${response.status}).`
      if (object(data)) {
        const embedded = data._embedded
        const errors = object(embedded) && Array.isArray(embedded.errors) ? embedded.errors : []
        const detail = errors.find((item: unknown) => object(item) && typeof item.message === 'string')
        if (object(detail)) message = String(detail.message)
        else if (typeof data.message === 'string') message = data.message
      }
      if (response.status >= 500) message = 'The backend could not complete the request. Check its terminal logs.'
      throw new ApiError(message, response.status)
    }
    return data
  } catch (error) {
    if (error instanceof ApiError) throw error
    throw new ApiError('Could not reach the backend, or the request timed out.', 0)
  } finally {
    clearTimeout(timer)
    signal?.removeEventListener('abort', cancel)
  }
}

