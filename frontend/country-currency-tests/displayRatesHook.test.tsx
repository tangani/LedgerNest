// @vitest-environment jsdom
import { act, cleanup, renderHook, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { useExchangeRate } from '../src/hooks/useExchangeRate'
import { convert } from '../src/lib/currency'
import type { DisplayObservation } from '../src/services/displayRates'
const { fetchRates } = vi.hoisted(() => ({ fetchRates: vi.fn() }))
vi.mock('../src/services/displayRates', async importOriginal => {
  const actual = await importOriginal<typeof import('../src/services/displayRates')>()
  return { ...actual, fetchDisplayRates: fetchRates }
})
function observation(target: string, value: number): DisplayObservation {
  const now = Date.now()
  const quote = { rate: value, date: new Date(now).toISOString().slice(0, 10), fetchedAt: now, cached: false }
  return { target, quotes: { USD: quote, ZAR: quote } }
}
beforeEach(() => { localStorage.clear(); fetchRates.mockReset() })
afterEach(cleanup)
it('does not show rates from the previous selected currency while the next loads', async () => {
  fetchRates.mockResolvedValueOnce(observation('EUR', .9))
  let finish!: (value: DisplayObservation) => void
  fetchRates.mockImplementationOnce(() => new Promise<DisplayObservation>(resolve => { finish = resolve }))
  const { result, rerender } = renderHook(({ target }) => useExchangeRate(target), { initialProps: { target: 'EUR' } })
  await waitFor(() => expect(convert(100, 'USD', 'EUR', result.current.rate)).toBe(90))
  rerender({ target: 'JPY' })
  expect(convert(100, 'USD', 'JPY', result.current.rate)).toBeNull()
  await act(async () => { finish(observation('JPY', 158)) })
  expect(convert(100, 'USD', 'JPY', result.current.rate)).toBe(158)
})
it('ignores a late response for an abandoned selection', async () => {
  let oldFinish!: (value: DisplayObservation) => void
  fetchRates.mockImplementationOnce(() => new Promise<DisplayObservation>(resolve => { oldFinish = resolve }))
  fetchRates.mockResolvedValueOnce(observation('GBP', .8))
  const { result, rerender } = renderHook(({ target }) => useExchangeRate(target), { initialProps: { target: 'EUR' } })
  rerender({ target: 'GBP' })
  await waitFor(() => expect(convert(100, 'USD', 'GBP', result.current.rate)).toBe(80))
  await act(async () => { oldFinish(observation('EUR', .9)) })
  expect(result.current.observation.target).toBe('GBP')
  expect(convert(100, 'USD', 'GBP', result.current.rate)).toBe(80)
})
