import { authApi } from '../../services/authApi'
import { ApiError } from '../../services/http'

export const PASSWORD_MIN_LENGTH = 15
export const PASSWORD_MAX_LENGTH = 128

export type Credentials = {
  username: string
  password: string
}

function readField(form: FormData, name: string): string {
  const value = form.get(name)
  return typeof value === 'string' ? value : ''
}

export function readCredentials(form: FormData): Credentials {
  return {
    username: readField(form, 'username').trim(),
    password: readField(form, 'password'),
  }
}

export async function registerAccount(form: FormData): Promise<void> {
  const credentials = readCredentials(form)

  if (credentials.password !== readField(form, 'confirmPassword')) {
    throw new Error('Passwords do not match.')
  }

  if (credentials.password.length < PASSWORD_MIN_LENGTH ||
      credentials.password.length > PASSWORD_MAX_LENGTH) {
    throw new Error(`Use ${PASSWORD_MIN_LENGTH}–${PASSWORD_MAX_LENGTH} characters for your password.`)
  }

  await authApi.register({
    firstName: readField(form, 'firstName').trim(),
    surname: readField(form, 'surname').trim(),
    ...credentials,
  })
}

export function authErrorMessage(problem: unknown, registering: boolean): string {
  if (problem instanceof ApiError) {
    if (problem.status === 401 && !registering) {
      return 'Unable to sign in. Check your identifier and password, or wait a minute if you have tried several times.'
    }
    if (problem.status === 0 && registering) {
      return 'The response was interrupted. Your account may have been created; try signing in before registering again.'
    }
  }
  return problem instanceof Error ? problem.message : 'Could not complete the request.'
}
