import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { usePaginatedEmails, useApi } from '../hooks/useApi'

// --- Row limit options ---
const ROW_LIMIT_OPTIONS = [
  { label: 'All rows', value: null },
  { label: '1,000 rows', value: 1000 },
  { label: '5,000 rows', value: 5000 },
  { label: '10,000 rows', value: 10000 },
  { label: '25,000 rows', value: 25000 },
  { label: '50,000 rows', value: 50000 },
]

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

  const parseRecipients = (val) => {
    if (!val || val === '[]' || val === '') return []
    if (Array.isArray(val)) return val.filter(Boolean)
    if (typeof val === 'string' && val.startsWith('[')) {
      try { return JSON.parse(val).filter(Boolean) } catch { return [val] }
    }
    return val.split(',').map(s => s.trim()).filter(Boolean)
  }

  const toList  = parseRecipients(email.to_clean || email.to)
  const ccList  = parseRecipients(email.x_cc || email.cc)
  const bccList = parseRecipients(email.x_bcc || email.bcc)

  const signals = [
    email.low_comm === true || email.low_comm === 'true'
      ? { label: 'Low-Comm Sender', color: 'amber' } : null,
    email.contains_reply_forwards === true || email.contains_reply_forwards === 'true'
      ? { label: 'Has Replies/Forwards', color: 'blue' } : null,
    email.poi_present === true || email.poi_present === 'true'
      ? { label: 'POI Present', color: 'red' } : null,
    email.re ? { label: `Re: ${email.re}`, color: 'default' } : null,
  ].filter(Boolean)

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

        {/* From */}
        <div>
          <div className="text-xs text-enron-dim mono mb-1">FROM</div>
          <div className="text-white">{email.sender_name || email.from_clean}</div>
          <div className="text-enron-dim text-xs mono">{email.from_clean}</div>
        </div>

        {/* To */}
        {toList.length > 0 && (
          <div>
            <div className="text-xs text-enron-dim mono mb-1">TO</div>
            <div className="space-y-0.5">
              {toList.map((r, i) => (
                <div key={i} className="mono text-xs text-enron-dim">{r}</div>
              ))}
            </div>
          </div>
        )}

        {/* Cc */}
        {ccList.length > 0 && (
          <div>
            <div className="text-xs text-enron-dim mono mb-1">CC</div>
            <div className="space-y-0.5">
              {ccList.map((r, i) => (
                <div key={i} className="mono text-xs text-enron-dim">{r}</div>
              ))}
            </div>
          </div>
        )}

        {/* Bcc */}
        {bccList.length > 0 && (
          <div>
            <div className="text-xs text-enron-dim mono mb-1">BCC</div>
            <div className="space-y-0.5">
              {bccList.map((r, i) => (
                <div key={i} className="mono text-xs text-enron-dim">{r}</div>
              ))}
            </div>
          </div>
        )}

        {/* Date */}
        <div>
          <div className="text-xs text-enron-dim mono mb-1">DATE</div>
          <div className="mono text-enron-text">{email.date_str}</div>
        </div>

        {/* Subject */}
        <div>
          <div className="text-xs text-enron-dim mono mb-1">SUBJECT</div>
          <div className="text-white font-medium">{email.subject}</div>
        </div>

        {/* Flags */}
        <div>
          <div className="text-xs text-enron-dim mono mb-1">FLAGS</div>
          <div className="flex gap-2 flex-wrap">
            {email.convicted && <Badge variant="red">Convicted Sender</Badge>}
            {email.is_suspicious && <Badge variant="amber">Suspicious Folder</Badge>}
            {!email.convicted && !email.is_suspicious && <Badge>No flags</Badge>}
          </div>
        </div>

        {/* Signals */}
        {signals.length > 0 && (
          <div>
            <div className="text-xs text-enron-dim mono mb-1">SIGNALS</div>
            <div className="flex gap-1.5 flex-wrap">
              {signals.map((s, i) => (
                <Badge key={i} variant={s.color}>{s.label}</Badge>
              ))}
            </div>
          </div>
        )}

        {/* Label / Source */}
        {(email.label || email.source || email.sender_type) && (
          <div>
            <div className="text-xs text-enron-dim mono mb-1">METADATA</div>
            <div className="flex gap-1.5 flex-wrap">
              {email.label && <Badge>{email.label}</Badge>}
              {email.source && <Badge>{email.source}</Badge>}
              {email.sender_type && <Badge>{email.sender_type}</Badge>}
            </div>
          </div>
        )}

        {/* Agent assessment */}
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

        {/* Body */}
        {(email.body || email.content) && (
          <div>
            <div className="text-xs text-enron-dim mono mb-1">BODY</div>
            <div className="text-sm text-enron-text leading-relaxed whitespace-pre-wrap
              max-h-64 overflow-y-auto p-3 bg-enron-muted/30 border border-enron-border rounded">
              {(email.body || email.content || '').trim()}
            </div>
          </div>
        )}

      </div>
    </motion.div>
  )
}

export default function EmailTable({ refreshKey = 0 }) {
  const [filters, setFilters] = useState({})
  const [search, setSearch] = useState('')
  const [selectedEmail, setSelectedEmail] = useState(null)

  // --- NEW: row limit and person filter state ---
  const [rowLimit, setRowLimit] = useState(null)
  const [selectedPerson, setSelectedPerson] = useState('')

  // Load convicted persons for the dropdown
  const { data: convictedPersons } = useApi('/convicted')

  const { data, loading, error, page, setPage } = usePaginatedEmails({
    ...filters,
    search: search || undefined,
    row_limit: rowLimit || undefined,
    convicted_person: selectedPerson || undefined,
  }, [refreshKey])

  const emails = data?.data || []

  // --- NEW: clear person filter handler ---
  const clearPersonFilter = () => setSelectedPerson('')

  return (
    <div className="flex gap-4 h-full">
      {/* Table side */}
      <div className="flex-1 flex flex-col min-w-0">

        {/* --- NEW: Scope controls row --- */}
        <div className="flex gap-3 mb-3 flex-wrap items-center p-3 panel">
          <div className="text-xs mono text-enron-dim uppercase tracking-wider flex-shrink-0">
            Scope
          </div>

          {/* Row limit selector */}
          <div className="flex items-center gap-2">
            <label className="text-xs text-enron-dim mono flex-shrink-0">Rows:</label>
            <select
              value={rowLimit ?? ''}
              onChange={e => {
                setRowLimit(e.target.value ? parseInt(e.target.value) : null)
                setPage(1)
              }}
              className="px-2 py-1.5 bg-enron-muted border border-enron-border rounded
                text-xs mono text-enron-text focus:outline-none focus:border-enron-dim"
            >
              {ROW_LIMIT_OPTIONS.map(opt => (
                <option key={opt.label} value={opt.value ?? ''}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          {/* Divider */}
          <div className="w-px h-6 bg-enron-border flex-shrink-0" />

          {/* Convicted person selector */}
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <label className="text-xs text-enron-dim mono flex-shrink-0">Person:</label>
            <select
              value={selectedPerson}
              onChange={e => {
                setSelectedPerson(e.target.value)
                setPage(1)
                // When selecting a person, auto-enable convicted_only
                if (e.target.value) {
                  setFilters(f => ({ ...f, convicted_only: undefined }))
                }
              }}
              className="flex-1 min-w-0 px-2 py-1.5 bg-enron-muted border border-enron-border rounded
                text-xs mono text-enron-text focus:outline-none focus:border-enron-dim"
            >
              <option value="">All senders</option>
              {(convictedPersons || []).map(p => (
                <option key={p.name} value={p.name}>
                  {p.name} — {p.role}
                </option>
              ))}
            </select>
            {selectedPerson && (
              <button
                onClick={clearPersonFilter}
                className="flex-shrink-0 px-2 py-1 text-xs mono text-enron-dim
                  hover:text-enron-red border border-enron-border rounded hover:border-enron-red/40
                  transition-colors"
                title="Clear person filter"
              >
                ✕ clear
              </button>
            )}
          </div>

          {/* Active filter pills */}
          {(rowLimit || selectedPerson) && (
            <div className="flex gap-1.5 flex-wrap">
              {rowLimit && (
                <span className="px-2 py-0.5 rounded text-xs mono bg-blue-950/40
                  text-blue-400 border border-blue-400/20">
                  ≤ {rowLimit.toLocaleString()} rows
                </span>
              )}
              {selectedPerson && (
                <span className="px-2 py-0.5 rounded text-xs mono bg-red-950/40
                  text-enron-red border border-enron-red/20">
                  ⚖ {selectedPerson.split(' ')[0]}
                </span>
              )}
            </div>
          )}
        </div>

        {/* Existing filters row */}
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
          ) : error ? (
            <div className="flex items-center justify-center h-32 text-enron-dim text-sm text-center px-6">
              {error}
            </div>
          ) : emails.length === 0 ? (
            <div className="flex items-center justify-center h-32 text-enron-dim text-sm text-center px-6">
              No emails match these filters. Try clearing scope filters or run the pipeline again.
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
            <span className="mono">
              {data.total.toLocaleString()} results
              {data.active_filters?.row_limit && (
                <span className="ml-2 text-enron-border">
                  (of first {data.active_filters.row_limit.toLocaleString()})
                </span>
              )}
            </span>
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