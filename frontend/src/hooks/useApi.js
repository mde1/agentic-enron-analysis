import { useState, useEffect } from 'react'
import axios from 'axios'

const BASE = import.meta.env.VITE_API_URL || '/api'

export function useApi(endpoint, deps = []) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    axios.get(`${BASE}${endpoint}`)
      .then(r => { if (!cancelled) { setData(r.data); setLoading(false) } })
      .catch(e => { if (!cancelled) { setError(e.message); setLoading(false) } })
    return () => { cancelled = true }
  }, deps)

  return { data, loading, error }
}

export function usePaginatedEmails(filters = {}) {
  const [page, setPage] = useState(1)
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  const params = new URLSearchParams({
    page,
    page_size: 50,
    ...Object.fromEntries(Object.entries(filters).filter(([,v]) => v !== undefined && v !== '' && v !== false)),
  })

  useEffect(() => {
    setLoading(true)
    axios.get(`${BASE}/emails?${params}`)
      .then(r => { setData(r.data); setLoading(false) })
      .catch(() => setLoading(false))
  }, [page, JSON.stringify(filters)])

  return { data, loading, page, setPage }
}

export async function triggerPipeline() {
  const r = await axios.post(`${BASE}/run`, {})
  return r.data
}
