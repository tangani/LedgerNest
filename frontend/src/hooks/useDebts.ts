import { useCallback, useEffect, useRef, useState } from 'react'
import type { Debt, Repayment } from '../models/ledger'
import { ApiError, debtsApi } from '../services/debtsApi'

export function useDebts() {
  const [debts, setDebts] = useState<Debt[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const active = useRef<AbortController | null>(null)
  const generation = useRef(0)

  const refresh = useCallback(async () => {
    const current = ++generation.current
    active.current?.abort()
    const controller = new AbortController()
    active.current = controller
    setLoading(true)
    setError('')
    try {
      const records = await debtsApi.list(controller.signal)
      if (current === generation.current) setDebts(records)
    } catch (problem) {
      if (current === generation.current) setError(problem instanceof Error ? problem.message : 'Could not load debts.')
    } finally {
      if (current === generation.current) setLoading(false)
    }
  }, [])

  useEffect(() => {
    void refresh()
    return () => { ++generation.current; active.current?.abort() }
  }, [refresh])

  async function save(debt: Debt, existing: boolean) {
    const saved = existing ? await debtsApi.update(debt) : await debtsApi.create(debt)
    setDebts(previous => [saved, ...previous.filter(item => item.id !== saved.id)])
    return saved
  }
  async function repay(id: string, payment: Repayment) {
    const saved = await debtsApi.repay(id, payment)
    setDebts(previous => previous.map(item => item.id === saved.id ? saved : item))
    return saved
  }
  function message(problem: unknown) {
    if (problem instanceof ApiError && problem.status === 409) {
      return `${problem.message} Close this form, refresh debts, and reopen it to use the latest balance and version.`
    }
    return problem instanceof Error ? problem.message : 'The request failed.'
  }
  return { debts, loading, error, refresh, save, repay, message }
}
