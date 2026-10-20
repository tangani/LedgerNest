// @vitest-environment jsdom
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { LoginPage } from '../src/features/auth/LoginPage'
import { PreferencesPanel } from '../src/features/preferences/PreferencesPanel'
import { readPreferences, savePreferences } from '../src/lib/preferences'

const { register } = vi.hoisted(() => ({ register: vi.fn() }))
vi.mock('../src/services/authApi', () => ({ authApi: { register } }))
beforeEach(() => {
  localStorage.clear(); register.mockReset()
  Object.defineProperty(navigator, 'languages', { value: ['en-ZA'], configurable: true })
})
afterEach(cleanup)

it('offers phone sign-in by default and preserves the legacy sign-in route', async () => {
  const login = vi.fn().mockResolvedValue(undefined)
  render(<LoginPage onLogin={login} message="" />)
  expect(screen.queryByText('For now, refreshing this page signs you out.')).toBeNull()
  fireEvent.change(screen.getByLabelText('Phone number'), { target: { value: '0821234567' } })
  fireEvent.change(screen.getByLabelText('Password', { exact: true }), { target: { value: 'test-password-value' } })
  fireEvent.click(screen.getByRole('button', { name: 'Sign in', exact: true }))
  await waitFor(() => expect(login).toHaveBeenCalledWith('+27821234567', 'test-password-value'))
  fireEvent.click(screen.getByRole('button', { name: 'Sign in with an existing email or username' }))
  fireEvent.change(screen.getByLabelText('Email or username'), { target: { value: 'legacy@example.test' } })
  fireEvent.change(screen.getByLabelText('Password', { exact: true }), { target: { value: 'test-password-value' } })
  fireEvent.click(screen.getByRole('button', { name: 'Sign in', exact: true }))
  await waitFor(() => expect(login).toHaveBeenLastCalledWith('legacy@example.test', 'test-password-value'))
})

it('creates a phone account and saves Zimbabwe USD preference under its returned user ID', async () => {
  register.mockResolvedValue({ id: 'new-user', username: '+263772123456' })
  render(<LoginPage onLogin={vi.fn()} message="" />)
  fireEvent.click(screen.getByRole('button', { name: 'New here? Create an account' }))
  expect(screen.queryByRole('img')).toBeNull()
  fireEvent.change(screen.getByLabelText('Name', { exact: true }), { target: { value: 'Test' } })
  fireEvent.change(screen.getByLabelText('Surname'), { target: { value: 'User' } })
  fireEvent.change(screen.getByLabelText('Phone country'), { target: { value: 'ZW' } })
  fireEvent.change(screen.getByLabelText('Phone number'), { target: { value: '0772123456' } })
  fireEvent.change(screen.getByLabelText('Password', { exact: true }), { target: { value: 'a-long-test-password' } })
  fireEvent.change(screen.getByLabelText('Confirm password', { exact: true }), { target: { value: 'a-long-test-password' } })
  fireEvent.click(screen.getByRole('button', { name: 'Create account', exact: true }))
  await waitFor(() => expect(register).toHaveBeenCalledWith({ firstName: 'Test', surname: 'User', username: '+263772123456', password: 'a-long-test-password' }))
  await waitFor(() => expect(readPreferences('new-user')).toEqual({ country: 'ZW', currency: 'USD' }))
})

it('rejects an invalid phone before submitting credentials', async () => {
  const login = vi.fn()
  render(<LoginPage onLogin={login} message="" />)
  fireEvent.change(screen.getByLabelText('Phone number'), { target: { value: '123' } })
  fireEvent.change(screen.getByLabelText('Password', { exact: true }), { target: { value: 'test-password-value' } })
  fireEvent.click(screen.getByRole('button', { name: 'Sign in', exact: true }))
  await screen.findByRole('alert')
  expect(login).not.toHaveBeenCalled()
})

it('allows an Account currency override without changing residence', () => {
  savePreferences('user-a', { country: 'ZW', currency: 'USD' })
  render(<PreferencesPanel userId="user-a" username="+263772123456" />)
  fireEvent.change(screen.getByLabelText('Preferred display currency'), { target: { value: 'ZAR' } })
  expect(readPreferences('user-a')).toEqual({ country: 'ZW', currency: 'ZAR' })
  expect(readPreferences('user-b', 'ZW')).toEqual({ country: '', currency: 'USD' })
})
