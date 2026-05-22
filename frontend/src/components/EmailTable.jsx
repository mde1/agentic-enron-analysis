import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { usePaginatedEmails } from '../hooks/useApi'

function Badge({ children, variant = 'default' }) {
  const styles = {
    default: 'bg-enron-muted text-enron-dim',
    red: 'bg-red-950/60 text-enron-red border border-enron-red/20',
    amber: 'bg-amber-950/60 text-enron-amber border border-enron-amber/20',
    blue: 'bg-blue-950/60 text-blue-400 border border-blue-400/20',
  }
  return (
    <span className={`inline-flex px-1.5 py-0.5 rounded text-xs mono ${styles[variant]}`}>
      {children}
    </span>
  )
}

function EmailRow({ email, onClick, isSelected }) {
  return (
    <motion.tr
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className={`border-b border-enron-border/50 cursor-pointer transition-colors
        ${isSelected ? 'bg-enron-muted/60' : 'hover:bg-enron-panel/80'}`}
      onClick={() => onClick(email)}
    >
      <td className="px-3 py-2.5 text-xs">
        <div className="flex flex-col gap-1">
          <span className="mono text-white text-xs font-medium">
            {email.convicted_match || email.sender_name || email.from_clean?.split('@')[0]}
          </span>
          <span className="text-enron-dim text-xs">{email.from_clean}</span>
          <div className="flex gap-1 flex-wrap">
            {email.convicted && <Badge variant="red">⚠ CONVICTED</Badge>}
          </div>
        </div>
      </td>
      <td className="px-3 py-2.5 text-xs max-w-xs">
        <div className="flex items-start gap-2">
          {email.is_suspicious && <span className="text-enron-amber flex-shrink-0">⚑</span>}
          <span className="text-enron-text line-clamp-2">{email.subject}</span>
        </div>
      </td>
      <td className="px-3 py-2.5 text-xs text-enron-dim mono whitespace-nowrap">
        {email.date_str?.slice(0, 10) || '—'}
      </td>
      <td className="px-3 py-2.5 text-xs max-w-xs">
        {email.agent_assessment ? (
          <div className={`text-xs leading-relaxed ${
            email.agent_assessment.includes('CRITICAL') ? 'text-enron-red' :
            email.agent_assessment.includes('HIGH') ? 'text-enron-amber' :
            'text-enron-dim'
          }`}>
            {email.agent_assessment.slice(0, 120)}{email.agent_assessment.length > 120 ? '...' : ''}
          </div>
        ) : (
          <span className="text-enron-border">—</span>
        )}
      </td>
    </motion.tr>
  )
}

function EmailDetail({ email, onClose }) {
  if (!email) return null
  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      className="panel p-5 h-full overflow-y-auto"
    >
      <div className="flex justify-between items-start mb-4">
        <div className="text-xs mono text-enron-dim uppercase tracking-wider">Email Detail</div>
        <button onClick={onClose} className="text-enron-dim hover:text-white text-sm">✕</button>
      </div>

      {email.convicted && (
        <div className="mb-4 px-3 py-2 bg-red-950/40 border border-enron-red/30 rounded">
          <div className="text-enron-red text-xs font-semibold">
            ⚠ SENDER CONVICTED: {email.convicted_match}
          </div>
        </div>
      )}

      <div className="space-y-3 text-sm">
        <div>
          <div className="text-xs text-enron-dim mono mb-1">FROM</div>
          <div className="text-white">{email.sender_name || email.from_clean}</div>
          <div className="text-enron-dim text-xs mono">{email.from_clean}</div>
        </div>
        <div>
          <div className="text-xs text-enron-dim mono mb-1">DATE</div>
          <div className="mono text-enron-text">{email.date_str}</div>
        </div>
        <div>
          <div className="text-xs text-enron-dim mono mb-1">SUBJECT</div>
          <div className="text-white font-medium">{email.subject}</div>
        </div>
        <div>
          <div className="text-xs text-enron-dim mono mb-1">FLAGS</div>
          <div className="flex gap-2 flex-wrap">
            {email.convicted && <Badge variant="red">Convicted Sender</Badge>}
            {email.is_suspicious && <Badge variant="amber">Suspicious</Badge>}
            {!email.convicted && !email.is_suspicious && <Badge>No flags</Badge>}
          </div>
        </div>
        {email.agent_assessment && (
          <div>
            <div className="text-xs text-enron-dim mono mb-1">AGENT ASSESSMENT</div>
            <div className={`text-sm leading-relaxed p-3 rounded border ${
              email.agent_assessment.includes('CRITICAL') ? 'bg-red-950/30 border-enron-red/20 text-enron-red' :
              email.agent_assessment.includes('HIGH') ? 'bg-amber-950/30 border-enron-amber/20 text-enron-amber' :
              'bg-enron-muted/40 border-enron-border text-enron-dim'
            }`}>
              {email.agent_assessment}
            </div>
          </div>
        )}
      </div>
    </motion.div>
  )
}

export default function EmailTable() {
  const [filters, setFilters] = useState({})
  const [search, setSearch] = useState('')
  const [selectedEmail, setSelectedEmail] = useState(null)
  const { data, loading, page, setPage } = usePaginatedEmails({
    ...filters,
    search: search || undefined,
  })

  const emails = data?.data || []

  return (
    <div className="flex gap-4 h-full">
      {/* Table side */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Filters */}
        <div className="flex gap-3 mb-4 flex-wrap">
          <input
            type="text"
            placeholder="Search sender, subject..."
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1) }}
            className="flex-1 min-w-48 px-3 py-2 bg-enron-panel border border-enron-border rounded
              text-sm text-enron-text placeholder:text-enron-border focus:outline-none
              focus:border-enron-dim mono"
          />
          <label className="flex items-center gap-2 px-3 py-2 panel cursor-pointer text-sm">
            <input
              type="checkbox"
              checked={!!filters.convicted_only}
              onChange={e => { setFilters(f => ({...f, convicted_only: e.target.checked || undefined})); setPage(1) }}
              className="accent-red-500"
            />
            <span className="text-enron-red text-xs mono">Convicted only</span>
          </label>
          <label className="flex items-center gap-2 px-3 py-2 panel cursor-pointer text-sm">
            <input
              type="checkbox"
              checked={!!filters.suspicious_only}
              onChange={e => { setFilters(f => ({...f, suspicious_only: e.target.checked || undefined})); setPage(1) }}
              className="accent-amber-500"
            />
            <span className="text-enron-amber text-xs mono">Suspicious only</span>
          </label>
        </div>

        {/* Table */}
        <div className="flex-1 overflow-auto panel">
          {loading ? (
            <div className="flex items-center justify-center h-32 text-enron-dim text-sm">
              <div className="animate-pulse">Loading emails...</div>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-enron-dark border-b border-enron-border">
                <tr>
                  {['Sender', 'Subject', 'Date', 'Agent Assessment'].map(h => (
                    <th key={h} className="px-3 py-2.5 text-left text-xs mono text-enron-dim uppercase tracking-wider">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {emails.map((email, i) => (
                  <EmailRow
                    key={i}
                    email={email}
                    onClick={setSelectedEmail}
                    isSelected={selectedEmail === email}
                  />
                ))}
                {!emails.length && (
                  <tr>
                    <td colSpan={4} className="px-3 py-8 text-center text-enron-dim text-sm">
                      No emails found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>

        {/* Pagination */}
        {data && data.pages > 1 && (
          <div className="flex items-center justify-between mt-3 text-xs text-enron-dim">
            <span className="mono">{data.total.toLocaleString()} results</span>
            <div className="flex gap-2">
              <button
                disabled={page === 1}
                onClick={() => setPage(p => p - 1)}
                className="px-3 py-1.5 panel hover:bg-enron-muted disabled:opacity-30 disabled:cursor-not-allowed"
              >
                ← Prev
              </button>
              <span className="px-3 py-1.5 panel mono">
                {page} / {data.pages}
              </span>
              <button
                disabled={page === data.pages}
                onClick={() => setPage(p => p + 1)}
                className="px-3 py-1.5 panel hover:bg-enron-muted disabled:opacity-30 disabled:cursor-not-allowed"
              >
                Next →
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Detail panel */}
      <AnimatePresence>
        {selectedEmail && (
          <div className="w-80 flex-shrink-0">
            <EmailDetail email={selectedEmail} onClose={() => setSelectedEmail(null)} />
          </div>
        )}
      </AnimatePresence>
    </div>
  )
}
