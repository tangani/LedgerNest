import { useCallback, useEffect, useRef, useState } from 'react'
import type { Business, BusinessTransaction } from '../models/ledger'
import { ApiError, businessesApi } from '../services/businessesApi'

export function useBusinesses() {
  const [businesses, setBusinesses] = useState<Business[]>([])
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
      const records = await businessesApi.list(controller.signal)
      if (current === generation.current) setBusinesses(records)
    } catch (problem) {
      if (current === generation.current) setError(problem instanceof Error ? problem.message : 'Could not load businesses.')
    } finally {
      if (current === generation.current) setLoading(false)
    }
  }, [])

  useEffect(() => {
    void refresh()
    return () => { ++generation.current; active.current?.abort() }
  }, [refresh])

  async function save(business: Business, existing: boolean) {
    const saved = existing ? await businessesApi.update(business) : await businessesApi.create(business)
    setBusinesses(previous => [saved, ...previous.filter(item => item.id !== saved.id)])
    return saved
  }
  async function transact(id: string, transaction: BusinessTransaction) {
    const saved = await businessesApi.transact(id, transaction)
    setBusinesses(previous => previous.map(item => item.id === saved.id ? saved : item))
    return saved
  }
  function message(problem: unknown) {
    if (problem instanceof ApiError && problem.status === 409) {
      return `${problem.message} Close this form, refresh businesses, and reopen it to use the latest balance and version.`
    }
    return problem instanceof Error ? problem.message : 'The request failed.'
  }
  return { businesses, loading, error, refresh, save, transact, message }
}
