import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import axios from 'axios'
import { useApi } from '../hooks/useApi'

const BASE = import.meta.env.VITE_API_URL || '/api'

const ROW_LIMIT_OPTIONS = [
  { label: 'All rows', value: '' },
  { label: '1,000 rows', value: 1000 },
  { label: '5,000 rows', value: 5000 },
  { label: '10,000 rows', value: 10000 },
  { label: '25,000 rows', value: 25000 },
  { label: '50,000 rows', value: 50000 },
]

const AGENTS = [
  { id: 1, name: 'Email Intake', desc: 'Parse & normalize email dataset' },
  { id: 2, name: 'Convict Research', desc: 'Identify convicted individuals' },
  { id: 3, name: 'Label Dataset', desc: 'Tag convicted senders in emails' },
  { id: 4, name: 'Suspicious Review', desc: 'LLM assessment of flagged emails' },
  { id: 5, name: 'Build Graph', desc: 'Construct communication network' },
]

function AgentStep({ agent, status, isActive }) {
  const isDone = status === 'complete' || status === 'done'
  const isFailed = status === 'failed'

  return (
    <div className={`flex items-start gap-3 p-3 rounded transition-all ${
      isActive ? 'bg-enron-muted/50 border border-enron-border' : ''
    }`}>
      <div className={`
        w-7 h-7 flex-shrink-0 rounded flex items-center justify-center text-xs mono font-bold
        ${isDone ? 'bg-green-900/60 text-green-400 border border-green-400/30' :
          isFailed ? 'bg-red-950/60 text-enron-red border border-enron-red/30' :
          isActive ? 'bg-enron-amber/20 text-enron-amber border border-enron-amber/40' :
          'bg-enron-muted/40 text-enron-dim border border-enron-border'}
      `}>
        {isDone ? '✓' : isFailed ? '✕' : isActive ? '▶' : agent.id}
      </div>
      <div>
        <div className={`text-sm font-medium ${isActive ? 'text-white' : 'text-enron-dim'}`}>
          {agent.name}
        </div>
        <div className="text-xs text-enron-dim mt-0.5">{agent.desc}</div>
      </div>
      {isActive && (
        <div className="ml-auto flex gap-1">
          {[0, 1, 2].map(i => (
            <motion.div
              key={i}
              animate={{ opacity: [0.3, 1, 0.3] }}
              transition={{ duration: 1, repeat: Infinity, delay: i * 0.2 }}
              className="w-1 h-1 rounded-full bg-enron-amber"
            />
          ))}
        </div>
      )}
    </div>
  )
}

export default function PipelineStatus({ onComplete }) {
  const [pipelineStatus, setPipelineStatus] = useState(null)
  const [triggering, setTriggering] = useState(false)
  const [rowLimit, setRowLimit] = useState('')
  const [selectedPerson, setSelectedPerson] = useState('')

  const { data: convictedPersons } = useApi('/convicted')

  useEffect(() => {
    const poll = () => {
      axios.get(`${BASE}/status`).then(r => {
        setPipelineStatus(r.data)
        if (r.data.status === 'complete' && onComplete) onComplete()
      }).catch(() => {})
    }
    poll()
    const id = setInterval(poll, 2000)
    return () => clearInterval(id)
  }, [])

  const trigger = async () => {
    setTriggering(true)
    try {
      const limit = rowLimit ? parseInt(rowLimit, 10) : null
      const payload = {
        row_limit: Number.isFinite(limit) ? limit : null,
        convicted_person: selectedPerson || null,
      }
      await axios.post(`${BASE}/run`, payload)
    } catch (e) {
      const msg = e.response?.data?.detail ?? e.message ?? 'Failed to start pipeline'
      setPipelineStatus(prev => ({
        running: false,
        progress: 0,
        status: 'error',
        errors: [typeof msg === 'string' ? msg : JSON.stringify(msg)],
        ...(prev || {}),
      }))
      console.error(e)
    }
    setTriggering(false)
  }

  const currentAgent = pipelineStatus?.status?.match(/agent(\d)/)
    ? parseInt(pipelineStatus.status.match(/agent(\d)/)[1])
    : 0

  const isRunning = pipelineStatus?.running
  const isDone = pipelineStatus?.status === 'complete'

  // Summary of what will be processed
  const scopeLabel = [
    selectedPerson ? `${selectedPerson}'s emails` : null,
    rowLimit ? `first ${parseInt(rowLimit).toLocaleString()} rows` : null,
  ].filter(Boolean).join(' · ') || 'Full dataset'

  return (
    <div className="panel p-5">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <div className="text-xs mono text-enron-dim uppercase tracking-wider mb-1">
            Agent Pipeline
          </div>
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${
              isRunning ? 'bg-enron-amber animate-pulse' :
              isDone ? 'bg-green-400' : 'bg-enron-dim'
            }`} />
            <span className="text-sm mono text-enron-text">
              {isRunning ? 'Running...' : isDone ? 'Complete' : 'Idle'}
            </span>
          </div>
        </div>
      </div>

      {/* --- Scope controls (shown when not running) --- */}
      {!isRunning && (
        <div className="mb-5 space-y-3 p-4 bg-enron-muted/30 border border-enron-border rounded">
          <div className="text-xs mono text-enron-dim uppercase tracking-wider">
            Configure Run Scope
          </div>

          {/* Row limit */}
          <div className="flex items-center gap-3">
            <label className="text-xs mono text-enron-dim w-24 flex-shrink-0">
              Row limit
            </label>
            <select
              value={rowLimit}
              onChange={e => setRowLimit(e.target.value)}
              className="flex-1 px-2 py-1.5 bg-enron-panel border border-enron-border rounded
                text-xs mono text-enron-text focus:outline-none focus:border-enron-dim"
            >
              {ROW_LIMIT_OPTIONS.map(opt => (
                <option key={opt.label} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          {/* Convicted person filter */}
          <div className="flex items-center gap-3">
            <label className="text-xs mono text-enron-dim w-24 flex-shrink-0">
              Focus on
            </label>
            <div className="flex-1 flex gap-2">
              <select
                value={selectedPerson}
                onChange={e => setSelectedPerson(e.target.value)}
                className="flex-1 px-2 py-1.5 bg-enron-panel border border-enron-border rounded
                  text-xs mono text-enron-text focus:outline-none focus:border-enron-dim"
              >
                <option value="">Everyone (no filter)</option>
                {(convictedPersons || []).map(p => (
                  <option key={p.name} value={p.name}>
                    {p.name} — {p.role}
                  </option>
                ))}
              </select>
              {selectedPerson && (
                <button
                  onClick={() => setSelectedPerson('')}
                  className="px-2 py-1 text-xs mono text-enron-dim border border-enron-border
                    rounded hover:text-enron-red hover:border-enron-red/40 transition-colors"
                >
                  ✕
                </button>
              )}
            </div>
          </div>

          {/* Scope summary + run button */}
          <div className="flex items-center justify-between pt-1">
            <div className="text-xs text-enron-dim">
              <span className="text-enron-dim">Will process: </span>
              <span className={selectedPerson || rowLimit ? 'text-enron-amber' : 'text-enron-dim'}>
                {scopeLabel}
              </span>
            </div>
            <button
              onClick={trigger}
              disabled={triggering}
              className={`
                px-4 py-2 rounded text-sm mono font-medium transition-all
                ${triggering
                  ? 'bg-enron-muted text-enron-dim cursor-not-allowed'
                  : 'bg-enron-red hover:bg-red-700 text-white glow-red'
                }
              `}
            >
              {triggering ? 'Starting...' : '▶ Run Pipeline'}
            </button>
          </div>
        </div>
      )}

      {/* Progress bar */}
      {isRunning && (
        <div className="mb-4 h-1 bg-enron-muted rounded overflow-hidden">
          <motion.div
            className="h-full bg-gradient-to-r from-enron-red to-enron-amber rounded"
            animate={{ width: `${pipelineStatus?.progress || 0}%` }}
            transition={{ duration: 0.5 }}
          />
        </div>
      )}

      {/* Running scope reminder */}
      {isRunning && (pipelineStatus?.scope_label) && (
        <div className="mb-4 px-3 py-2 bg-enron-muted/40 border border-enron-border rounded
          text-xs mono text-enron-dim">
          Scope: <span className="text-enron-amber">{pipelineStatus.scope_label}</span>
        </div>
      )}

      {/* Agent steps */}
      <div className="space-y-1">
        {AGENTS.map(agent => {
          const agentStatus = isDone ? 'complete' :
            currentAgent > agent.id ? 'complete' :
            currentAgent === agent.id ? 'active' : 'pending'
          return (
            <AgentStep
              key={agent.id}
              agent={agent}
              status={agentStatus}
              isActive={currentAgent === agent.id && isRunning}
            />
          )
        })}
      </div>

      {/* Errors */}
      {pipelineStatus?.errors?.length > 0 && (
        <div className="mt-4 p-3 bg-red-950/30 border border-enron-red/20 rounded">
          <div className="text-xs mono text-enron-red uppercase mb-1">Errors</div>
          {pipelineStatus.errors.map((e, i) => (
            <div key={i} className="text-xs text-enron-dim">{e}</div>
          ))}
        </div>
      )}
    </div>
  )
}