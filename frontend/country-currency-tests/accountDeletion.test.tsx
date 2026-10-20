// @vitest-environment jsdom
import { afterEach, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { DeleteAccountPanel } from '../src/features/auth/DeleteAccountPanel'
import { PASSWORD_MIN_LENGTH, registerAccount } from '../src/features/auth/authForm'
const { request, register } = vi.hoisted(() => ({ request: vi.fn(), register: vi.fn() }))
vi.mock('../src/services/http', () => ({ request, ApiError: class extends Error {} }))
vi.mock('../src/services/authApi', () => ({ authApi: { register } }))
afterEach(() => { cleanup(); vi.restoreAllMocks(); request.mockReset(); register.mockReset() })
function open() {
  const done = vi.fn()
  render(<DeleteAccountPanel userId="owner" onDeleted={done} />)
  fireEvent.click(screen.getByText('Delete my account…'))
  fireEvent.change(screen.getByLabelText('Current password'), { target: { value: 'password' } })
  fireEvent.change(screen.getByLabelText('Type DELETE to confirm'), { target: { value: 'DELETE' } })
  return done
}
it('accepts eight-character registration passwords and rejects seven', async () => {
  expect(PASSWORD_MIN_LENGTH).toBe(8)
  const form = new FormData()
  form.set('password','1234567'); form.set('confirmPassword','1234567')
  await expect(registerAccount(form)).rejects.toThrow('8–128')
  expect(register).not.toHaveBeenCalled()
  form.set('password','12345678'); form.set('confirmPassword','12345678')
  register.mockResolvedValue({ id: 'owner' })
  await expect(registerAccount(form)).resolves.toEqual({ id: 'owner' })
})
it('requires the final confirmation before sending deletion', () => {
  vi.spyOn(window,'confirm').mockReturnValue(false)
  const done = open()
  fireEvent.click(screen.getByText('Permanently delete account'))
  expect(request).not.toHaveBeenCalled(); expect(done).not.toHaveBeenCalled()
})
it('clears account preferences and signs out only after successful deletion', async () => {
  vi.spyOn(window,'confirm').mockReturnValue(true)
  localStorage.setItem('ledgernest:preferences:v1:owner','{}')
  request.mockResolvedValue({message:'Deleted'})
  const done = open()
  fireEvent.click(screen.getByText('Permanently delete account'))
  await waitFor(() => expect(done).toHaveBeenCalledOnce())
  expect(request).toHaveBeenCalledWith('/api/v1/auth/delete-account','POST',{ currentPassword:'password',confirmation:'DELETE' })
  expect(localStorage.getItem('ledgernest:preferences:v1:owner')).toBeNull()
})
it('keeps the account open when deletion fails', async () => {
  vi.spyOn(window,'confirm').mockReturnValue(true)
  request.mockRejectedValue(new Error('Current password is incorrect.'))
  const done = open()
  fireEvent.click(screen.getByText('Permanently delete account'))
  await screen.findByRole('alert')
  expect(done).not.toHaveBeenCalled()
})
