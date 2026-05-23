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

export function usePaginatedEmails(filters = {}, extraDeps = []) {
  const [page, setPage] = useState(1)
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const filterKey = JSON.stringify(filters)

  // Reset to page 1 whenever filters change
  useEffect(() => { setPage(1) }, [filterKey])

  const params = new URLSearchParams(
    Object.entries({
      page,
      page_size: 50,
      ...filters,
    }).filter(([, v]) => v !== undefined && v !== '' && v !== false && v !== null)
  )

  useEffect(() => {
    setLoading(true)
    setError(null)
    axios.get(`${BASE}/emails?${params}`)
      .then(r => { setData(r.data); setLoading(false) })
      .catch(e => {
        setData(null)
        setError(e.response?.status === 404
          ? 'No email results yet. Run the pipeline from the Pipeline tab.'
          : e.message)
        setLoading(false)
      })
  }, [page, filterKey, ...extraDeps])

  return { data, loading, error, page, setPage }
}

export async function triggerPipeline(rowLimit = null) {
  const r = await axios.post(`${BASE}/run`, { row_limit: rowLimit })
  return r.data
}